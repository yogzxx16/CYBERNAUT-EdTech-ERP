import type { AnnouncementDoc } from "./announcement.repository";

export interface AnnouncementPersonDTO {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AnnouncementDTO {
  id: string;
  title: string;
  description: string;
  priority: string;
  audience: string;
  department: { id: string; name: string; code: string } | null;
  createdBy: AnnouncementPersonDTO | null;
  status: string;
  publishedAt?: string;
  expiryDate?: string;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

function person(u: unknown): AnnouncementPersonDTO | null {
  const x = u as { _id?: { toString(): string }; name?: string; email?: string; role?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "", email: x.email ?? "", role: x.role };
}

function dept(u: unknown) {
  const x = u as { _id?: { toString(): string }; name?: string; code?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "", code: x.code ?? "" };
}

export function toAnnouncementDTO(a: AnnouncementDoc): AnnouncementDTO {
  return {
    id: a._id.toString(),
    title: a.title,
    description: a.description,
    priority: a.priority,
    audience: a.audience,
    department: dept(a.department),
    createdBy: person(a.createdBy),
    status: a.status,
    publishedAt: a.publishedAt ? a.publishedAt.toISOString() : undefined,
    expiryDate: a.expiryDate ? a.expiryDate.toISOString() : undefined,
    attachments: a.attachments ?? [],
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
