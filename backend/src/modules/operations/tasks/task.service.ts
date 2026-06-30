import mongoose, { Types } from "mongoose";
import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { taskRepository, type TaskDoc, type TaskHistoryAction } from "./task.repository";
import { projectRepository } from "../projects/project.repository";
import { recomputeProjectProgress } from "../projects/project.service";
import { notificationService } from "../../enterprise/notifications/notification.service";
import { auditService } from "../../enterprise/audit/audit.service";
import { activityService } from "../../enterprise/activities/activity.service";
import { toTaskDTO } from "./task.dto";
import {
  fileExtension,
  validateSubmissionPayload,
} from "../../shared/submissions/submission.types";
import type {
  AddAttachmentInput,
  AddCommentInput,
  CreateTaskInput,
  ListTasksQuery,
  ReviewTaskInput,
  SubmitTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from "./task.validator";

function isManagerial(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

async function loadPopulated(id: string) {
  const doc = await taskRepository.model
    .findById(id)
    .populate("assignedTo", "name email role")
    .populate("assignees", "name email role")
    .populate("project", "title status")
    .populate("dependencies", "title status")
    .populate("comments.user", "name email role")
    .populate("attachments.uploadedBy", "name email role")
    .populate("history.by", "name")
    .populate("submissions.submittedBy", "name")
    .populate("submissions.reviewedBy", "name")
    .populate("submissions.attachments.uploadedBy", "name")
    .populate("submissions.reviews.reviewer", "name")
    .populate("createdBy", "name")
    .exec();
  if (!doc) throw ApiError.notFound("Task not found");
  return doc;
}

async function ensureProjectAccess(projectId: string, actor: { id: string; role: Role }) {
  const project = await projectRepository.findById(projectId);
  if (!project) throw ApiError.badRequest("Invalid project");
  if (isManagerial(actor.role)) return project;
  const ids = project.assignedEmployees.map((x) => x.toString());
  if (!ids.includes(actor.id) && project.projectManager?.toString() !== actor.id) {
    throw ApiError.forbidden("You do not have access to this project");
  }
  return project;
}

function isProjectPM(project: { projectManager?: Types.ObjectId | null }, userId: string) {
  return project.projectManager?.toString() === userId;
}

function canAssign(actorRole: Role, isPM: boolean) {
  return actorRole === ROLES.SUPER_ADMIN || actorRole === ROLES.ADMIN || isPM;
}

function canReview(actorRole: Role, isPM: boolean) {
  return actorRole === ROLES.SUPER_ADMIN || actorRole === ROLES.ADMIN || isPM;
}

function validateAssigneesAreMembers(
  project: { assignedEmployees: Types.ObjectId[]; projectManager?: Types.ObjectId | null },
  assignees: string[],
) {
  const members = new Set(project.assignedEmployees.map((x) => x.toString()));
  const pm = project.projectManager?.toString();
  if (pm) members.add(pm);
  for (const a of assignees) {
    if (!members.has(a)) {
      throw ApiError.badRequest(`Assignee ${a} is not a member of this project`);
    }
  }
}

async function ensureNoDependencyCycle(
  taskId: string | null,
  newDependencyIds: string[],
  projectId: string,
) {
  if (newDependencyIds.length === 0) return;
  const deps = await taskRepository.findByIds(newDependencyIds);
  if (deps.length !== newDependencyIds.length) {
    throw ApiError.badRequest("One or more dependencies do not exist");
  }
  for (const d of deps) {
    if (d.project.toString() !== projectId) {
      throw ApiError.badRequest("Dependencies must belong to the same project");
    }
    if (taskId && d._id.toString() === taskId) {
      throw ApiError.badRequest("A task cannot depend on itself");
    }
  }
  if (!taskId) return;
  const visited = new Set<string>();
  const stack = [...newDependencyIds];
  while (stack.length) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === taskId) throw ApiError.badRequest("Dependency cycle detected");
    const node = await taskRepository.findById(cur);
    if (!node) continue;
    for (const next of node.dependencies ?? []) stack.push(next.toString());
  }
}

async function ensureUniqueTitleInProject(title: string, projectId: string, excludeId?: string) {
  const filter: Record<string, unknown> = {
    project: projectId,
    title: new RegExp(`^${title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const exists = await taskRepository.model.findOne(filter).exec();
  if (exists) throw ApiError.conflict("A task with this title already exists in this project");
}

async function recordHistory(
  doc: TaskDoc,
  action: TaskHistoryAction,
  actor: { id: string; role: Role },
  details?: string,
) {
  doc.history.push({
    action,
    by: new mongoose.Types.ObjectId(actor.id) as never,
    at: new Date(),
    details,
  } as never);
}

async function notifyAssignees(taskId: string, title: string, assigneeIds: string[]) {
  await notificationService.notify({
    recipients: assigneeIds,
    type: "task.assigned",
    title: "You were assigned a task",
    body: title,
    link: `/tasks?id=${taskId}`,
  });
}

export const taskService = {
  async create(input: CreateTaskInput, actor: { id: string; role: Role }) {
    const project = await ensureProjectAccess(input.project, actor);
    const pmFlag = isProjectPM(project, actor.id);
    if (!canAssign(actor.role, pmFlag)) {
      throw ApiError.forbidden("Only Super Admin / Admin / Project Manager can create tasks");
    }
    validateAssigneesAreMembers(project, input.assignees);
    await ensureUniqueTitleInProject(input.title, input.project);
    await ensureNoDependencyCycle(null, input.dependencies ?? [], input.project);

    const doc = await taskRepository.model.create({
      title: input.title,
      description: input.description,
      project: input.project,
      assignees: input.assignees,
      dependencies: input.dependencies,
      priority: input.priority,
      startDate: input.startDate,
      dueDate: input.dueDate,
      status: input.status,
      createdBy: actor.id,
      updatedBy: actor.id,
      submissionStatus: "none",
      history: [
        { action: "created", by: new mongoose.Types.ObjectId(actor.id), at: new Date() },
        {
          action: "assigned",
          by: new mongoose.Types.ObjectId(actor.id),
          at: new Date(),
          details: `${input.assignees.length} assignee(s)`,
        },
      ],
    });
    await recomputeProjectProgress(input.project);
    await notifyAssignees(doc._id.toString(), doc.title, input.assignees);
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "task.create",
      entity: "task",
      entityId: doc._id.toString(),
      summary: `Created task "${doc.title}"`,
      metadata: { project: input.project },
    });
    if (input.assignees && input.assignees.length > 0) {
      await activityService.record({
        actor: { id: actor.id, role: actor.role },
        action: "task.assign",
        entity: "task",
        entityId: doc._id.toString(),
        summary: `Assigned task "${doc.title}" to ${input.assignees.length} member(s)`,
        metadata: { assignees: input.assignees },
      });
    }
    return toTaskDTO(await loadPopulated(doc._id.toString()));
  },

  async update(id: string, input: UpdateTaskInput, actor: { id: string; role: Role }) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw ApiError.notFound("Task not found");
    const project = await projectRepository.findById(existing.project.toString());
    if (!project) throw ApiError.notFound("Project not found");
    const pmFlag = isProjectPM(project, actor.id);
    const isAssignee =
      existing.assignees?.some((a) => a.toString() === actor.id) ||
      existing.assignedTo?.toString() === actor.id;

    const restrictedToStatusOnly = !isManagerial(actor.role) && !pmFlag;
    if (restrictedToStatusOnly && !isAssignee) {
      throw ApiError.forbidden("You can only update tasks assigned to you");
    }
    if (restrictedToStatusOnly) {
      const allowedKeys = new Set(["status", "remarks"]);
      for (const key of Object.keys(input)) {
        if (!allowedKeys.has(key)) {
          throw ApiError.forbidden("You can only update status/remarks on your tasks");
        }
      }
    }

    if (input.title) {
      await ensureUniqueTitleInProject(input.title, existing.project.toString(), id);
    }
    if (input.assignees) {
      validateAssigneesAreMembers(project, input.assignees);
    }
    if (input.dependencies) {
      await ensureNoDependencyCycle(id, input.dependencies, existing.project.toString());
    }

    if (input.status === "completed") {
      const depIds = (input.dependencies ?? existing.dependencies.map((d) => d.toString())).map(
        (d) => d.toString(),
      );
      if (depIds.length > 0) {
        const deps = await taskRepository.findByIds(depIds);
        const open = deps.filter((d) => d.status !== "completed");
        if (open.length > 0) {
          throw ApiError.badRequest(
            `Cannot complete: ${open.length} dependency task(s) are not completed yet`,
          );
        }
      }
    }

    const newAssignees = input.assignees;
    const oldAssignees = existing.assignees.map((x) => x.toString());
    if (input.title !== undefined) existing.title = input.title;
    if (input.description !== undefined) existing.description = input.description;
    if (input.priority !== undefined && input.priority !== existing.priority) {
      await recordHistory(
        existing,
        "priority_changed",
        actor,
        `${existing.priority} → ${input.priority}`,
      );
      existing.priority = input.priority;
    }
    if (input.startDate !== undefined) existing.startDate = input.startDate ?? undefined;
    if (input.dueDate !== undefined) existing.dueDate = input.dueDate ?? undefined;
    if (input.remarks !== undefined) existing.remarks = input.remarks;
    if (input.dependencies !== undefined) {
      existing.dependencies = input.dependencies.map(
        (d) => new mongoose.Types.ObjectId(d),
      ) as never;
      await recordHistory(existing, "dependencies_changed", actor, `${input.dependencies.length} deps`);
    }
    if (newAssignees) {
      existing.assignees = newAssignees.map((a) => new mongoose.Types.ObjectId(a)) as never;
      const added = newAssignees.filter((x) => !oldAssignees.includes(x));
      if (added.length > 0) {
        await recordHistory(existing, "assigned", actor, `${added.length} added`);
        await notifyAssignees(id, existing.title, added);
      }
      const removed = oldAssignees.filter((x) => !newAssignees.includes(x));
      if (removed.length > 0) {
        await recordHistory(existing, "unassigned", actor, `${removed.length} removed`);
      }
    }
    if (input.status !== undefined && input.status !== existing.status) {
      await recordHistory(
        existing,
        input.status === "completed" ? "completed" : "status_changed",
        actor,
        `${existing.status} → ${input.status}`,
      );
      existing.status = input.status;
      existing.completedAt = input.status === "completed" ? new Date() : null;
    }
    existing.updatedBy = new mongoose.Types.ObjectId(actor.id) as never;
    await existing.save();
    await recomputeProjectProgress(existing.project.toString());
    return toTaskDTO(await loadPopulated(id));
  },

  async updateStatus(id: string, input: UpdateTaskStatusInput, actor: { id: string; role: Role }) {
    return this.update(id, input, actor);
  },

  async addComment(id: string, input: AddCommentInput, actor: { id: string; role: Role }) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw ApiError.notFound("Task not found");
    await ensureProjectAccess(existing.project.toString(), actor);
    existing.comments.push({
      user: new mongoose.Types.ObjectId(actor.id) as never,
      message: input.message,
      createdAt: new Date(),
    } as never);
    await recordHistory(existing, "comment_added", actor);
    await existing.save();
    return toTaskDTO(await loadPopulated(id));
  },

  async addAttachment(id: string, input: AddAttachmentInput, actor: { id: string; role: Role }) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw ApiError.notFound("Task not found");
    await ensureProjectAccess(existing.project.toString(), actor);
    existing.attachments.push({
      filename: input.filename,
      fileUrl: input.fileUrl,
      uploadedBy: new mongoose.Types.ObjectId(actor.id) as never,
      uploadedAt: new Date(),
    } as never);
    await recordHistory(existing, "attachment_uploaded", actor, input.filename);
    await existing.save();
    return toTaskDTO(await loadPopulated(id));
  },

  async removeAttachment(id: string, attachmentId: string, actor: { id: string; role: Role }) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw ApiError.notFound("Task not found");
    const project = await projectRepository.findById(existing.project.toString());
    if (!project) throw ApiError.notFound("Project not found");
    const pmFlag = isProjectPM(project, actor.id);
    if (!isManagerial(actor.role) && !pmFlag) {
      throw ApiError.forbidden("Only managers or PM can remove attachments");
    }
    existing.attachments = existing.attachments.filter(
      (a) => a._id.toString() !== attachmentId,
    ) as never;
    await recordHistory(existing, "attachment_removed", actor);
    await existing.save();
    return toTaskDTO(await loadPopulated(id));
  },

  /** Submit (or resubmit) the current task. Versioned — appends to submissions[]. */
  async submit(id: string, input: SubmitTaskInput, actor: { id: string; role: Role }) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw ApiError.notFound("Task not found");
    const isAssignee =
      existing.assignees?.some((a) => a.toString() === actor.id) ||
      existing.assignedTo?.toString() === actor.id;
    if (!isAssignee && !isManagerial(actor.role)) {
      throw ApiError.forbidden("Only assignees can submit this task");
    }
    const err = validateSubmissionPayload(input);
    if (err) throw ApiError.badRequest(err);
    if (existing.submissionStatus === "pending_review") {
      throw ApiError.badRequest("A submission is already pending review");
    }
    const nextVersion = (existing.submissions?.length ?? 0) + 1;
    const now = new Date();
    const actorOid = new mongoose.Types.ObjectId(actor.id);
    const enrichedAttachments = (input.attachments ?? []).map((a) => ({
      filename: a.filename,
      originalName: a.originalName ?? a.filename,
      url: a.url,
      size: a.size,
      mimeType: a.mimeType,
      extension: a.extension ?? fileExtension(a.originalName ?? a.filename),
      uploadedAt: now,
      uploadedBy: actorOid,
    }));
    existing.submissions.push({
      version: nextVersion,
      submittedBy: actorOid as never,
      submittedAt: now,
      repoUrl: input.repoUrl || undefined,
      liveUrl: input.liveUrl || undefined,
      docsUrl: input.docsUrl || undefined,
      notes: input.notes,
      attachments: enrichedAttachments as never,
      status: "pending_review",
      reviews: [],
    } as never);
    existing.submissionStatus = "pending_review";
    if (existing.status !== "completed") existing.status = "review";
    await recordHistory(existing, "submitted", actor, `v${nextVersion}`);
    existing.updatedBy = actorOid as never;
    await existing.save();

    // Notify project manager + admins to review.
    const project = await projectRepository.findById(existing.project.toString());
    const reviewers: string[] = [];
    if (project?.projectManager) reviewers.push(project.projectManager.toString());
    await notificationService.notify({
      recipients: reviewers,
      type: "task.assigned",
      title: "Task submitted for review",
      body: existing.title,
      link: `/tasks?id=${id}`,
    });
    if (enrichedAttachments.length > 0) {
      await notificationService.notify({
        recipients: reviewers,
        type: "file.uploaded",
        title: `${enrichedAttachments.length} file${enrichedAttachments.length > 1 ? "s" : ""} uploaded`,
        body: `${existing.title} · v${nextVersion}`,
        link: `/tasks?id=${id}`,
      });
    }
    await auditService.record({
      actor: { id: actor.id, role: actor.role },
      action: "submission.create",
      entity: "task",
      entityId: id,
      summary: `Submitted task "${existing.title}" v${nextVersion}`,
      metadata: {
        version: nextVersion,
        attachments: enrichedAttachments.length,
        repoUrl: input.repoUrl,
        liveUrl: input.liveUrl,
      },
    });
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "submission.create",
      entity: "task",
      entityId: id,
      summary: `Submitted task "${existing.title}" (v${nextVersion})`,
      metadata: { version: nextVersion, attachments: enrichedAttachments.length },
    });
    await recomputeProjectProgress(existing.project.toString());
    return toTaskDTO(await loadPopulated(id));
  },

  /** Approve / reject / request changes on the latest submission. Re-review allowed; history appended. */
  async review(id: string, input: ReviewTaskInput, actor: { id: string; role: Role }) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw ApiError.notFound("Task not found");
    const project = await projectRepository.findById(existing.project.toString());
    if (!project) throw ApiError.notFound("Project not found");
    const pmFlag = isProjectPM(project, actor.id);
    if (!canReview(actor.role, pmFlag)) {
      throw ApiError.forbidden("Only PM, Admin or Super Admin can review submissions");
    }
    if (!existing.submissions || existing.submissions.length === 0) {
      throw ApiError.badRequest("No submission to review");
    }
    const latest = existing.submissions[existing.submissions.length - 1];
    const nextStatus =
      input.decision === "approve"
        ? "approved"
        : input.decision === "reject"
          ? "rejected"
          : "changes_requested";
    const reviewerOid = new mongoose.Types.ObjectId(actor.id);
    const now = new Date();
    if (!Array.isArray(latest.reviews)) latest.reviews = [] as never;
    latest.reviews.push({
      reviewer: reviewerOid,
      status: nextStatus,
      comment: input.comments,
      at: now,
    } as never);
    latest.status = nextStatus;
    latest.reviewedBy = reviewerOid as never;
    latest.reviewedAt = now;
    latest.reviewComments = input.comments;
    existing.submissionStatus = nextStatus;
    if (nextStatus === "approved") {
      existing.status = "completed";
      existing.completedAt = now;
    } else if (nextStatus === "rejected" || nextStatus === "changes_requested") {
      existing.status = "in_progress";
    }
    const historyAction: TaskHistoryAction =
      nextStatus === "approved"
        ? "submission_approved"
        : nextStatus === "rejected"
          ? "submission_rejected"
          : "submission_changes_requested";
    await recordHistory(existing, historyAction, actor, input.comments);
    existing.updatedBy = reviewerOid as never;
    await existing.save();

    // Notify submitter.
    const notifType =
      nextStatus === "approved"
        ? "submission.approved"
        : nextStatus === "rejected"
          ? "submission.rejected"
          : "submission.changes_requested";
    await notificationService.notify({
      recipients: [latest.submittedBy.toString()],
      type: notifType,
      title:
        nextStatus === "approved"
          ? "Your submission was approved"
          : nextStatus === "rejected"
            ? "Your submission was rejected"
            : "Changes requested on your submission",
      body: existing.title,
      link: `/tasks?id=${id}`,
    });
    await auditService.record({
      actor: { id: actor.id, role: actor.role },
      action: "submission.review",
      entity: "task",
      entityId: id,
      summary: `${nextStatus.replace("_", " ")} submission v${latest.version} of "${existing.title}"`,
      metadata: { version: latest.version, decision: nextStatus, comment: input.comments },
    });
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action:
        nextStatus === "approved"
          ? "submission.approve"
          : nextStatus === "rejected"
            ? "submission.reject"
            : "submission.changes_requested",
      entity: "task",
      entityId: id,
      summary: `${nextStatus.replace("_", " ")} submission v${latest.version} of "${existing.title}"`,
      metadata: { version: latest.version, comment: input.comments },
    });
    if (nextStatus === "approved") {
      await activityService.record({
        actor: { id: actor.id, role: actor.role },
        action: "task.complete",
        entity: "task",
        entityId: id,
        summary: `Completed task "${existing.title}"`,
      });
    }
    await recomputeProjectProgress(existing.project.toString());
    return toTaskDTO(await loadPopulated(id));
  },

  async getOne(id: string, actor: { id: string; role: Role }) {
    const doc = await loadPopulated(id);
    if (!isManagerial(actor.role)) {
      const project = await projectRepository.findById(
        (doc.project as unknown as { _id: { toString(): string } })._id.toString(),
      );
      const ids = project?.assignedEmployees.map((x) => x.toString()) ?? [];
      const pm = project?.projectManager?.toString();
      if (!ids.includes(actor.id) && pm !== actor.id) {
        throw ApiError.forbidden("You do not have access to this task");
      }
    }
    return toTaskDTO(doc);
  },

  async list(q: ListTasksQuery, actor: { id: string; role: Role }) {
    let assignedTo = q.assignedTo;
    let createdBy = q.createdBy;
    if (q.mine) assignedTo = actor.id;
    if (q.createdByMe) createdBy = actor.id;

    if (!isManagerial(actor.role) && !assignedTo && !createdBy) {
      assignedTo = actor.id;
    }

    const { items, total } = await taskRepository.list({
      ...q,
      assignedTo,
      createdBy,
    });

    if (assignedTo === actor.id) {
      void generateDeadlineReminders(actor.id);
    }

    return {
      items: items.map(toTaskDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};

async function generateDeadlineReminders(userId: string) {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const endToday = new Date(start);
    endToday.setHours(23, 59, 59, 999);
    const tomorrowStart = new Date(start);
    tomorrowStart.setDate(start.getDate() + 1);
    const tomorrowEnd = new Date(endToday);
    tomorrowEnd.setDate(endToday.getDate() + 1);

    const tasks = await taskRepository.model
      .find({
        $or: [{ assignedTo: userId }, { assignees: userId }],
        status: { $ne: "completed" },
        dueDate: { $lte: tomorrowEnd },
      })
      .select("_id title dueDate")
      .exec();

    const { notificationRepository } = await import(
      "../../enterprise/notifications/notification.repository"
    );

    const todayKey = start.toISOString().slice(0, 10);
    for (const t of tasks) {
      if (!t.dueDate) continue;
      let bucket: "overdue" | "today" | "tomorrow";
      let title: string;
      if (t.dueDate < start) {
        bucket = "overdue";
        title = "Task overdue";
      } else if (t.dueDate <= endToday) {
        bucket = "today";
        title = "Task due today";
      } else if (t.dueDate >= tomorrowStart && t.dueDate <= tomorrowEnd) {
        bucket = "tomorrow";
        title = "Task due tomorrow";
      } else {
        continue;
      }
      const dedupeKey = `${t._id.toString()}:${bucket}:${todayKey}`;
      const exists = await notificationRepository.model
        .findOne({ recipient: userId, "metadata.dedupeKey": dedupeKey })
        .select("_id")
        .exec();
      if (exists) continue;
      await notificationRepository.create({
        recipient: userId as never,
        type: "task.assigned",
        title,
        body: t.title,
        link: `/tasks?id=${t._id.toString()}`,
        metadata: { dedupeKey, bucket, taskId: t._id.toString() },
      });
    }
  } catch {
    /* never fail listing because of reminders */
  }
}
