import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave";

export interface AttendanceDoc extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  date: Date;
  checkIn?: Date | null;
  checkOut?: Date | null;
  workingHours: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<AttendanceDoc>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    workingHours: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "leave"],
      default: "present",
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const AttendanceModel: Model<AttendanceDoc> = model<AttendanceDoc>("Attendance", attendanceSchema);

export interface AttendanceListQuery {
  page: number;
  limit: number;
  employee?: string;
  status?: AttendanceStatus | "all";
  from?: Date;
  to?: Date;
  sort?: string;
}

export const attendanceRepository = {
  model: AttendanceModel,
  async findForDay(employee: string, day: Date) {
    return AttendanceModel.findOne({ employee, date: day }).exec();
  },
  async upsert(employee: string, day: Date, patch: Partial<AttendanceDoc>) {
    return AttendanceModel.findOneAndUpdate(
      { employee, date: day },
      { $set: patch, $setOnInsert: { employee, date: day } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
  },
  async list(q: AttendanceListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.employee) filter.employee = q.employee;
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.from || q.to) {
      const range: Record<string, Date> = {};
      if (q.from) range.$gte = q.from;
      if (q.to) range.$lte = q.to;
      filter.date = range;
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      sort[field] = dir === "asc" ? 1 : -1;
    } else {
      sort.date = -1;
    }
    const [items, total] = await Promise.all([
      AttendanceModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("employee", "name email role employeeCode")
        .exec(),
      AttendanceModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return AttendanceModel.countDocuments(filter).exec();
  },
};
