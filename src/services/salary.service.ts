import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export interface SalaryEmployee {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface SalarySlip {
  id: string;
  slipNumber: string;
  employee: SalaryEmployee | null;
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
  status: "draft" | "finalized";
  generatedAt: string;
  createdAt: string;
}

export interface SalaryListParams {
  page?: number;
  limit?: number;
  employee?: string;
  month?: number;
  year?: number;
  scope?: "mine" | "all";
}

export interface GenerateSalaryInput {
  employee: string;
  employeeId?: string;
  month: number;
  year: number;
  baseSalary?: number;
  workingDays?: number;
  leaveDays?: number;
  deductions?: number;
  bonus?: number;
  remarks?: string;
}

export const salaryApi = {
  async list(params: SalaryListParams = {}) {
    const res = await api.get<PaginatedResponse<SalarySlip>>("/salary-slips", { params });
    return res.data;
  },
  async get(id: string) {
    const res = await api.get<ApiEnvelope<SalarySlip>>(`/salary-slips/${id}`);
    return unwrap(res.data);
  },
  async generate(input: GenerateSalaryInput) {
    const res = await api.post<ApiEnvelope<SalarySlip>>("/salary-slips", input);
    return unwrap(res.data);
  },
};
