import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type LeaveType = "casual" | "sick" | "earned" | "unpaid" | "maternity" | "paternity";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeavePerson {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface Leave {
  id: string;
  employee: LeavePerson | null;
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  status: LeaveStatus;
  approvedBy: LeavePerson | null;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveListParams {
  page?: number;
  limit?: number;
  employee?: string;
  status?: LeaveStatus | "all";
  leaveType?: LeaveType | "all";
  search?: string;
  scope?: "mine" | "all";
  sort?: string;
}

export interface CreateLeaveInput {
  leaveType: LeaveType;
  reason: string;
  startDate: string;
  endDate: string;
}

export const leavesApi = {
  async list(params: LeaveListParams = {}) {
    const res = await api.get<PaginatedResponse<Leave>>("/leaves", { params });
    return res.data;
  },
  async create(input: CreateLeaveInput) {
    const res = await api.post<ApiEnvelope<Leave>>("/leaves", input);
    return unwrap(res.data);
  },
  async update(id: string, input: Partial<CreateLeaveInput>) {
    const res = await api.patch<ApiEnvelope<Leave>>(`/leaves/${id}`, input);
    return unwrap(res.data);
  },
  async cancel(id: string) {
    const res = await api.post<ApiEnvelope<Leave>>(`/leaves/${id}/cancel`, {});
    return unwrap(res.data);
  },
  async decide(id: string, status: "approved" | "rejected", rejectionReason?: string) {
    const res = await api.post<ApiEnvelope<Leave>>(`/leaves/${id}/decision`, {
      status,
      rejectionReason,
    });
    return unwrap(res.data);
  },
};
