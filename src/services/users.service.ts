import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type AppUserRole = "super_admin" | "admin" | "employee" | "intern";
export type AccountStatus = "active" | "suspended" | "invited";

export interface AppUser {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  employeeCode?: string;
  email: string;
  phone?: string;
  dob?: string;
  joiningDate?: string;
  department?: string | null;
  role: AppUserRole;
  designation?: string;
  address?: string;
  bio?: string;
  salary?: number;
  profileImage?: string;
  accountStatus: AccountStatus;
  forcePasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedUser extends AppUser {
  tempPassword: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: AppUserRole | "all";
  status?: AccountStatus | "all";
  department?: string;
  sort?: string;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  phone?: string;
  dob: string;
  joiningDate?: string;
  department?: string;
  role: AppUserRole;
  designation?: string;
  address?: string;
  bio?: string;
  salary?: number;
  profileImage?: string;
}

export interface UpdateSelfProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  bio?: string;
  profileImage?: string;
}

export const usersApi = {
  async list(params: UserListParams = {}) {
    const res = await api.get<PaginatedResponse<AppUser>>("/users", { params });
    return res.data;
  },
  async getOne(id: string) {
    const res = await api.get<ApiEnvelope<AppUser>>(`/users/${id}`);
    return unwrap(res.data);
  },
  async me() {
    const res = await api.get<ApiEnvelope<AppUser>>("/users/me");
    return unwrap(res.data);
  },
  async updateSelf(input: UpdateSelfProfileInput) {
    const res = await api.patch<ApiEnvelope<AppUser>>("/users/me", input);
    return unwrap(res.data);
  },
  async create(input: CreateUserInput) {
    const res = await api.post<ApiEnvelope<CreatedUser>>("/users", input);
    return unwrap(res.data);
  },
  async update(id: string, input: Partial<CreateUserInput>) {
    const res = await api.patch<ApiEnvelope<AppUser>>(`/users/${id}`, input);
    return unwrap(res.data);
  },
  async suspend(id: string) {
    const res = await api.post<ApiEnvelope<AppUser>>(`/users/${id}/suspend`, {});
    return unwrap(res.data);
  },
  async activate(id: string) {
    const res = await api.post<ApiEnvelope<AppUser>>(`/users/${id}/activate`, {});
    return unwrap(res.data);
  },
};
