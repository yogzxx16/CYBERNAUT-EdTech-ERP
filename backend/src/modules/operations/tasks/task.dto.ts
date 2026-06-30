import type {
  TaskDoc,
  TaskPriority,
  TaskStatus,
  TaskCommentSubDoc,
  TaskAttachmentSubDoc,
  TaskHistorySubDoc,
  SubmissionSubDoc,
  SubmissionAttachmentSubDoc,
} from "./task.repository";
import type { SubmissionStatus } from "../../shared/submissions/submission.types";

export interface TaskAssigneeDTO {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TaskCommentDTO {
  id: string;
  user: TaskAssigneeDTO | null;
  message: string;
  createdAt: string;
}

export interface TaskAttachmentDTO {
  id: string;
  filename: string;
  fileUrl: string;
  uploadedBy: TaskAssigneeDTO | null;
  uploadedAt: string;
}

export interface TaskHistoryDTO {
  id: string;
  action: string;
  by: { id: string; name: string } | null;
  byName?: string;
  at: string;
  details?: string;
}

export interface TaskDependencyDTO {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface SubmissionAttachmentDTO {
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

export interface SubmissionReviewDTO {
  id: string;
  reviewer: { id: string; name: string } | null;
  status: "approved" | "rejected" | "changes_requested";
  comment?: string;
  at: string;
}

export interface SubmissionDTO {
  id: string;
  version: number;
  submittedBy: { id: string; name: string } | null;
  submittedAt: string;
  repoUrl?: string;
  liveUrl?: string;
  docsUrl?: string;
  notes?: string;
  attachments: SubmissionAttachmentDTO[];
  status: "pending_review" | "approved" | "rejected" | "changes_requested";
  reviewedBy: { id: string; name: string } | null;
  reviewedAt?: string;
  reviewComments?: string;
  reviews: SubmissionReviewDTO[];
}

export interface TaskDTO {
  id: string;
  title: string;
  description?: string;
  project: { id: string; title: string; status?: string } | null;
  assignedTo: TaskAssigneeDTO | null;
  assignees: TaskAssigneeDTO[];
  dependencies: TaskDependencyDTO[];
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  status: TaskStatus;
  remarks?: string;
  completedAt?: string;
  comments: TaskCommentDTO[];
  attachments: TaskAttachmentDTO[];
  history: TaskHistoryDTO[];
  submissions: SubmissionDTO[];
  submissionStatus: SubmissionStatus;
  latestSubmission: SubmissionDTO | null;
  createdBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

function toUser(u: unknown): TaskAssigneeDTO | null {
  const x = u as { _id?: { toString(): string }; name?: string; email?: string; role?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "", email: x.email ?? "", role: x.role ?? "" };
}

function toBy(u: unknown): { id: string; name: string } | null {
  const x = u as { _id?: { toString(): string }; name?: string } | null;
  if (!x || !x._id) return null;
  return { id: x._id.toString(), name: x.name ?? "" };
}

function toComment(c: TaskCommentSubDoc): TaskCommentDTO {
  return {
    id: c._id.toString(),
    user: toUser(c.user),
    message: c.message,
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

function toAttachment(a: TaskAttachmentSubDoc): TaskAttachmentDTO {
  return {
    id: a._id.toString(),
    filename: a.filename,
    fileUrl: a.fileUrl,
    uploadedBy: toUser(a.uploadedBy),
    uploadedAt: new Date(a.uploadedAt).toISOString(),
  };
}

function toHistory(h: TaskHistorySubDoc): TaskHistoryDTO {
  return {
    id: h._id.toString(),
    action: h.action,
    by: toBy(h.by),
    byName: h.byName,
    at: new Date(h.at).toISOString(),
    details: h.details,
  };
}

function toSubAttachment(a: SubmissionAttachmentSubDoc): SubmissionAttachmentDTO {
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

function toReview(r: import("./task.repository").SubmissionReviewSubDoc): SubmissionReviewDTO {
  return {
    id: r._id.toString(),
    reviewer: toBy(r.reviewer),
    status: r.status,
    comment: r.comment,
    at: new Date(r.at).toISOString(),
  };
}

export function toSubmissionDTO(s: SubmissionSubDoc): SubmissionDTO {
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

export function toTaskDTO(t: TaskDoc): TaskDTO {
  const proj = t.project as unknown as
    | { _id: { toString(): string }; title: string; status?: string }
    | null;
  const assignees = (t.assignees ?? []).map(toUser).filter((x): x is TaskAssigneeDTO => !!x);
  const deps = (t.dependencies ?? [])
    .map((d) => {
      const x = d as unknown as { _id?: { toString(): string }; title?: string; status?: TaskStatus } | null;
      if (!x || !x._id) return null;
      return { id: x._id.toString(), title: x.title ?? "", status: (x.status ?? "pending") as TaskStatus };
    })
    .filter((d): d is TaskDependencyDTO => !!d);
  const submissions = (t.submissions ?? []).map(toSubmissionDTO);
  const latestSubmission =
    submissions.length === 0 ? null : submissions[submissions.length - 1] ?? null;
  return {
    id: t._id.toString(),
    title: t.title,
    description: t.description,
    project: proj && proj._id ? { id: proj._id.toString(), title: proj.title, status: proj.status } : null,
    assignedTo: toUser(t.assignedTo),
    assignees,
    dependencies: deps,
    priority: t.priority,
    startDate: t.startDate?.toISOString(),
    dueDate: t.dueDate?.toISOString(),
    status: t.status,
    remarks: t.remarks,
    completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
    comments: (t.comments ?? []).map(toComment),
    attachments: (t.attachments ?? []).map(toAttachment),
    history: (t.history ?? []).map(toHistory),
    submissions,
    submissionStatus: t.submissionStatus ?? "none",
    latestSubmission,
    createdBy: toBy(t.createdBy),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
