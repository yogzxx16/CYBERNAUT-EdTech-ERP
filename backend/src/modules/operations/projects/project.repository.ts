import { Schema, model, type Document, type Model, type Types } from "mongoose";
import {
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from "../../shared/submissions/submission.types";

export type ProjectStatus = "planning" | "in_progress" | "on_hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";

export interface ProjectSubmissionAttachmentSubDoc {
  _id: Types.ObjectId;
  filename: string;
  originalName?: string;
  url: string;
  size?: number;
  mimeType?: string;
  extension?: string;
  uploadedAt?: Date;
  uploadedBy?: Types.ObjectId | null;
}

export interface ProjectSubmissionReviewSubDoc {
  _id: Types.ObjectId;
  reviewer: Types.ObjectId;
  status: "approved" | "rejected" | "changes_requested";
  comment?: string;
  at: Date;
}

export interface ProjectSubmissionSubDoc {
  _id: Types.ObjectId;
  version: number;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  repoUrl?: string;
  liveUrl?: string;
  docsUrl?: string;
  notes?: string;
  attachments: ProjectSubmissionAttachmentSubDoc[];
  status: Exclude<SubmissionStatus, "none">;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewComments?: string;
  reviews: ProjectSubmissionReviewSubDoc[];
}

export interface ProjectDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  department?: Types.ObjectId | null;
  projectManager?: Types.ObjectId | null;
  assignedEmployees: Types.ObjectId[];
  priority: ProjectPriority;
  startDate?: Date;
  endDate?: Date;
  status: ProjectStatus;
  completionPercentage: number;
  submissions: ProjectSubmissionSubDoc[];
  submissionStatus: SubmissionStatus;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const subAttachmentSchema = new Schema<ProjectSubmissionAttachmentSubDoc>(
  {
    filename: { type: String, required: true, maxlength: 255 },
    originalName: { type: String, maxlength: 255 },
    url: { type: String, required: true, maxlength: 1000 },
    size: { type: Number },
    mimeType: { type: String, maxlength: 120 },
    extension: { type: String, maxlength: 16 },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true },
);

const submissionReviewSchema = new Schema<ProjectSubmissionReviewSubDoc>(
  {
    reviewer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["approved", "rejected", "changes_requested"],
      required: true,
    },
    comment: { type: String, trim: true, maxlength: 2000 },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const submissionSchema = new Schema<ProjectSubmissionSubDoc>(
  {
    version: { type: Number, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
    repoUrl: { type: String, trim: true, maxlength: 1000 },
    liveUrl: { type: String, trim: true, maxlength: 1000 },
    docsUrl: { type: String, trim: true, maxlength: 1000 },
    notes: { type: String, trim: true, maxlength: 2000 },
    attachments: { type: [subAttachmentSchema], default: [] },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "changes_requested"],
      default: "pending_review",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    reviewComments: { type: String, trim: true, maxlength: 2000 },
    reviews: { type: [submissionReviewSchema], default: [] },
  },
  { _id: true, timestamps: false },
);

const projectSchema = new Schema<ProjectDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null, index: true },
    projectManager: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignedEmployees: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["planning", "in_progress", "on_hold", "completed", "archived"],
      default: "planning",
      index: true,
    },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    submissions: { type: [submissionSchema], default: [] },
    submissionStatus: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: "none",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

projectSchema.index({ title: "text", description: "text" });

const ProjectModel: Model<ProjectDoc> = model<ProjectDoc>("Project", projectSchema);

export interface ProjectListQuery {
  search?: string;
  status?: ProjectStatus | "all";
  priority?: ProjectPriority | "all";
  department?: string;
  member?: string;
  submissionStatus?: SubmissionStatus | "all";
  page: number;
  limit: number;
  sort?: string;
}

export const projectRepository = {
  model: ProjectModel,
  async findById(id: string) {
    return ProjectModel.findById(id).exec();
  },
  async create(input: Partial<ProjectDoc>) {
    return ProjectModel.create(input);
  },
  async update(id: string, patch: Partial<ProjectDoc>) {
    return ProjectModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  async addMembers(id: string, userIds: string[]) {
    return ProjectModel.findByIdAndUpdate(
      id,
      { $addToSet: { assignedEmployees: { $each: userIds } } },
      { new: true },
    ).exec();
  },
  async removeMember(id: string, userId: string) {
    return ProjectModel.findByIdAndUpdate(
      id,
      { $pull: { assignedEmployees: userId } },
      { new: true },
    ).exec();
  },
  async list(q: ProjectListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.status && q.status !== "all") filter.status = q.status;
    else if (!q.status) filter.status = { $ne: "archived" };
    if (q.priority && q.priority !== "all") filter.priority = q.priority;
    if (q.submissionStatus && q.submissionStatus !== "all") {
      filter.submissionStatus = q.submissionStatus;
    }
    if (q.department) filter.department = q.department;
    if (q.member) {
      filter.$or = [{ assignedEmployees: q.member }, { projectManager: q.member }];
    }
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      const or = [{ title: rx }, { description: rx }];
      filter.$and = filter.$or ? [{ $or: filter.$or }, { $or: or }] : undefined;
      if (!filter.$and) filter.$or = or;
      else delete (filter as { $or?: unknown }).$or;
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      sort[field] = dir === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    const [items, total] = await Promise.all([
      ProjectModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("department", "name code")
        .populate("projectManager", "name email role")
        .populate("assignedEmployees", "name email role")
        .exec(),
      ProjectModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return ProjectModel.countDocuments(filter).exec();
  },
};
