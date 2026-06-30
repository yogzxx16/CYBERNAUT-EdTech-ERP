import { Schema, model, type Document, type Model, type Types } from "mongoose";

export type SalaryStatus = "draft" | "finalized";

export interface SalarySlipDoc extends Document {
  _id: Types.ObjectId;
  slipNumber: string;
  employee: Types.ObjectId;
  employeeId: Types.ObjectId;
  month: number; // 1-12
  year: number;
  baseSalary: number;
  workingDays: number;
  leaveDays: number;
  leaveDeduction: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  remarks?: string;
  status: SalaryStatus;
  generatedBy?: Types.ObjectId | null;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SalarySlipDoc>(
  {
    slipNumber: { type: String, required: true, unique: true, index: true },
    employee: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, min: 2000, max: 2100, required: true },
    baseSalary: { type: Number, min: 0, required: true },
    workingDays: { type: Number, min: 0, default: 22 },
    leaveDays: { type: Number, min: 0, default: 0 },
    leaveDeduction: { type: Number, min: 0, default: 0 },
    deductions: { type: Number, min: 0, default: 0 },
    bonus: { type: Number, min: 0, default: 0 },
    netSalary: { type: Number, min: 0, required: true },
    remarks: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["draft", "finalized"], default: "finalized", index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
);

schema.pre("validate", function keepEmployeeReferencesInSync(next) {
  if (!this.employeeId && this.employee) this.employeeId = this.employee;
  if (!this.employee && this.employeeId) this.employee = this.employeeId;
  next();
});

schema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
schema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const SalarySlipModel: Model<SalarySlipDoc> = model<SalarySlipDoc>("SalarySlip", schema);

export interface SalaryListQuery {
  page: number;
  limit: number;
  employee?: string;
  month?: number;
  year?: number;
  status?: SalaryStatus | "all";
  sort?: string;
}

export const salaryRepository = {
  model: SalarySlipModel,
  async findById(id: string) {
    return SalarySlipModel.findById(id).exec();
  },
  async create(input: Partial<SalarySlipDoc>) {
    return SalarySlipModel.create(input);
  },
  async findExisting(employee: string | Types.ObjectId, month: number, year: number) {
    return SalarySlipModel.findOne({ $or: [{ employee }, { employeeId: employee }], month, year }).exec();
  },
  async list(q: SalaryListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.employee) filter.$or = [{ employee: q.employee }, { employeeId: q.employee }];
    if (q.month) filter.month = q.month;
    if (q.year) filter.year = q.year;
    if (q.status && q.status !== "all") filter.status = q.status;
    const sort: Record<string, 1 | -1> = q.sort
      ? { [q.sort.split(":")[0]]: q.sort.split(":")[1] === "asc" ? 1 : -1 }
      : { year: -1, month: -1, createdAt: -1 };
    const [items, total] = await Promise.all([
      SalarySlipModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("employee", "name email role employeeCode department")
        .populate("generatedBy", "name email role")
        .exec(),
      SalarySlipModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return SalarySlipModel.countDocuments(filter).exec();
  },
};
