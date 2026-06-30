import type { SalarySlipDoc } from "./salary.repository";

interface EmployeeRef {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface SalarySlipDTO {
  id: string;
  slipNumber: string;
  employee: EmployeeRef | null;
  month: number;
  year: number;
  baseSalary: number;
  workingDays: number;
  leaveDays: number;
  leaveDeduction: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  remarks?: string;
  status: string;
  generatedAt: string;
  createdAt: string;
}

function person(u: unknown): EmployeeRef | null {
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

export function toSalaryDTO(s: SalarySlipDoc): SalarySlipDTO {
  return {
    id: s._id.toString(),
    slipNumber: s.slipNumber,
    employee: person(s.employee),
    month: s.month,
    year: s.year,
    baseSalary: s.baseSalary,
    workingDays: s.workingDays,
    leaveDays: s.leaveDays,
    leaveDeduction: s.leaveDeduction,
    deductions: s.deductions,
    bonus: s.bonus,
    netSalary: s.netSalary,
    remarks: s.remarks,
    status: s.status,
    generatedAt: s.generatedAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  };
}
