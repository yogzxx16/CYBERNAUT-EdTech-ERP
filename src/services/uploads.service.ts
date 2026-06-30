import { api, unwrap, type ApiEnvelope } from "./api";

export type UploadKind = "submissions" | "attachments" | "avatars";

export interface UploadedFile {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  extension?: string;
  uploadedAt?: string;
}

/** Resolve a relative `/uploads/...` URL to an absolute URL on the API host. */
export function resolveUploadUrl(url: string | undefined | null): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = (api.defaults.baseURL ?? "").replace(/\/api\/v\d+\/?$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Human-readable file size. */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes < 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export const uploadsApi = {
  /** Upload one or more files. Returns the stored file metadata. */
  async upload(
    kind: UploadKind,
    files: File[],
    onProgress?: (pct: number) => void,
  ): Promise<UploadedFile[]> {
    if (files.length === 0) return [];
    // Client-side guard: reject empty files before round-tripping.
    const empty = files.find((f) => f.size === 0);
    if (empty) {
      throw new Error(`Empty file rejected: ${empty.name}`);
    }
    const form = new FormData();
    for (const f of files) form.append("files", f, f.name);
    const res = await api.post<ApiEnvelope<UploadedFile[]>>(`/uploads/${kind}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return;
        onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return unwrap(res.data);
  },

  /** Delete a stored upload by kind + filename. */
  async remove(kind: UploadKind, filename: string): Promise<void> {
    await api.delete<ApiEnvelope<{ removed: boolean }>>(`/uploads/${kind}/${encodeURIComponent(filename)}`);
  },
};
