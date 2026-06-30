import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type AuditAction =
  | "login"
  | "logout"
  | "user.create"
  | "user.update"
  | "department.create"
  | "department.update"
  | "department.archive"
  | "role.create"
  | "role.update"
  | "project.create"
  | "project.update"
  | "project.progress.recompute"
  | "leave.approve"
  | "leave.reject"
  | "salary.generate"
  | "ticket.create"
  | "ticket.close"
  | "announcement.publish"
  | "event.create"
  | "event.update"
  | "event.cancel"
  | "event.delete"
  | "profile.update"
  | "password.change"
  | "submission.create"
  | "submission.review"
  | "attachment.upload"
  | "attachment.delete"
  | "attachment.download";

export interface AuditDoc extends Document {
  _id: Types.ObjectId;
  actor?: Types.ObjectId | null;
  actorName?: string;
  actorRole?: string;
  action: AuditAction;
  entity?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditSchema = new Schema<AuditDoc>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, trim: true, index: true },
    entityId: { type: String, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
  },
  { timestamps: true },
);

auditSchema.index({ createdAt: -1 });
auditSchema.index({ summary: "text", action: "text", entity: "text" });

const AuditModel: Model<AuditDoc> = model<AuditDoc>("AuditLog", auditSchema);

export interface AuditListQuery {
  page: number;
  limit: number;
  search?: string;
  action?: string;
  actor?: string;
  from?: Date;
  to?: Date;
}

export const auditRepository = {
  model: AuditModel,
  async create(input: Partial<AuditDoc>) {
    return AuditModel.create(input);
  },
  async list(q: AuditListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.action) filter.action = q.action;
    if (q.actor) filter.actor = q.actor;
    if (q.from || q.to) {
      const range: Record<string, Date> = {};
      if (q.from) range.$gte = q.from;
      if (q.to) range.$lte = q.to;
      filter.createdAt = range;
    }
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [{ summary: rx }, { action: rx }, { entity: rx }, { actorName: rx }];
    }
    const [items, total] = await Promise.all([
      AuditModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("actor", "name email role")
        .exec(),
      AuditModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
};
