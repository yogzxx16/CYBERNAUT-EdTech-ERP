import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type LeaveType = "casual" | "sick" | "earned" | "unpaid" | "maternity" | "paternity";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveDoc extends Document {
  _id: Types.ObjectId;
  employee: Types.ObjectId;
  leaveType: LeaveType;
  reason: string;
  startDate: Date;
  endDate: Date;
  numberOfDays: number;
  status: LeaveStatus;
  approvedBy?: Types.ObjectId | null;
  approvedAt?: Date | null;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveSchema = new Schema<LeaveDoc>(
  {
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "earned", "unpaid", "maternity", "paternity"],
      required: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    numberOfDays: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

const LeaveModel: Model<LeaveDoc> = model<LeaveDoc>("LeaveRequest", leaveSchema);

export interface LeaveListQuery {
  page: number;
  limit: number;
  employee?: string;
  status?: LeaveStatus | "all";
  leaveType?: LeaveType | "all";
  search?: string;
  sort?: string;
}

export const leaveRepository = {
  model: LeaveModel,
  async findById(id: string) {
    return LeaveModel.findById(id).exec();
  },
  async create(input: Partial<LeaveDoc>) {
    return LeaveModel.create(input);
  },
  async update(id: string, patch: Partial<LeaveDoc>) {
    return LeaveModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  /** Find overlapping pending/approved requests for an employee. */
  async findOverlap(employee: string, startDate: Date, endDate: Date, excludeId?: string) {
    const filter: Record<string, unknown> = {
      employee,
      status: { $in: ["pending", "approved"] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    return LeaveModel.findOne(filter).exec();
  },
  async list(q: LeaveListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.employee) filter.employee = q.employee;
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.leaveType && q.leaveType !== "all") filter.leaveType = q.leaveType;
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.reason = rx;
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      sort[field] = dir === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    const [items, total] = await Promise.all([
      LeaveModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("employee", "name email role employeeCode")
        .populate("approvedBy", "name email role")
        .exec(),
      LeaveModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return LeaveModel.countDocuments(filter).exec();
  },
};
