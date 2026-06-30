import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type ActivityAction =
  | "project.create"
  | "project.update"
  | "project.complete"
  | "task.create"
  | "task.assign"
  | "task.complete"
  | "submission.create"
  | "submission.approve"
  | "submission.reject"
  | "submission.changes_requested"
  | "attendance.mark"
  | "leave.approve"
  | "salary.generate"
  | "event.create"
  | "announcement.publish"
  | "discussion.post"
  | "ticket.resolve"
  | "attachment.upload";

export type ActivityEntity =
  | "project"
  | "task"
  | "user"
  | "leave"
  | "salary"
  | "attendance"
  | "event"
  | "announcement"
  | "discussion"
  | "ticket"
  | "attachment";

export interface ActivityDoc extends Document {
  _id: Types.ObjectId;
  actor?: Types.ObjectId | null;
  actorName?: string;
  actorRole?: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ActivityDoc>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorName: { type: String, trim: true },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, trim: true, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

schema.index({ entity: 1, entityId: 1, createdAt: -1 });
schema.index({ createdAt: -1 });

const ActivityModel: Model<ActivityDoc> = model<ActivityDoc>("Activity", schema);

export interface ActivityListQuery {
  page: number;
  limit: number;
  entity?: ActivityEntity;
  entityId?: string;
  actor?: string;
  action?: string;
  from?: Date;
  to?: Date;
}

export const activityRepository = {
  model: ActivityModel,
  async create(input: Partial<ActivityDoc>) {
    return ActivityModel.create(input);
  },
  async list(q: ActivityListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.entity) filter.entity = q.entity;
    if (q.entityId) filter.entityId = q.entityId;
    if (q.actor) filter.actor = q.actor;
    if (q.action) filter.action = q.action;
    if (q.from || q.to) {
      const range: Record<string, Date> = {};
      if (q.from) range.$gte = q.from;
      if (q.to) range.$lte = q.to;
      filter.createdAt = range;
    }
    const [items, total] = await Promise.all([
      ActivityModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("actor", "name email role avatarUrl")
        .exec(),
      ActivityModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
};
