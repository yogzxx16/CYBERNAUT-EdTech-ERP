import { api, unwrap, type ApiEnvelope } from "./api";

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DepartmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "archived" | "all";
  sort?: string;
}

export const departmentsApi = {
  async list(params: DepartmentListParams = {}) {
    const res = await api.get<PaginatedResponse<Department>>("/departments", { params });
    return res.data;
  },
  async create(input: { name: string; code: string; description?: string }) {
    const res = await api.post<ApiEnvelope<Department>>("/departments", input);
    return unwrap(res.data);
  },
  async update(id: string, input: Partial<{ name: string; code: string; description: string }>) {
    const res = await api.patch<ApiEnvelope<Department>>(`/departments/${id}`, input);
    return unwrap(res.data);
  },
  async archive(id: string) {
    const res = await api.post<ApiEnvelope<Department>>(`/departments/${id}/archive`, {});
    return unwrap(res.data);
  },
  async restore(id: string) {
    const res = await api.post<ApiEnvelope<Department>>(`/departments/${id}/restore`, {});
    return unwrap(res.data);
  },
};
