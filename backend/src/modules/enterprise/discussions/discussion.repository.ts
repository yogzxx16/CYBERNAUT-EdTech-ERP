import { Schema, model, type Document, type Model, type Types } from "mongoose";

export interface DiscussionMessage {
  _id?: Types.ObjectId;
  author: Types.ObjectId;
  body: string;
  attachments?: string[];
  editedAt?: Date | null;
  createdAt?: Date;
}

export interface DiscussionDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  project?: Types.ObjectId | null;
  createdBy?: Types.ObjectId | null;
  participants: Types.ObjectId[];
  messages: DiscussionMessage[];
  attachments: string[];
  closed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<DiscussionMessage>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    attachments: [{ type: String, trim: true }],
    editedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const schema = new Schema<DiscussionDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    messages: [messageSchema],
    attachments: [{ type: String, trim: true }],
    closed: { type: Boolean, default: false },
  },
  { timestamps: true },
);
schema.index({ title: "text", description: "text" });

const DiscussionModel: Model<DiscussionDoc> = model<DiscussionDoc>("Discussion", schema);

export interface DiscussionListQuery {
  page: number;
  limit: number;
  search?: string;
  project?: string;
  participant?: string;
  closed?: boolean;
  sort?: string;
}

export const discussionRepository = {
  model: DiscussionModel,
  async findById(id: string) {
    return DiscussionModel.findById(id).exec();
  },
  async create(input: Partial<DiscussionDoc>) {
    return DiscussionModel.create(input);
  },
  async update(id: string, patch: Partial<DiscussionDoc>) {
    return DiscussionModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  async list(q: DiscussionListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.project) filter.project = q.project;
    if (q.participant) filter.participants = q.participant;
    if (typeof q.closed === "boolean") filter.closed = q.closed;
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [{ title: rx }, { description: rx }];
    }
    const sort: Record<string, 1 | -1> = q.sort
      ? { [q.sort.split(":")[0]]: q.sort.split(":")[1] === "asc" ? 1 : -1 }
      : { updatedAt: -1 };
    const [items, total] = await Promise.all([
      DiscussionModel.find(filter)
        .select("-messages")
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("project", "title")
        .populate("createdBy", "name email role")
        .populate("participants", "name email role")
        .exec(),
      DiscussionModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
};
