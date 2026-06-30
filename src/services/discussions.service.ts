import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export interface DiscussionPerson {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface DiscussionMessage {
  id: string;
  author: DiscussionPerson | null;
  body: string;
  attachments: string[];
  editedAt?: string;
  createdAt: string;
}

export interface Discussion {
  id: string;
  title: string;
  description?: string;
  project: { id: string; title: string } | null;
  createdBy: DiscussionPerson | null;
  participants: DiscussionPerson[];
  messagesCount: number;
  messages?: DiscussionMessage[];
  attachments: string[];
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionListParams {
  page?: number;
  limit?: number;
  search?: string;
  project?: string;
  scope?: "mine" | "all";
}

export interface CreateDiscussionInput {
  title: string;
  description?: string;
  project?: string;
  participants: string[];
  attachments?: string[];
}

export const discussionsApi = {
  async list(params: DiscussionListParams = {}) {
    const res = await api.get<PaginatedResponse<Discussion>>("/discussions", { params });
    return res.data;
  },
  async get(id: string) {
    const res = await api.get<ApiEnvelope<Discussion>>(`/discussions/${id}`);
    return unwrap(res.data);
  },
  async create(input: CreateDiscussionInput) {
    const res = await api.post<ApiEnvelope<Discussion>>("/discussions", input);
    return unwrap(res.data);
  },
  async update(id: string, input: { title?: string; description?: string; closed?: boolean }) {
    const res = await api.patch<ApiEnvelope<Discussion>>(`/discussions/${id}`, input);
    return unwrap(res.data);
  },
  async setParticipants(id: string, participants: string[]) {
    const res = await api.put<ApiEnvelope<Discussion>>(`/discussions/${id}/participants`, {
      participants,
    });
    return unwrap(res.data);
  },
  async postMessage(id: string, body: string) {
    const res = await api.post<ApiEnvelope<Discussion>>(`/discussions/${id}/messages`, { body });
    return unwrap(res.data);
  },
  async editMessage(id: string, messageId: string, body: string) {
    const res = await api.patch<ApiEnvelope<Discussion>>(
      `/discussions/${id}/messages/${messageId}`,
      { body },
    );
    return unwrap(res.data);
  },
};
