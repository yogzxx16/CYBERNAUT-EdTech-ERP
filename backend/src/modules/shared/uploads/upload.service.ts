import path from "path";
import fs from "fs";
import multer from "multer";
import { ApiError } from "../../../utils/apiError";

/**
 * UploadService — thin abstraction over disk storage today, designed so that
 * the storage backend can later be swapped for S3 / Cloudflare R2 / Supabase
 * Storage without changing call sites. All consumers receive a stable URL
 * (relative to the API host) plus filename + mime + size.
 */

export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");
const SUB_DIRS = ["submissions", "attachments", "avatars"] as const;
export type UploadKind = (typeof SUB_DIRS)[number];

for (const dir of SUB_DIRS) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true });
}

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-rar",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

const ALLOWED_EXT = new Set([
  ".pdf", ".zip", ".rar", ".docx", ".pptx", ".png", ".jpg", ".jpeg",
]);

function safeBase(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

function storageFor(kind: UploadKind) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOAD_ROOT, kind)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const stem = path.basename(file.originalname, ext);
      const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      cb(null, `${safeBase(stem)}-${stamp}${ext}`);
    },
  });
}

export function makeUploader(kind: UploadKind, opts?: { maxSizeMb?: number; maxFiles?: number }) {
  return multer({
    storage: storageFor(kind),
    limits: {
      fileSize: (opts?.maxSizeMb ?? 25) * 1024 * 1024,
      files: opts?.maxFiles ?? 10,
    },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const okExt = ALLOWED_EXT.has(ext);
      const okMime = ALLOWED_MIME.has(file.mimetype);
      if (!okExt || !okMime) {
        return cb(new ApiError(400, `Unsupported file type: ${file.originalname}`));
      }
      cb(null, true);
    },
  });
}

export interface UploadedFileDTO {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  extension: string;
  uploadedAt: string;
}

export function toUploadedDTO(file: Express.Multer.File, kind: UploadKind): UploadedFileDTO {
  return {
    filename: file.filename,
    originalName: file.originalname,
    url: `/uploads/${kind}/${file.filename}`,
    size: file.size,
    mimeType: file.mimetype,
    extension: path.extname(file.originalname).toLowerCase(),
    uploadedAt: new Date().toISOString(),
  };
}

/** Delete a stored upload by kind + filename. Returns true if a file was removed. */
export function deleteUpload(kind: UploadKind, filename: string): boolean {
  // Strip any path components — only allow plain filenames inside the kind dir.
  const safe = path.basename(filename);
  const target = path.join(UPLOAD_ROOT, kind, safe);
  const root = path.join(UPLOAD_ROOT, kind);
  const resolved = path.resolve(target);
  if (!resolved.startsWith(path.resolve(root))) return false;
  if (!fs.existsSync(resolved)) return false;
  fs.unlinkSync(resolved);
  return true;
}

export const uploadService = {
  ALLOWED_EXT,
  ALLOWED_MIME,
  makeUploader,
  toUploadedDTO,
  deleteUpload,
};
