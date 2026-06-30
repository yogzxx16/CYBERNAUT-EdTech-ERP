import { Schema, model, type Document, type Model, type Types } from "mongoose";
import { ROLES, ROLE_LIST, type Role } from "../../../config/constants";

export type AccountStatus = "active" | "suspended" | "invited";

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  name: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  email: string;
  password: string;
  phone?: string;
  dob?: Date;
  joiningDate?: Date;
  department?: Types.ObjectId | null;
  role: Role;
  designation?: string;
  address?: string;
  bio?: string;
  salary?: number;
  profileImage?: string;
  accountStatus: AccountStatus;
  forcePasswordChange: boolean;
  isActive: boolean;
  passwordChangedAt?: Date;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    firstName: { type: String, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80 },
    employeeCode: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 32 },
    dob: { type: Date },
    joiningDate: { type: Date },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    role: { type: String, enum: ROLE_LIST, default: ROLES.EMPLOYEE, required: true, index: true },
    designation: { type: String, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 500 },
    bio: { type: String, trim: true, maxlength: 1000 },
    salary: { type: Number, min: 0 },
    profileImage: { type: String },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "invited"],
      default: "active",
      index: true,
    },
    forcePasswordChange: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

userSchema.index({ firstName: "text", lastName: "text", email: "text", employeeCode: "text" });

const UserModel: Model<UserDoc> = model<UserDoc>("User", userSchema);

export const userRepository = {
  model: UserModel,
  async findByEmail(email: string, withPassword = false) {
    const q = UserModel.findOne({ email: email.toLowerCase() });
    if (withPassword) q.select("+password");
    return q.exec();
  },
  async findById(id: string, withPassword = false) {
    const q = UserModel.findById(id);
    if (withPassword) q.select("+password");
    return q.exec();
  },
  async create(input: Pick<UserDoc, "name" | "email" | "password"> & { role?: Role }) {
    return UserModel.create({
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      role: input.role ?? ROLES.EMPLOYEE,
    });
  },
  async updatePassword(id: string, hashedPassword: string) {
    return UserModel.findByIdAndUpdate(
      id,
      { password: hashedPassword, passwordChangedAt: new Date(), forcePasswordChange: false },
      { new: true },
    ).exec();
  },
  async emailExists(email: string) {
    return UserModel.exists({ email: email.toLowerCase() }).then(Boolean);
  },
};
