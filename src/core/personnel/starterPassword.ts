// core/personnel — the #439 starter-password convention: `${lastname}123!`,
// derived from the member's display name. Deliberately guessable — acceptable
// ONLY because it is single-use (mustChangePassword forces rotation at first
// sign-in) and distributed by the admin in person; the User Manager key badge
// keeps unrotated accounts visible. One derivation, client-side: the admin
// must SEE the password to hand it over, so deriving it server-side would buy
// nothing (the server only enforces Firebase's ≥6-char floor).

/**
 * Derive the starter password from a display name: last whitespace-separated
 * word → lowercase → fold diacritics (García → garcia; the password must be
 * typable on any keyboard, read aloud at 0300) → strip everything but
 * letters/digits → `+ '123!'`. A name that yields fewer than 2 usable
 * characters (initials, symbols-only, empty) falls back to 'member' so the
 * result always clears Firebase's 6-char minimum and never leaks a near-empty
 * password like "a123!".
 */
export function starterPasswordFor(displayName: string): string {
  const last = displayName.trim().split(/\s+/).pop() ?? '';
  const bare = last
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // combining marks — the folded diacritics
    .replace(/[^\p{L}\p{N}]/gu, '');
  return `${bare.length >= 2 ? bare : 'member'}123!`;
}
