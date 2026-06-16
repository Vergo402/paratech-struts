// ui/hooks — the repository-hook barrel: the ONLY ui/* location permitted to
// import @data/* (invariant 3, lint-enforced — see eslint.config.js). Screens
// import from '@ui/hooks', never '@data/...'. Swap the backend, ui never knows.
export { useOperation } from './useOperation';
export { useShorePoints } from './useShorePoints';
export { useInventory } from './useInventory';
export { useRecommendations } from './useRecommendations';
export { useCommit, useCommitMany } from './useCommit';
export { useDeviceUid } from './useDeviceUid';
export { useSession, type SessionApi } from './useSession';
