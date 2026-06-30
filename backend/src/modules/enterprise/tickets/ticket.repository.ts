import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory =
  | "technical"
  | "hr"
  | "payroll"
  | "facilities"
  | "access"
  | "other";

export interface TicketMessage {
  _id?: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  internal?: boolean;
  createdAt?: Date;
}

export interface TicketDoc extends Document {
  _id: Types.ObjectId;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  raisedBy: Types.ObjectId;
  assignedTo?: Types.ObjectId | null;
  conversation: TicketMessage[];
  closedAt?: Date | null;
  reopenedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<TicketMessage>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    internal: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const schema = new Schema<TicketDoc>(
  {
    ticketNumber: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: {
      type: String,
      enum: ["technical", "hr", "payroll", "facilities", "access", "other"],
      default: "other",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    conversation: [messageSchema],
    closedAt: { type: Date, default: null },
    reopenedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
schema.index({ subject: "text", description: "text", ticketNumber: "text" });

const TicketModel: Model<TicketDoc> = model<TicketDoc>("SupportTicket", schema);

export interface TicketListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: TicketStatus | "all";
  priority?: TicketPriority | "all";
  category?: TicketCategory | "all";
  raisedBy?: string;
  assignedTo?: string;
  sort?: string;
}

export const ticketRepository = {
  model: TicketModel,
  async findById(id: string) {
    return TicketModel.findById(id).exec();
  },
  async create(input: Partial<TicketDoc>) {
    return TicketModel.create(input);
  },
  async update(id: string, patch: Partial<TicketDoc>) {
    return TicketModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  async list(q: TicketListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.priority && q.priority !== "all") filter.priority = q.priority;
    if (q.category && q.category !== "all") filter.category = q.category;
    if (q.raisedBy) filter.raisedBy = q.raisedBy;
    if (q.assignedTo) filter.assignedTo = q.assignedTo;
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [{ subject: rx }, { description: rx }, { ticketNumber: rx }];
    }
    const sort: Record<string, 1 | -1> = q.sort
      ? { [q.sort.split(":")[0]]: q.sort.split(":")[1] === "asc" ? 1 : -1 }
      : { createdAt: -1 };
    const [items, total] = await Promise.all([
      TicketModel.find(filter)
        .select("-conversation")
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("raisedBy", "name email role employeeCode")
        .populate("assignedTo", "name email role")
        .exec(),
      TicketModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return TicketModel.countDocuments(filter).exec();
  },
};
