import { useStore } from 'zustand';
import { sessionStore } from '@data/store';
import { departmentService, type DepartmentServiceApi } from '@data/dept';

/**
 * The department seam for the UI (workflows 07 + #232): the live department
 * projection (id + name) and the member's role, plus the create + join actions —
 * all behind one hook so screens never import @data (invariant 3). The projection
 * is a live subscription (re-renders when a department is founded, joined, or
 * cleared on sign-out).
 */
export interface DepartmentApi {
  department: { id: string; name: string } | null;
  role: string | null;
  inviteCode: string | null;
  /**
   * The CURRENT department id read straight from the store at call time — for
   * deciding navigation right after an auth action, where the subscribed
   * `department` is the stale mount-time value (setMember re-discovers the dept
   * synchronously, but the component hasn't re-rendered yet).
   */
  currentDepartmentId: () => string | null;
  createDepartment: DepartmentServiceApi['createDepartment'];
  joinByCode: DepartmentServiceApi['joinByCode'];
}

export function useDepartment(): DepartmentApi {
  const departmentId = useStore(sessionStore.store, (s) => s.departmentId);
  const departmentName = useStore(sessionStore.store, (s) => s.departmentName);
  const role = useStore(sessionStore.store, (s) => s.role);
  const inviteCode = useStore(sessionStore.store, (s) => s.inviteCode);
  return {
    department: departmentId ? { id: departmentId, name: departmentName ?? '' } : null,
    role,
    inviteCode,
    currentDepartmentId: () => sessionStore.store.getState().departmentId,
    createDepartment: departmentService.createDepartment,
    joinByCode: departmentService.joinByCode,
  };
}
