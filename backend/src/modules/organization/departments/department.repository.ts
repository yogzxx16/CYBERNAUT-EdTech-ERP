import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type DepartmentStatus = "active" | "archived";

export interface DepartmentDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  status: DepartmentStatus;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<DepartmentDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 24, unique: true },
    description: { type: String, trim: true, maxlength: 600 },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

departmentSchema.index({ name: "text", code: "text", description: "text" });

const DepartmentModel: Model<DepartmentDoc> = model<DepartmentDoc>("Department", departmentSchema);

export interface DepartmentListQuery {
  search?: string;
  status?: DepartmentStatus | "all";
  page: number;
  limit: number;
  sort?: string;
}

export const departmentRepository = {
  model: DepartmentModel,

  async existsByName(name: string, excludeId?: string) {
    const q: Record<string, unknown> = { name: new RegExp(`^${name}$`, "i") };
    if (excludeId) q._id = { $ne: excludeId };
    return DepartmentModel.exists(q).then(Boolean);
  },
  async existsByCode(code: string, excludeId?: string) {
    const q: Record<string, unknown> = { code: code.toUpperCase() };
    if (excludeId) q._id = { $ne: excludeId };
    return DepartmentModel.exists(q).then(Boolean);
  },
  async findById(id: string) {
    return DepartmentModel.findById(id).exec();
  },
  async create(input: Partial<DepartmentDoc>) {
    return DepartmentModel.create(input);
  },
  async update(id: string, input: Partial<DepartmentDoc>) {
    return DepartmentModel.findByIdAndUpdate(id, input, { new: true }).exec();
  },
  async setStatus(id: string, status: DepartmentStatus, updatedBy?: string | null) {
    return DepartmentModel.findByIdAndUpdate(
      id,
      { status, updatedBy: updatedBy ?? null },
      { new: true },
    ).exec();
  },
  async list(q: DepartmentListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [{ name: rx }, { code: rx }, { description: rx }];
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      sort[field] = dir === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    const [items, total] = await Promise.all([
      DepartmentModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      DepartmentModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return DepartmentModel.countDocuments(filter).exec();
  },
};
