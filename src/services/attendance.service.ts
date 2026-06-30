import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

export interface AttendancePerson {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface Attendance {
  id: string;
  employee: AttendancePerson | null;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours: number;
  status: AttendanceStatus;
  notes?: string;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  employee?: string;
  status?: AttendanceStatus | "all";
  from?: string;
  to?: string;
  scope?: "mine" | "all";
  sort?: string;
}

export interface AttendanceSummary {
  employee: string;
  from: string;
  to: string;
  summary: { present: number; absent: number; half_day: number; leave: number; hours: number };
  records: Attendance[];
}

export const attendanceApi = {
  async list(params: AttendanceListParams = {}) {
    const res = await api.get<PaginatedResponse<Attendance>>("/attendance", { params });
    return res.data;
  },
  async today() {
    const res = await api.get<ApiEnvelope<Attendance | null>>("/attendance/today");
    return unwrap(res.data);
  },
  async checkIn(notes?: string) {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/check-in", { notes });
    return unwrap(res.data);
  },
  async checkOut() {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/check-out", {});
    return unwrap(res.data);
  },
  async mark(input: {
    employee: string;
    date: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    notes?: string;
  }) {
    const res = await api.post<ApiEnvelope<Attendance>>("/attendance/mark", input);
    return unwrap(res.data);
  },
  async summary(params: { employee?: string; from: string; to: string }) {
    const res = await api.get<ApiEnvelope<AttendanceSummary>>("/attendance/summary", { params });
    return unwrap(res.data);
  },
};
