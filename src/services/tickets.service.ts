import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory =
  | "technical"
  | "hr"
  | "payroll"
  | "facilities"
  | "access"
  | "other";

export interface TicketPerson {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface TicketMessage {
  id: string;
  author: TicketPerson | null;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  raisedBy: TicketPerson | null;
  assignedTo: TicketPerson | null;
  conversation?: TicketMessage[];
  conversationCount: number;
  closedAt?: string;
  reopenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  category?: TicketCategory | "all";
  scope?: "mine" | "assigned" | "all";
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export const ticketsApi = {
  async list(params: TicketListParams = {}) {
    const res = await api.get<PaginatedResponse<Ticket>>("/tickets", { params });
    return res.data;
  },
  async get(id: string) {
    const res = await api.get<ApiEnvelope<Ticket>>(`/tickets/${id}`);
    return unwrap(res.data);
  },
  async create(input: CreateTicketInput) {
    const res = await api.post<ApiEnvelope<Ticket>>("/tickets", input);
    return unwrap(res.data);
  },
  async reply(id: string, body: string, internal = false) {
    const res = await api.post<ApiEnvelope<Ticket>>(`/tickets/${id}/reply`, { body, internal });
    return unwrap(res.data);
  },
  async assign(id: string, assignedTo: string) {
    const res = await api.post<ApiEnvelope<Ticket>>(`/tickets/${id}/assign`, { assignedTo });
    return unwrap(res.data);
  },
  async close(id: string) {
    const res = await api.post<ApiEnvelope<Ticket>>(`/tickets/${id}/close`, {});
    return unwrap(res.data);
  },
  async reopen(id: string) {
    const res = await api.post<ApiEnvelope<Ticket>>(`/tickets/${id}/reopen`, {});
    return unwrap(res.data);
  },
};
