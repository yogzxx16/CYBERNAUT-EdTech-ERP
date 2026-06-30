import type { DepartmentDoc, DepartmentStatus } from "./department.repository";

export interface DepartmentDTO {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: DepartmentStatus;
  createdAt: string;
  updatedAt: string;
}

export function toDepartmentDTO(d: DepartmentDoc): DepartmentDTO {
  return {
    id: d._id.toString(),
    name: d.name,
    code: d.code,
    description: d.description,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
