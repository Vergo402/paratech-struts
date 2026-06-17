// data/auth — the account seam (stub behind the real seam this slice; the
// Firebase Auth transport, ADR-025, lands here in a later session).
export {
  accountService,
  createAccountService,
  type AccountServiceApi,
  type CreateAccountInput,
  type SignInInput,
  type AuthResult,
} from './accountService';
export {
  authSessionSync,
  createAuthSessionSync,
  type AuthSessionSync,
} from './authSession';
