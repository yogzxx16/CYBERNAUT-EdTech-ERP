import type { EventDoc } from "./event.repository";

interface PersonRef {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface EventDTO {
  id: string;
  title: string;
  description?: string;
  venue?: string;
  eventDate: string;
  endDate?: string;
  organizer: PersonRef | null;
  participants: PersonRef[];
  rsvps: { user: string; status: string; respondedAt: string }[];
  rsvpCounts: { yes: number; no: number; maybe: number; total: number };
  status: string;
  createdAt: string;
  updatedAt: string;
}

function person(u: unknown): PersonRef | null {
  const x = u as { _id?: { toString(): string }; name?: string; email?: string; role?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "", email: x.email ?? "", role: x.role };
}

export function toEventDTO(e: EventDoc): EventDTO {
  return {
    id: e._id.toString(),
    title: e.title,
    description: e.description,
    venue: e.venue,
    eventDate: e.eventDate.toISOString(),
    endDate: e.endDate ? e.endDate.toISOString() : undefined,
    organizer: person(e.organizer),
    participants: (e.participants as unknown[]).map(person).filter((p): p is PersonRef => p !== null),
    rsvps: (e.rsvps ?? []).map((r) => ({
      user: r.user.toString(),
      status: r.status,
      respondedAt: (r.respondedAt ?? new Date()).toISOString(),
    })),
    rsvpCounts: {
      yes: (e.rsvps ?? []).filter((r) => r.status === "yes").length,
      no: (e.rsvps ?? []).filter((r) => r.status === "no").length,
      maybe: (e.rsvps ?? []).filter((r) => r.status === "maybe").length,
      total: (e.rsvps ?? []).length,
    },
    status: e.status,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
