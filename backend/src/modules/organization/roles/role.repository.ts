import { Schema, model, type Document, type Model, type Types } from "mongoose";
import { ROLE_LIST, type Role } from "../../../config/constants";
import { ALL_PERMISSIONS, type PermissionKey } from "../../../config/permissions";

export type RoleStatus = "active" | "inactive";

export interface RoleDoc extends Document {
  _id: Types.ObjectId;
  slug: Role;
  name: string;
  description?: string;
  permissions: PermissionKey[];
  status: RoleStatus;
  system: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<RoleDoc>(
  {
    slug: { type: String, enum: ROLE_LIST, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    permissions: {
      type: [{ type: String, enum: ALL_PERMISSIONS }],
      default: [],
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    system: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const RoleModel: Model<RoleDoc> = model<RoleDoc>("Role", roleSchema);

export const roleRepository = {
  model: RoleModel,
  async findBySlug(slug: string) {
    return RoleModel.findOne({ slug }).exec();
  },
  async findById(id: string) {
    return RoleModel.findById(id).exec();
  },
  async list() {
    return RoleModel.find().sort({ createdAt: 1 }).exec();
  },
  async update(id: string, input: Partial<RoleDoc>) {
    return RoleModel.findByIdAndUpdate(id, input, { new: true }).exec();
  },
  async upsertBySlug(slug: Role, input: Partial<RoleDoc>) {
    return RoleModel.findOneAndUpdate(
      { slug },
      { $setOnInsert: { slug }, $set: input },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
  },
  async count(filter: Record<string, unknown> = {}) {
    return RoleModel.countDocuments(filter).exec();
  },
};
