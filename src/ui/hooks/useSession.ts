import { useStore } from 'zustand';
import { sessionStore, deleteLocalAccountData, type Identity } from '@data/store';
import { accountService, type AccountServiceApi } from '@data/auth';

/**
 * The session seam for the UI (workflow 06): the live identity plus the account
 * actions, all behind one hook so screens never import @data (invariant 3).
 * identity is a live subscription — components re-render on guest⇄member; the
 * actions are the singleton service's stable methods (transport stubbed until
 * the Firebase session fills the seam — accountService.ts).
 */
export interface SessionApi {
  identity: Identity;
  createAccount: AccountServiceApi['createAccount'];
  signIn: AccountServiceApi['signIn'];
  signOut: AccountServiceApi['signOut'];
  /** Delete the account (auth) THEN wipe this device's local data. */
  deleteAccount: AccountServiceApi['deleteAccount'];
  sendMagicLink: AccountServiceApi['sendMagicLink'];
  isMagicLink: AccountServiceApi['isMagicLink'];
  completeMagicLink: AccountServiceApi['completeMagicLink'];
  sendPasswordReset: AccountServiceApi['sendPasswordReset'];
}

export function useSession(): SessionApi {
  const identity = useStore(sessionStore.store, (s) => s.identity);
  return {
    identity,
    createAccount: accountService.createAccount,
    signIn: accountService.signIn,
    signOut: accountService.signOut,
    deleteAccount: async (password) => {
      // Capture the dept bucket id BEFORE the auth delete — the async
      // onAuthStateChanged→setGuest would otherwise blank it before the wipe.
      const departmentId = sessionStore.store.getState().departmentId;
      const result = await accountService.deleteAccount(password);
      if (result.ok) await deleteLocalAccountData(departmentId);
      return result;
    },
    sendMagicLink: accountService.sendMagicLink,
    isMagicLink: accountService.isMagicLink,
    completeMagicLink: accountService.completeMagicLink,
    sendPasswordReset: accountService.sendPasswordReset,
  };
}
