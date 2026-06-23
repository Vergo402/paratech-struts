// data/dept — the department seam (workflow 07). create / claim a department,
// behind the data layer; ui/* reaches it only through ui/hooks (invariant 3).
export {
  departmentService,
  createDepartmentService,
  type DepartmentServiceApi,
  type CreateDepartmentResult,
  type CreatedDepartment,
  type JoinDepartmentResult,
  type JoinedDepartment,
  type AdminMutationResult,
} from './departmentService';
