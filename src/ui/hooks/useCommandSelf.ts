import { commandsIC, currentIC, type SelfIdentity } from '@core/org';
import { useSession } from './useSession';
import { useDeviceUidValue } from './useDeviceUidValue';
import { useOrg } from './useOrg';
import { useDeviceOwners } from './useDeviceOwners';

// The UI's command/position identity (ADR-024 follow-up). "Me" for ICS purposes is the
// signed-in ACCOUNT when a member (follows every device), else the per-device uid (guest
// floor). One source of truth so no read site keys off the raw device uid by accident.
export function useCommandSelf(): { self: SelfIdentity; selfKey: string | null } {
  const { identity } = useSession();
  const deviceUid = useDeviceUidValue() ?? null;
  const accountId = identity.kind === 'member' ? identity.accountId : null;
  return { self: { accountId, deviceUid }, selfKey: accountId ?? deviceUid };
}

// May THIS device edit command (restructure the org, assign apparatus)? = am I the IC of
// the active op, by account (any of my devices), my own device, or a legacy device-ref the
// binding resolves to my account. Replaces the old device-only inline gate at every site.
export function useIsIC(): boolean {
  const { self } = useCommandSelf();
  const positions = useOrg();
  const resolve = useDeviceOwners();
  if (self.deviceUid == null) return false; // not booted yet
  return commandsIC(currentIC(positions), self, resolve);
}
