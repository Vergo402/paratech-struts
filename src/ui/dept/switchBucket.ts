// A department switch is a FULL PAGE RELOAD onto the active bucket — boot() is the
// one path that wires the per-department buckets + stores correctly, and remounting
// RouterProvider crashes (removeChild). Switches are rare, so the brief reload is fine.
//
// Fired EXPLICITLY at the action sites — create "Done", join "Continue", sign-out —
// never reactively on a `departmentId` change. The old reactive subscribe fired the
// instant setDepartment() flipped departmentId, which tore the page down mid-create
// (before the invite-code Sheet rendered and before the cloud writes finished). One
// named place so the target path lives in exactly one spot.
export function reloadIntoActiveBucket(): void {
  window.location.assign('/operations');
}
