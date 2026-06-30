import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { FileDropzone } from "@/components/common/FileDropzone";
import type { UploadedFile } from "@/services/uploads.service";
import type { SubmissionInput } from "@/services/tasks.service";

export interface SubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  /** Pre-fill from the latest submission when resubmitting after a rejection. */
  initial?: Partial<SubmissionInput>;
  submitting?: boolean;
  onSubmit: (input: SubmissionInput) => Promise<void> | void;
}

export function SubmissionDialog({
  open,
  onOpenChange,
  title = "Submit Deliverables",
  description = "Provide at least a repository, live URL, or upload your deliverable files.",
  initial,
  submitting,
  onSubmit,
}: SubmissionDialogProps) {
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? "");
  const [liveUrl, setLiveUrl] = useState(initial?.liveUrl ?? "");
  const [docsUrl, setDocsUrl] = useState(initial?.docsUrl ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [files, setFiles] = useState<UploadedFile[]>(
    (initial?.attachments ?? []).map((a) => ({
      filename: a.filename,
      originalName: a.originalName ?? a.filename,
      url: a.url,
      size: a.size ?? 0,
      mimeType: a.mimeType ?? "",
    })),
  );

  const isUrl = (v: string) => !v.trim() || /^https?:\/\/.+/i.test(v.trim());
  const repoOk = isUrl(repoUrl);
  const liveOk = isUrl(liveUrl);
  const docsOk = isUrl(docsUrl);

  const canSubmit = useMemo(() => {
    const hasFile = files.length > 0;
    const hasRepo = !!repoUrl.trim();
    const hasLive = !!liveUrl.trim();
    return (hasFile || hasRepo || hasLive) && repoOk && liveOk && docsOk && !submitting;
  }, [files.length, repoUrl, liveUrl, repoOk, liveOk, docsOk, submitting]);

  async function handleSubmit() {
    await onSubmit({
      repoUrl: repoUrl.trim() || undefined,
      liveUrl: liveUrl.trim() || undefined,
      docsUrl: docsUrl.trim() || undefined,
      notes: notes.trim() || undefined,
      attachments: files.map((f) => ({
        filename: f.filename,
        originalName: f.originalName,
        url: f.url,
        size: f.size,
        mimeType: f.mimeType,
      })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="repo">Repository URL</Label>
              <Input
                id="repo"
                placeholder="https://github.com/org/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              {!repoOk && (
                <p className="text-xs text-destructive">Must start with http:// or https://</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live">Live Project URL</Label>
              <Input
                id="live"
                placeholder="https://example.com"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
              />
              {!liveOk && (
                <p className="text-xs text-destructive">Must start with http:// or https://</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="docs">Documentation URL</Label>
            <Input
              id="docs"
              placeholder="https://docs.example.com"
              value={docsUrl}
              onChange={(e) => setDocsUrl(e.target.value)}
            />
            {!docsOk && (
              <p className="text-xs text-destructive">Must start with http:// or https://</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Completion Notes</Label>
            <Textarea
              id="notes"
              placeholder="Summary of work delivered, known issues, next steps…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Attachments</Label>
            <FileDropzone value={files} onChange={setFiles} kind="submissions" />
          </div>

          <p className="text-xs text-muted-foreground">
            Provide at least one: a repository URL, a live URL, or an uploaded file.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
