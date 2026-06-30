import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type NotificationType =
  | "project.assigned"
  | "project.completed"
  | "task.assigned"
  | "leave.approved"
  | "leave.rejected"
  | "attendance.update"
  | "ticket.update"
  | "ticket.resolved"
  | "announcement.published"
  | "event.created"
  | "event.updated"
  | "event.cancelled"
  | "password.changed"
  | "profile.updated"
  | "salary.generated"
  | "discussion.message"
  | "submission.approved"
  | "submission.rejected"
  | "submission.changes_requested"
  | "file.uploaded";

export interface NotificationDoc extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  readAt?: Date | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<NotificationDoc>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, trim: true, maxlength: 1000 },
    link: { type: String, trim: true, maxlength: 500 },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);
schema.index({ recipient: 1, createdAt: -1 });

const NotificationModel: Model<NotificationDoc> = model<NotificationDoc>(
  "Notification",
  schema,
);

export const notificationRepository = {
  model: NotificationModel,
  async create(input: Partial<NotificationDoc>) {
    return NotificationModel.create(input);
  },
  async insertMany(docs: Partial<NotificationDoc>[]) {
    if (docs.length === 0) return [];
    return NotificationModel.insertMany(docs);
  },
  async listForUser(userId: string, page: number, limit: number) {
    const [items, total, unread] = await Promise.all([
      NotificationModel.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      NotificationModel.countDocuments({ recipient: userId }).exec(),
      NotificationModel.countDocuments({ recipient: userId, read: false }).exec(),
    ]);
    return { items, total, unread };
  },
  async markRead(userId: string, id: string) {
    return NotificationModel.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true },
    ).exec();
  },
  async markAllRead(userId: string) {
    return NotificationModel.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() },
    ).exec();
  },
  async unreadCount(userId: string) {
    return NotificationModel.countDocuments({ recipient: userId, read: false }).exec();
  },
};
