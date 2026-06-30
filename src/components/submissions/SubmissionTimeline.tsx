import {
  Github,
  ExternalLink,
  FileText,
  Download,
  CalendarClock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  MessageSquare,
  Clock3,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Submission, SubmissionReview } from "@/services/tasks.service";
import { formatFileSize, resolveUploadUrl } from "@/services/uploads.service";
import { SubmissionBadge } from "./SubmissionBadge";

function StatusIcon({ status }: { status: Submission["status"] | SubmissionReview["status"] }) {
  const cls = "h-3.5 w-3.5";
  if (status === "approved") return <CheckCircle2 className={cn(cls, "text-emerald-600")} />;
  if (status === "rejected") return <XCircle className={cn(cls, "text-red-600")} />;
  if (status === "changes_requested") return <AlertTriangle className={cn(cls, "text-amber-600")} />;
  if (status === "pending_review") return <Clock3 className={cn(cls, "text-amber-600")} />;
  return <History className={cn(cls, "text-muted-foreground")} />;
}

function ReviewHistory({ reviews }: { reviews: SubmissionReview[] }) {
  if (!reviews || reviews.length === 0) return null;
  // Newest review first.
  const ordered = reviews.slice().reverse();
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        Review history · {reviews.length}
      </p>
      <ul className="space-y-2">
        {ordered.map((r) => (
          <li key={r.id} className="flex gap-2 text-sm">
            <StatusIcon status={r.status} />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {r.reviewer?.name ?? "Reviewer"}
                </span>{" "}
                · {r.status.replace("_", " ")} ·{" "}
                {formatDistanceToNow(new Date(r.at), { addSuffix: true })}
              </p>
              {r.comment && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{r.comment}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubmissionRow({ s, latest }: { s: Submission; latest?: boolean }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border bg-card p-4 transition-shadow",
        latest ? "border-primary/40 shadow-soft" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full text-[10px]">
          v{s.version}
        </Badge>
        <SubmissionBadge status={s.status} />
        <span className="ml-auto text-xs text-muted-foreground">
          <CalendarClock className="mr-1 inline h-3 w-3" />
          {formatDistanceToNow(new Date(s.submittedAt), { addSuffix: true })}
          {s.submittedBy && <> · {s.submittedBy.name}</>}
        </span>
      </div>

      {(s.repoUrl || s.liveUrl || s.docsUrl) && (
        <div className="flex flex-wrap gap-2">
          {s.repoUrl && (
            <Button asChild variant="outline" size="sm" className="h-7 rounded-full">
              <a href={s.repoUrl} target="_blank" rel="noreferrer">
                <Github className="mr-1.5 h-3.5 w-3.5" /> Repository
              </a>
            </Button>
          )}
          {s.liveUrl && (
            <Button asChild variant="outline" size="sm" className="h-7 rounded-full">
              <a href={s.liveUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Live demo
              </a>
            </Button>
          )}
          {s.docsUrl && (
            <Button asChild variant="outline" size="sm" className="h-7 rounded-full">
              <a href={s.docsUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Docs
              </a>
            </Button>
          )}
        </div>
      )}

      {s.notes && (
        <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-sm text-foreground">
          {s.notes}
        </p>
      )}

      {s.attachments.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Paperclip className="h-3 w-3" />
            Attachments · {s.attachments.length}
          </p>
          <ul className="space-y-1.5">
            {s.attachments.map((a) => {
              const meta: string[] = [];
              if (a.extension) meta.push(a.extension.replace(/^\./, "").toUpperCase());
              const sizeStr = formatFileSize(a.size);
              if (sizeStr) meta.push(sizeStr);
              if (a.uploadedBy?.name) meta.push(a.uploadedBy.name);
              if (a.uploadedAt)
                meta.push(formatDistanceToNow(new Date(a.uploadedAt), { addSuffix: true }));
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.originalName ?? a.filename}</p>
                    {meta.length > 0 && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {meta.join(" · ")}
                      </p>
                    )}
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Download"
                  >
                    <a href={resolveUploadUrl(a.url)} target="_blank" rel="noreferrer" download>
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Full append-only review history if available; otherwise fall back to the latest review mirror. */}
      {s.reviews && s.reviews.length > 0 ? (
        <ReviewHistory reviews={s.reviews} />
      ) : (
        (s.status === "rejected" ||
          s.status === "changes_requested" ||
          s.status === "approved") &&
        (s.reviewComments || s.reviewedBy) && (
          <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-sm">
            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <StatusIcon status={s.status} />
                Reviewed by {s.reviewedBy?.name ?? "—"}
                {s.reviewedAt &&
                  ` · ${formatDistanceToNow(new Date(s.reviewedAt), { addSuffix: true })}`}
              </p>
              {s.reviewComments && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{s.reviewComments}</p>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export function SubmissionTimeline({ submissions }: { submissions: Submission[] }) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No submissions yet.
      </div>
    );
  }
  // Latest last in array — render newest-first.
  const ordered = submissions.slice().reverse();
  return (
    <div className="space-y-3">
      {ordered.map((s, i) => (
        <SubmissionRow key={s.id} s={s} latest={i === 0} />
      ))}
    </div>
  );
}
