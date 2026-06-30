import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type EventStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
export type RSVPStatus = "yes" | "no" | "maybe";

export interface EventRSVP {
  user: Types.ObjectId;
  status: RSVPStatus;
  respondedAt: Date;
}

export interface EventDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  venue?: string;
  eventDate: Date;
  endDate?: Date | null;
  organizer?: Types.ObjectId | null;
  participants: Types.ObjectId[];
  rsvps: EventRSVP[];
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

const rsvpSchema = new Schema<EventRSVP>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["yes", "no", "maybe"], required: true },
    respondedAt: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const schema = new Schema<EventDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    venue: { type: String, trim: true, maxlength: 200 },
    eventDate: { type: Date, required: true, index: true },
    endDate: { type: Date, default: null },
    organizer: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    rsvps: [rsvpSchema],
    status: {
      type: String,
      enum: ["scheduled", "ongoing", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
  },
  { timestamps: true },
);
schema.index({ title: "text", description: "text", venue: "text" });

const EventModel: Model<EventDoc> = model<EventDoc>("Event", schema);

export interface EventListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: EventStatus | "all";
  from?: Date;
  to?: Date;
  sort?: string;
}

export const eventRepository = {
  model: EventModel,
  async findById(id: string) {
    return EventModel.findById(id).exec();
  },
  async create(input: Partial<EventDoc>) {
    return EventModel.create(input);
  },
  async update(id: string, patch: Partial<EventDoc>) {
    return EventModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  async list(q: EventListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.from || q.to) {
      const r: Record<string, Date> = {};
      if (q.from) r.$gte = q.from;
      if (q.to) r.$lte = q.to;
      filter.eventDate = r;
    }
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [{ title: rx }, { description: rx }, { venue: rx }];
    }
    const sort: Record<string, 1 | -1> = q.sort
      ? { [q.sort.split(":")[0]]: q.sort.split(":")[1] === "asc" ? 1 : -1 }
      : { eventDate: 1 };
    const [items, total] = await Promise.all([
      EventModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("organizer", "name email role")
        .populate("participants", "name email role")
        .exec(),
      EventModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
};
