import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type AnnouncementPriority = "low" | "medium" | "high" | "critical";
export type AnnouncementStatus = "draft" | "published" | "archived";
export type AnnouncementAudience = "all" | "admins" | "employees" | "interns" | "department";

export interface AnnouncementDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  department?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  status: AnnouncementStatus;
  publishedAt?: Date | null;
  expiryDate?: Date | null;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<AnnouncementDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    audience: {
      type: String,
      enum: ["all", "admins", "employees", "interns", "department"],
      default: "all",
      index: true,
    },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    attachments: [{ type: String, trim: true }],
  },
  { timestamps: true },
);
schema.index({ title: "text", description: "text" });

const AnnouncementModel: Model<AnnouncementDoc> = model<AnnouncementDoc>(
  "Announcement",
  schema,
);

export interface AnnouncementListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: AnnouncementStatus | "all";
  priority?: AnnouncementPriority | "all";
  audience?: AnnouncementAudience | "all";
  sort?: string;
}

export const announcementRepository = {
  model: AnnouncementModel,
  async findById(id: string) {
    return AnnouncementModel.findById(id).exec();
  },
  async create(input: Partial<AnnouncementDoc>) {
    return AnnouncementModel.create(input);
  },
  async update(id: string, patch: Partial<AnnouncementDoc>) {
    return AnnouncementModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  async list(q: AnnouncementListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.priority && q.priority !== "all") filter.priority = q.priority;
    if (q.audience && q.audience !== "all") filter.audience = q.audience;
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [{ title: rx }, { description: rx }];
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [f, d] = q.sort.split(":");
      sort[f] = d === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    const [items, total] = await Promise.all([
      AnnouncementModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("createdBy", "name email role")
        .populate("department", "name code")
        .exec(),
      AnnouncementModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return AnnouncementModel.countDocuments(filter).exec();
  },
};
