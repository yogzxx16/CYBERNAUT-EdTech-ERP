import type {
  ProjectDoc,
  ProjectPriority,
  ProjectStatus,
  ProjectSubmissionSubDoc,
  ProjectSubmissionAttachmentSubDoc,
  ProjectSubmissionReviewSubDoc,
} from "./project.repository";
import type { SubmissionStatus } from "../../shared/submissions/submission.types";

export interface ProjectMemberDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ProjectSubmissionAttachmentDTO {
  id: string;
  filename: string;
  originalName?: string;
  url: string;
  size?: number;
  mimeType?: string;
  extension?: string;
  uploadedAt?: string;
  uploadedBy: { id: string; name: string } | null;
}

export interface ProjectSubmissionReviewDTO {
  id: string;
  reviewer: { id: string; name: string } | null;
  status: "approved" | "rejected" | "changes_requested";
  comment?: string;
  at: string;
}

export interface ProjectSubmissionDTO {
  id: string;
  version: number;
  submittedBy: { id: string; name: string } | null;
  submittedAt: string;
  repoUrl?: string;
  liveUrl?: string;
  docsUrl?: string;
  notes?: string;
  attachments: ProjectSubmissionAttachmentDTO[];
  status: "pending_review" | "approved" | "rejected" | "changes_requested";
  reviewedBy: { id: string; name: string } | null;
  reviewedAt?: string;
  reviewComments?: string;
  reviews: ProjectSubmissionReviewDTO[];
}

export interface ProjectDTO {
  id: string;
  title: string;
  description?: string;
  department: { id: string; name: string; code: string } | null;
  projectManager: ProjectMemberDTO | null;
  members: ProjectMemberDTO[];
  assignedEmployees: ProjectMemberDTO[];
  priority: ProjectPriority;
  startDate?: string;
  endDate?: string;
  status: ProjectStatus;
  completionPercentage: number;
  submissions: ProjectSubmissionDTO[];
  submissionStatus: SubmissionStatus;
  latestSubmission: ProjectSubmissionDTO | null;
  createdAt: string;
  updatedAt: string;
}

function toMember(u: unknown): ProjectMemberDTO | null {
  const x = u as { _id?: { toString(): string }; name?: string; email?: string; role?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "", email: x.email ?? "", role: x.role ?? "" };
}

function toBy(u: unknown): { id: string; name: string } | null {
  const x = u as { _id?: { toString(): string }; name?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "" };
}

function toSubAttachment(a: ProjectSubmissionAttachmentSubDoc): ProjectSubmissionAttachmentDTO {
  return {
    id: a._id.toString(),
    filename: a.filename,
    originalName: a.originalName,
    url: a.url,
    size: a.size,
    mimeType: a.mimeType,
    extension: a.extension,
    uploadedAt: a.uploadedAt ? new Date(a.uploadedAt).toISOString() : undefined,
    uploadedBy: toBy(a.uploadedBy),
  };
}

function toReview(r: ProjectSubmissionReviewSubDoc): ProjectSubmissionReviewDTO {
  return {
    id: r._id.toString(),
    reviewer: toBy(r.reviewer),
    status: r.status,
    comment: r.comment,
    at: new Date(r.at).toISOString(),
  };
}

export function toProjectSubmissionDTO(s: ProjectSubmissionSubDoc): ProjectSubmissionDTO {
  return {
    id: s._id.toString(),
    version: s.version,
    submittedBy: toBy(s.submittedBy),
    submittedAt: new Date(s.submittedAt).toISOString(),
    repoUrl: s.repoUrl,
    liveUrl: s.liveUrl,
    docsUrl: s.docsUrl,
    notes: s.notes,
    attachments: (s.attachments ?? []).map(toSubAttachment),
    status: s.status,
    reviewedBy: toBy(s.reviewedBy),
    reviewedAt: s.reviewedAt ? new Date(s.reviewedAt).toISOString() : undefined,
    reviewComments: s.reviewComments,
    reviews: (s.reviews ?? []).map(toReview),
  };
}

export function toProjectDTO(p: ProjectDoc): ProjectDTO {
  const dep = p.department as unknown as
    | { _id: { toString(): string }; name: string; code: string }
    | null;
  const members = (p.assignedEmployees ?? [])
    .map(toMember)
    .filter((m): m is ProjectMemberDTO => !!m);
  const submissions = (p.submissions ?? []).map(toProjectSubmissionDTO);
  const latestSubmission =
    submissions.length === 0 ? null : submissions[submissions.length - 1] ?? null;
  return {
    id: p._id.toString(),
    title: p.title,
    description: p.description,
    department: dep && dep._id ? { id: dep._id.toString(), name: dep.name, code: dep.code } : null,
    projectManager: toMember(p.projectManager),
    members,
    assignedEmployees: members,
    priority: p.priority,
    startDate: p.startDate?.toISOString(),
    endDate: p.endDate?.toISOString(),
    status: p.status,
    completionPercentage: p.completionPercentage,
    submissions,
    submissionStatus: p.submissionStatus ?? "none",
    latestSubmission,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
