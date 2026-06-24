import { useMemo } from 'react';
import { useStore } from 'zustand';
import { deptPoliciesStore } from '@data/store';

// Department behavioural policies behind the @ui/hooks seam (#305, ADR-018). Just the
// after-action-email toggle for now (on by default); the group is extensible. The email
// transport is Phase H — this only reads/writes the synced preference.

export interface DeptPoliciesApi {
  afterActionEmail: boolean;
  setAfterActionEmail(on: boolean): Promise<void>;
}

export function useDeptPolicies(): DeptPoliciesApi {
  const afterActionEmail = useStore(deptPoliciesStore.store, (s) => s.afterActionEmail);
  const actions = useMemo(
    () => ({ setAfterActionEmail: (on: boolean) => deptPoliciesStore.setAfterActionEmail(on) }),
    [],
  );
  return { afterActionEmail, ...actions };
}
