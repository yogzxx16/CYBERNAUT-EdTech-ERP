import { useCallback, useRef, useState } from "react";
import { FileUp, X, Loader2, FileText, Image as ImageIcon, FileArchive, FileCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  uploadsApi,
  type UploadKind,
  type UploadedFile,
} from "@/services/uploads.service";

const ALLOWED = [".pdf", ".zip", ".rar", ".docx", ".pptx", ".png", ".jpg", ".jpeg"];
const MAX_MB = 25;

function iconFor(filename: string) {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return ImageIcon;
  if (["zip", "rar"].includes(ext)) return FileArchive;
  if (["docx", "pptx", "pdf"].includes(ext)) return FileText;
  return FileCheck2;
}

function formatBytes(n: number | undefined) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export interface FileDropzoneProps {
  kind?: UploadKind;
  value: UploadedFile[];
  onChange: (next: UploadedFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
  label?: string;
  description?: string;
}

/**
 * Drag-and-drop file uploader. Uploads each file immediately to the backend
 * UploadService and stores the returned metadata in `value`. Validates
 * extension + size client-side; backend re-validates.
 */
export function FileDropzone({
  kind = "submissions",
  value,
  onChange,
  disabled,
  maxFiles = 10,
  className,
  label = "Drop files here, or click to browse",
  description = `PDF, ZIP, RAR, DOCX, PPTX, PNG, JPG up to ${MAX_MB}MB`,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      if (disabled) return;
      const list = Array.from(files);
      if (value.length + list.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }
      const accepted: File[] = [];
      for (const f of list) {
        const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
        if (!ALLOWED.includes(ext)) {
          toast.error(`${f.name}: unsupported file type`);
          continue;
        }
        if (f.size > MAX_MB * 1024 * 1024) {
          toast.error(`${f.name}: exceeds ${MAX_MB}MB`);
          continue;
        }
        accepted.push(f);
      }
      if (!accepted.length) return;
      setUploading(true);
      setProgress(0);
      try {
        const uploaded = await uploadsApi.upload(kind, accepted, setProgress);
        onChange([...value, ...uploaded]);
        toast.success(`Uploaded ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}`);
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg ?? "Upload failed");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [disabled, kind, maxFiles, onChange, value],
  );

  function removeAt(idx: number) {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void ingest(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-all",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED.join(",")}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            if (e.target.files) void ingest(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileUp className="h-5 w-5" />}
        </div>
        <p className="mt-2 text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {uploading && <Progress value={progress} className="mt-3 h-1.5 w-full max-w-xs" />}
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((f, i) => {
            const Icon = iconFor(f.originalName ?? f.filename);
            return (
              <li
                key={`${f.filename}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.originalName ?? f.filename}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(f.size)} · {f.mimeType ?? ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  disabled={disabled}
                  onClick={() => removeAt(i)}
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
