import { useStore } from 'zustand';
import { sessionStore, type Identity } from '@data/store';
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
}

export function useSession(): SessionApi {
  const identity = useStore(sessionStore.store, (s) => s.identity);
  return {
    identity,
    createAccount: accountService.createAccount,
    signIn: accountService.signIn,
    signOut: accountService.signOut,
  };
}
