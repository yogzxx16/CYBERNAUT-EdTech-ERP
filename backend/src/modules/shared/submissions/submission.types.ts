/**
 * Shared submission types used by both tasks and projects.
 * Submissions are versioned (submissions[]) and each version carries an
 * append-only `reviews[]` history plus a denormalized `status` mirror of
 * the latest review for fast filtering. All additions are backward
 * compatible — existing documents without `reviews` are treated as having
 * an empty history.
 */

export const SUBMISSION_STATUSES = [
  "none",
  "pending_review",
  "approved",
  "rejected",
  "changes_requested",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

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

export interface ReviewDecisionInput {
  decision: "approve" | "reject" | "request_changes";
  comments?: string;
}

export interface SubmissionReviewEntry {
  id: string;
  reviewer: { id: string; name: string } | null;
  status: "approved" | "rejected" | "changes_requested";
  comment?: string;
  at: string;
}

export function validateSubmissionPayload(p: SubmissionInput) {
  const hasFile = (p.attachments ?? []).length > 0;
  const hasRepo = !!p.repoUrl?.trim();
  const hasLive = !!p.liveUrl?.trim();
  if (!hasFile && !hasRepo && !hasLive) {
    return "Provide at least a repository URL, live URL, or an uploaded file";
  }
  return null;
}

/** Extract the file extension (lowercase, with leading dot) from a filename. */
export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  if (i < 0 || i === name.length - 1) return "";
  return name.slice(i).toLowerCase();
}
