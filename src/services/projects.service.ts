import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";
import type {
  ReviewInput,
  Submission,
  SubmissionInput,
  SubmissionStatus,
} from "./tasks.service";

export type ProjectStatus = "planning" | "in_progress" | "on_hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  department: { id: string; name: string; code: string } | null;
  projectManager: ProjectMember | null;
  members: ProjectMember[];
  assignedEmployees: ProjectMember[];
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  completionPercentage: number;
  submissions: Submission[];
  submissionStatus: SubmissionStatus;
  latestSubmission: Submission | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus | "all";
  priority?: ProjectPriority | "all";
  submissionStatus?: SubmissionStatus | "all";
  department?: string;
  member?: string;
  sort?: string;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  department?: string;
  projectManager?: string;
  assignedEmployees?: string[];
  priority?: ProjectPriority;
  startDate?: string;
  endDate?: string;
  status?: ProjectStatus;
  completionPercentage?: number;
}

export const projectsApi = {
  async list(params: ProjectListParams = {}) {
    const res = await api.get<PaginatedResponse<Project>>("/projects", { params });
    return res.data;
  },
  async getOne(id: string) {
    const res = await api.get<ApiEnvelope<Project>>(`/projects/${id}`);
    return unwrap(res.data);
  },
  async create(input: CreateProjectInput) {
    const res = await api.post<ApiEnvelope<Project>>("/projects", input);
    return unwrap(res.data);
  },
  async update(id: string, input: Partial<CreateProjectInput>) {
    const res = await api.patch<ApiEnvelope<Project>>(`/projects/${id}`, input);
    return unwrap(res.data);
  },
  async archive(id: string) {
    const res = await api.post<ApiEnvelope<Project>>(`/projects/${id}/archive`, {});
    return unwrap(res.data);
  },
  async assignMembers(id: string, userIds: string[]) {
    const res = await api.post<ApiEnvelope<Project>>(`/projects/${id}/members`, { userIds });
    return unwrap(res.data);
  },
  async removeMember(id: string, userId: string) {
    const res = await api.delete<ApiEnvelope<Project>>(`/projects/${id}/members`, { data: { userId } });
    return unwrap(res.data);
  },
  async updateProgress(id: string, completionPercentage: number) {
    const res = await api.patch<ApiEnvelope<Project>>(`/projects/${id}/progress`, {
      completionPercentage,
    });
    return unwrap(res.data);
  },
  async updateStatus(id: string, status: ProjectStatus) {
    const res = await api.patch<ApiEnvelope<Project>>(`/projects/${id}/status`, { status });
    return unwrap(res.data);
  },
  async submit(id: string, input: SubmissionInput) {
    const res = await api.post<ApiEnvelope<Project>>(`/projects/${id}/submit`, input);
    return unwrap(res.data);
  },
  async review(id: string, input: ReviewInput) {
    const res = await api.post<ApiEnvelope<Project>>(`/projects/${id}/review`, input);
    return unwrap(res.data);
  },
};
