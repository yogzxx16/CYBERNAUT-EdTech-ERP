import { Schema, model, type Document, type Model, type Types } from "mongoose";
import {
  SUBMISSION_STATUSES,
  type SubmissionStatus,
} from "../../shared/submissions/submission.types";

export type TaskStatus = "pending" | "in_progress" | "review" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskCommentSubDoc {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  message: string;
  createdAt: Date;
}

export interface TaskAttachmentSubDoc {
  _id: Types.ObjectId;
  filename: string;
  fileUrl: string;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
}

export type TaskHistoryAction =
  | "created"
  | "assigned"
  | "unassigned"
  | "priority_changed"
  | "status_changed"
  | "comment_added"
  | "attachment_uploaded"
  | "attachment_removed"
  | "dependencies_changed"
  | "completed"
  | "updated"
  | "submitted"
  | "submission_approved"
  | "submission_rejected"
  | "submission_changes_requested";

export interface TaskHistorySubDoc {
  _id: Types.ObjectId;
  action: TaskHistoryAction;
  by: Types.ObjectId | null;
  byName?: string;
  at: Date;
  details?: string;
}

export interface SubmissionAttachmentSubDoc {
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

export interface SubmissionReviewSubDoc {
  _id: Types.ObjectId;
  reviewer: Types.ObjectId;
  status: "approved" | "rejected" | "changes_requested";
  comment?: string;
  at: Date;
}

export interface SubmissionSubDoc {
  _id: Types.ObjectId;
  version: number;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  repoUrl?: string;
  liveUrl?: string;
  docsUrl?: string;
  notes?: string;
  attachments: SubmissionAttachmentSubDoc[];
  /** Denormalized latest review status for fast filtering. */
  status: Exclude<SubmissionStatus, "none">;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewComments?: string;
  /** Append-only history of every review action on this submission version. */
  reviews: SubmissionReviewSubDoc[];
}

export interface TaskDoc extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  project: Types.ObjectId;
  assignedTo?: Types.ObjectId | null;
  assignees: Types.ObjectId[];
  dependencies: Types.ObjectId[];
  priority: TaskPriority;
  startDate?: Date;
  dueDate?: Date;
  status: TaskStatus;
  remarks?: string;
  completedAt?: Date | null;
  comments: TaskCommentSubDoc[];
  attachments: TaskAttachmentSubDoc[];
  history: TaskHistorySubDoc[];
  /** Versioned submission attempts (newest is the active one). */
  submissions: SubmissionSubDoc[];
  /** Denormalized derived status of the latest submission for fast filtering. */
  submissionStatus: SubmissionStatus;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<TaskCommentSubDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const attachmentSchema = new Schema<TaskAttachmentSubDoc>(
  {
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const historySchema = new Schema<TaskHistorySubDoc>(
  {
    action: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    byName: { type: String, trim: true },
    at: { type: Date, default: Date.now },
    details: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true },
);

const submissionAttachmentSchema = new Schema<SubmissionAttachmentSubDoc>(
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

const submissionReviewSchema = new Schema<SubmissionReviewSubDoc>(
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

const submissionSchema = new Schema<SubmissionSubDoc>(
  {
    version: { type: Number, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
    repoUrl: { type: String, trim: true, maxlength: 1000 },
    liveUrl: { type: String, trim: true, maxlength: 1000 },
    docsUrl: { type: String, trim: true, maxlength: 1000 },
    notes: { type: String, trim: true, maxlength: 2000 },
    attachments: { type: [submissionAttachmentSchema], default: [] },
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

const taskSchema = new Schema<TaskDoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    dependencies: [{ type: Schema.Types.ObjectId, ref: "Task", index: true }],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ["pending", "in_progress", "review", "completed"],
      default: "pending",
      index: true,
    },
    remarks: { type: String, trim: true, maxlength: 1000 },
    completedAt: { type: Date, default: null },
    comments: { type: [commentSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    history: { type: [historySchema], default: [] },
    submissions: { type: [submissionSchema], default: [] },
    submissionStatus: {
      type: String,
      enum: SUBMISSION_STATUSES,
      default: "none",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

taskSchema.pre("save", function (next) {
  if (this.assignees && this.assignees.length > 0) {
    this.assignedTo = this.assignees[0];
  } else if (this.assignedTo) {
    this.assignees = [this.assignedTo];
  }
  next();
});

const TaskModel: Model<TaskDoc> = model<TaskDoc>("Task", taskSchema);

export interface TaskListQuery {
  page: number;
  limit: number;
  search?: string;
  project?: string;
  assignedTo?: string;
  createdBy?: string;
  status?: TaskStatus | "all";
  priority?: TaskPriority | "all";
  submissionStatus?: SubmissionStatus | "all";
  dueFilter?: "today" | "overdue" | "tomorrow";
  sort?: string;
}

export const taskRepository = {
  model: TaskModel,
  async findById(id: string) {
    return TaskModel.findById(id).exec();
  },
  async create(input: Partial<TaskDoc>) {
    return TaskModel.create(input);
  },
  async update(id: string, patch: Partial<TaskDoc>) {
    return TaskModel.findByIdAndUpdate(id, patch, { new: true }).exec();
  },
  async list(q: TaskListQuery) {
    const filter: Record<string, unknown> = {};
    if (q.project) filter.project = q.project;
    if (q.assignedTo) {
      filter.$or = [{ assignedTo: q.assignedTo }, { assignees: q.assignedTo }];
    }
    if (q.createdBy) filter.createdBy = q.createdBy;
    if (q.status && q.status !== "all") filter.status = q.status;
    if (q.priority && q.priority !== "all") filter.priority = q.priority;
    if (q.submissionStatus && q.submissionStatus !== "all") {
      filter.submissionStatus = q.submissionStatus;
    }
    if (q.dueFilter) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      if (q.dueFilter === "today") {
        filter.dueDate = { $gte: start, $lte: end };
      } else if (q.dueFilter === "tomorrow") {
        const tStart = new Date(start);
        tStart.setDate(start.getDate() + 1);
        const tEnd = new Date(end);
        tEnd.setDate(end.getDate() + 1);
        filter.dueDate = { $gte: tStart, $lte: tEnd };
      } else if (q.dueFilter === "overdue") {
        filter.dueDate = { $lt: start };
        filter.status = { $ne: "completed" };
      }
    }
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      const orSearch = [{ title: rx }, { description: rx }, { remarks: rx }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: orSearch }];
        delete (filter as { $or?: unknown }).$or;
      } else {
        filter.$or = orSearch;
      }
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      sort[field] = dir === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    const [items, total] = await Promise.all([
      TaskModel.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate("assignedTo", "name email role")
        .populate("assignees", "name email role")
        .populate("project", "title status")
        .populate("dependencies", "title status")
        .exec(),
      TaskModel.countDocuments(filter).exec(),
    ]);
    return { items, total };
  },
  async count(filter: Record<string, unknown> = {}) {
    return TaskModel.countDocuments(filter).exec();
  },
  async findByIds(ids: string[]) {
    if (!ids.length) return [];
    return TaskModel.find({ _id: { $in: ids } }).exec();
  },
};
