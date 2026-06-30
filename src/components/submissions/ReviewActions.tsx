import { useState } from "react";
import { Check, X, MessageSquareWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ReviewInput } from "@/services/tasks.service";

export interface ReviewActionsProps {
  /** Disable all buttons (no pending submission, or no permission). */
  disabled?: boolean;
  submitting?: boolean;
  onReview: (input: ReviewInput) => Promise<void> | void;
  size?: "sm" | "default";
}

/**
 * Approve / Reject / Request Changes buttons. Reject and Request Changes
 * open a dialog to capture comments (required for Request Changes).
 */
export function ReviewActions({ disabled, submitting, onReview, size = "sm" }: ReviewActionsProps) {
  const [mode, setMode] = useState<null | "reject" | "request_changes">(null);
  const [comments, setComments] = useState("");

  async function approve() {
    await onReview({ decision: "approve" });
  }

  async function confirm() {
    if (!mode) return;
    if (mode === "request_changes" && !comments.trim()) return;
    await onReview({ decision: mode, comments: comments.trim() || undefined });
    setMode(null);
    setComments("");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size={size}
          onClick={approve}
          disabled={disabled || submitting}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {submitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
          Approve
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={disabled || submitting}
          onClick={() => setMode("request_changes")}
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" />
          Request changes
        </Button>
        <Button
          size={size}
          variant="outline"
          disabled={disabled || submitting}
          onClick={() => setMode("reject")}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          <X className="mr-1.5 h-3.5 w-3.5" />
          Reject
        </Button>
      </div>

      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "request_changes" ? "Request changes" : "Reject submission"}
            </DialogTitle>
            <DialogDescription>
              {mode === "request_changes"
                ? "Tell the submitter what needs to be changed before resubmitting."
                : "Optionally add a reason. The submitter will be notified."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rv-comments">
              Comments{mode === "request_changes" && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id="rv-comments"
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={
                mode === "request_changes"
                  ? "What needs to change?"
                  : "Optional reason for rejection"
              }
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMode(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={confirm}
              disabled={submitting || (mode === "request_changes" && !comments.trim())}
              variant={mode === "reject" ? "destructive" : "default"}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
