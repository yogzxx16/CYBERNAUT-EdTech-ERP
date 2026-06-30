import type { DiscussionDoc, DiscussionMessage } from "./discussion.repository";

export interface DiscussionPersonDTO {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface DiscussionMessageDTO {
  id: string;
  author: DiscussionPersonDTO | null;
  body: string;
  attachments: string[];
  editedAt?: string;
  createdAt: string;
}

export interface DiscussionDTO {
  id: string;
  title: string;
  description?: string;
  project: { id: string; title: string } | null;
  createdBy: DiscussionPersonDTO | null;
  participants: DiscussionPersonDTO[];
  messagesCount: number;
  messages?: DiscussionMessageDTO[];
  attachments: string[];
  closed: boolean;
  createdAt: string;
  updatedAt: string;
}

function person(u: unknown): DiscussionPersonDTO | null {
  const x = u as { _id?: { toString(): string }; name?: string; email?: string; role?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "", email: x.email ?? "", role: x.role };
}

function project(u: unknown) {
  const x = u as { _id?: { toString(): string }; title?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), title: x.title ?? "" };
}

function messageDTO(m: DiscussionMessage): DiscussionMessageDTO {
  return {
    id: m._id?.toString() ?? "",
    author: person(m.author),
    body: m.body,
    attachments: m.attachments ?? [],
    editedAt: m.editedAt ? m.editedAt.toISOString() : undefined,
    createdAt: (m.createdAt ?? new Date()).toISOString(),
  };
}

export function toDiscussionDTO(d: DiscussionDoc, withMessages = false): DiscussionDTO {
  return {
    id: d._id.toString(),
    title: d.title,
    description: d.description,
    project: project(d.project),
    createdBy: person(d.createdBy),
    participants: (d.participants as unknown[]).map(person).filter((p): p is DiscussionPersonDTO => p !== null),
    messagesCount: d.messages?.length ?? 0,
    messages: withMessages ? (d.messages ?? []).map(messageDTO) : undefined,
    attachments: d.attachments ?? [],
    closed: d.closed,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
