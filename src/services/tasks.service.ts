import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type TaskStatus = "pending" | "in_progress" | "review" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type SubmissionStatus =
  | "none"
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TaskComment {
  id: string;
  user: TaskAssignee | null;
  message: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  fileUrl: string;
  uploadedBy: TaskAssignee | null;
  uploadedAt: string;
}

export interface TaskHistoryEntry {
  id: string;
  action: string;
  by: { id: string; name: string } | null;
  byName?: string;
  at: string;
  details?: string;
}

export interface TaskDependency {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface SubmissionAttachment {
  id: string;
  filename: string;
  originalName?: string;
  url: string;
  size?: number;
  mimeType?: string;
  extension?: string;
  uploadedAt?: string;
  uploadedBy?: { id: string; name: string } | null;
}

export interface SubmissionReview {
  id: string;
  reviewer: { id: string; name: string } | null;
  status: "approved" | "rejected" | "changes_requested";
  comment?: string;
  at: string;
}

export interface Submission {
  id: string;
  version: number;
  submittedBy: { id: string; name: string } | null;
  submittedAt: string;
  repoUrl?: string;
  liveUrl?: string;
  docsUrl?: string;
  notes?: string;
  attachments: SubmissionAttachment[];
  status: "pending_review" | "approved" | "rejected" | "changes_requested";
  reviewedBy: { id: string; name: string } | null;
  reviewedAt?: string;
  reviewComments?: string;
  reviews?: SubmissionReview[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  project: { id: string; title: string; status?: string } | null;
  assignedTo: TaskAssignee | null;
  assignees: TaskAssignee[];
  dependencies: TaskDependency[];
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  status: TaskStatus;
  remarks?: string;
  completedAt?: string;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  history: TaskHistoryEntry[];
  submissions: Submission[];
  submissionStatus: SubmissionStatus;
  latestSubmission: Submission | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  search?: string;
  project?: string;
  assignedTo?: string;
  createdBy?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  submissionStatus?: SubmissionStatus | "all";
  dueFilter?: "today" | "overdue" | "tomorrow";
  mine?: boolean;
  createdByMe?: boolean;
  sort?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  project: string;
  assignees: string[];
  dependencies?: string[];
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignees?: string[];
  dependencies?: string[];
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
  remarks?: string;
}

export interface SubmissionAttachmentInput {
  filename: string;
  originalName?: string;
  url: string;
  size?: number;
  mimeType?: string;
  extension?: string;
}

export interface SubmissionInput {
  repoUrl?: string;
  liveUrl?: string;
  docsUrl?: string;
  notes?: string;
  attachments?: SubmissionAttachmentInput[];
}

export interface ReviewInput {
  decision: "approve" | "reject" | "request_changes";
  comments?: string;
}

export const tasksApi = {
  async list(params: TaskListParams = {}) {
    const res = await api.get<PaginatedResponse<Task>>("/tasks", { params });
    return res.data;
  },
  async getOne(id: string) {
    const res = await api.get<ApiEnvelope<Task>>(`/tasks/${id}`);
    return unwrap(res.data);
  },
  async create(input: CreateTaskInput) {
    const res = await api.post<ApiEnvelope<Task>>("/tasks", input);
    return unwrap(res.data);
  },
  async update(id: string, input: UpdateTaskInput) {
    const res = await api.patch<ApiEnvelope<Task>>(`/tasks/${id}`, input);
    return unwrap(res.data);
  },
  async updateStatus(id: string, status: TaskStatus, remarks?: string) {
    const res = await api.patch<ApiEnvelope<Task>>(`/tasks/${id}/status`, { status, remarks });
    return unwrap(res.data);
  },
  async addComment(id: string, message: string) {
    const res = await api.post<ApiEnvelope<Task>>(`/tasks/${id}/comments`, { message });
    return unwrap(res.data);
  },
  async addAttachment(id: string, filename: string, fileUrl: string) {
    const res = await api.post<ApiEnvelope<Task>>(`/tasks/${id}/attachments`, { filename, fileUrl });
    return unwrap(res.data);
  },
  async removeAttachment(id: string, attachmentId: string) {
    const res = await api.delete<ApiEnvelope<Task>>(`/tasks/${id}/attachments/${attachmentId}`);
    return unwrap(res.data);
  },
  async submit(id: string, input: SubmissionInput) {
    const res = await api.post<ApiEnvelope<Task>>(`/tasks/${id}/submit`, input);
    return unwrap(res.data);
  },
  async review(id: string, input: ReviewInput) {
    const res = await api.post<ApiEnvelope<Task>>(`/tasks/${id}/review`, input);
    return unwrap(res.data);
  },
};
