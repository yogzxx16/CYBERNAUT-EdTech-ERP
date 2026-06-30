import type { TicketDoc, TicketMessage } from "./ticket.repository";

interface PersonRef {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface TicketDTO {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  raisedBy: PersonRef | null;
  assignedTo: PersonRef | null;
  conversation?: {
    id: string;
    author: PersonRef | null;
    body: string;
    internal: boolean;
    createdAt: string;
  }[];
  conversationCount: number;
  closedAt?: string;
  reopenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function person(u: unknown): PersonRef | null {
  const x = u as
    | { _id?: { toString(): string }; name?: string; email?: string; role?: string; employeeCode?: string }
    | null;
  if (!x || !x._id) return null;
  return {
    id: x._id.toString(),
    name: x.name ?? "",
    email: x.email ?? "",
    role: x.role,
    employeeCode: x.employeeCode,
  };
}

function msg(m: TicketMessage) {
  return {
    id: m._id?.toString() ?? "",
    author: person(m.author),
    body: m.body,
    internal: !!m.internal,
    createdAt: (m.createdAt ?? new Date()).toISOString(),
  };
}

export function toTicketDTO(t: TicketDoc, withConversation = false): TicketDTO {
  return {
    id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    subject: t.subject,
    description: t.description,
    category: t.category,
    priority: t.priority,
    status: t.status,
    raisedBy: person(t.raisedBy),
    assignedTo: person(t.assignedTo),
    conversation: withConversation ? (t.conversation ?? []).map(msg) : undefined,
    conversationCount: t.conversation?.length ?? 0,
    closedAt: t.closedAt ? t.closedAt.toISOString() : undefined,
    reopenedAt: t.reopenedAt ? t.reopenedAt.toISOString() : undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
