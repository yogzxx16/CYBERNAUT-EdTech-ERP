import { api, unwrap, type ApiEnvelope } from "./api";
import type { PaginatedResponse } from "./departments.service";

export type EventStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
export type RSVPStatus = "yes" | "no" | "maybe";

export interface EventPerson {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  eventDate: string;
  endDate?: string;
  organizer: EventPerson | null;
  participants: EventPerson[];
  rsvps: { user: string; status: RSVPStatus; respondedAt: string }[];
  rsvpCounts: { yes: number; no: number; maybe: number; total: number };
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EventListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EventStatus | "all";
  from?: string;
  to?: string;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  venue?: string;
  eventDate: string;
  endDate?: string;
  participants: string[];
}

export const eventsApi = {
  async list(params: EventListParams = {}) {
    const res = await api.get<PaginatedResponse<Event>>("/events", { params });
    return res.data;
  },
  async create(input: CreateEventInput) {
    const res = await api.post<ApiEnvelope<Event>>("/events", input);
    return unwrap(res.data);
  },
  async update(id: string, input: Partial<CreateEventInput> & { status?: EventStatus }) {
    const res = await api.patch<ApiEnvelope<Event>>(`/events/${id}`, input);
    return unwrap(res.data);
  },
  async remove(id: string) {
    const res = await api.delete<ApiEnvelope<{ ok: boolean }>>(`/events/${id}`);
    return unwrap(res.data);
  },
  async rsvp(id: string, status: RSVPStatus) {
    const res = await api.post<ApiEnvelope<Event>>(`/events/${id}/rsvp`, { status });
    return unwrap(res.data);
  },
};
