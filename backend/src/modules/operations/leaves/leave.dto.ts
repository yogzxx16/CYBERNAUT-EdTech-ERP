import type { LeaveDoc, LeaveStatus, LeaveType } from "./leave.repository";

export interface LeavePersonDTO {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface LeaveDTO {
  id: string;
  employee: LeavePersonDTO | null;
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveStatus;
  approvedBy: LeavePersonDTO | null;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

function toPerson(u: unknown): LeavePersonDTO | null {
  const x = u as
    | { _id?: { toString(): string }; name?: string; email?: string; role?: string; employeeCode?: string }
    | null;
  if (!x || !x._id) return null;
  return {
    id: x._id.toString(),
    name: x.name ?? "",
    email: x.email ?? "",
    role: x.role,
    employeeCode: x.employeeCode,
  };
}

export function toLeaveDTO(l: LeaveDoc): LeaveDTO {
  return {
    id: l._id.toString(),
    employee: toPerson(l.employee),
    leaveType: l.leaveType,
    reason: l.reason,
    startDate: l.startDate.toISOString(),
    endDate: l.endDate.toISOString(),
    numberOfDays: l.numberOfDays,
    status: l.status,
    approvedBy: toPerson(l.approvedBy),
    approvedAt: l.approvedAt ? l.approvedAt.toISOString() : undefined,
    rejectionReason: l.rejectionReason,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}
