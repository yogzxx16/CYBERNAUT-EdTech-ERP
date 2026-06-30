import mongoose from "mongoose";
import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { projectRepository } from "./project.repository";
import { taskRepository } from "../tasks/task.repository";
import { notificationService } from "../../enterprise/notifications/notification.service";
import { auditService } from "../../enterprise/audit/audit.service";
import { activityService } from "../../enterprise/activities/activity.service";
import { toProjectDTO } from "./project.dto";
import {
  fileExtension,
  validateSubmissionPayload,
} from "../../shared/submissions/submission.types";
import type {
  AssignMembersInput,
  CreateProjectInput,
  ListProjectsQuery,
  ReviewProjectInput,
  SubmitProjectInput,
  UpdateProgressInput,
  UpdateProjectInput,
  UpdateStatusInput,
} from "./project.validator";

function isManagerial(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

async function loadPopulated(id: string) {
  const doc = await projectRepository.model
    .findById(id)
    .populate("department", "name code")
    .populate("projectManager", "name email role")
    .populate("assignedEmployees", "name email role")
    .populate("submissions.submittedBy", "name")
    .populate("submissions.reviewedBy", "name")
    .populate("submissions.attachments.uploadedBy", "name")
    .populate("submissions.reviews.reviewer", "name")
    .exec();
  if (!doc) throw ApiError.notFound("Project not found");
  return doc;
}

function ensureMember(
  doc: { assignedEmployees: { toString(): string }[]; projectManager?: { toString(): string } | null },
  userId: string,
) {
  const ids = doc.assignedEmployees.map((x) => x.toString());
  const pm = doc.projectManager?.toString();
  if (!ids.includes(userId) && pm !== userId) {
    throw ApiError.forbidden("You do not have access to this project");
  }
}

async function ensureUniqueTitle(title: string, department: string | undefined | null, excludeId?: string) {
  const filter: Record<string, unknown> = {
    title: new RegExp(`^${title.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    department: department ?? null,
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const exists = await projectRepository.model.findOne(filter).exec();
  if (exists) throw ApiError.conflict("A project with this title already exists in this department");
}

/**
 * Recalculate completionPercentage from task progress.
 * A task counts as "done" when either:
 *   - its latest submission has been approved (submissionStatus === "approved"), OR
 *   - the legacy status is "completed" (covers data created before the submission system).
 */
export async function recomputeProjectProgress(projectId: string) {
  const total = await taskRepository.model.countDocuments({ project: projectId }).exec();
  if (total === 0) return;
  const done = await taskRepository.model
    .countDocuments({
      project: projectId,
      $or: [{ submissionStatus: "approved" }, { status: "completed" }],
    })
    .exec();
  const pct = Math.round((done / total) * 100);
  await projectRepository.model.findByIdAndUpdate(projectId, { completionPercentage: pct }).exec();
}

export const projectService = {
  async create(input: CreateProjectInput, actor: { id: string; role: Role }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    if (!input.projectManager) throw ApiError.badRequest("Project Manager is required");
    await ensureUniqueTitle(input.title, input.department ?? null);
    const doc = await projectRepository.create({
      ...input,
      department: input.department as never,
      projectManager: input.projectManager as never,
      assignedEmployees: (input.assignedEmployees ?? []) as never,
      submissionStatus: "none",
      createdBy: actor.id as never,
      updatedBy: actor.id as never,
    });
    const dto = toProjectDTO(await loadPopulated(doc._id.toString()));
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "project.create",
      entity: "project",
      entityId: dto.id,
      summary: `Created project "${dto.title}"`,
    });
    return dto;
  },

  async update(id: string, input: UpdateProjectInput, actor: { id: string; role: Role }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    const existing = await projectRepository.findById(id);
    if (!existing) throw ApiError.notFound("Project not found");
    if (input.title) {
      const dep =
        input.department !== undefined ? input.department : existing.department?.toString() ?? null;
      await ensureUniqueTitle(input.title, dep, id);
    }
    const patch: Partial<UpdateProjectInput> = { ...input };
    if (patch.completionPercentage !== undefined && actor.role !== ROLES.SUPER_ADMIN) {
      delete patch.completionPercentage;
    }
    const doc = await projectRepository.update(id, {
      ...patch,
      department: patch.department as never,
      projectManager: patch.projectManager as never,
      assignedEmployees: patch.assignedEmployees as never,
      updatedBy: actor.id as never,
    });
    if (!doc) throw ApiError.notFound("Project not found");
    const dto = toProjectDTO(await loadPopulated(id));
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "project.update",
      entity: "project",
      entityId: id,
      summary: `Updated project "${dto.title}"`,
    });
    return dto;
  },

  async archive(id: string, actor: { id: string; role: Role }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    const doc = await projectRepository.update(id, {
      status: "archived",
      updatedBy: actor.id as never,
    });
    if (!doc) throw ApiError.notFound("Project not found");
    return toProjectDTO(await loadPopulated(id));
  },

  async assign(id: string, input: AssignMembersInput, actor: { id: string; role: Role }) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw ApiError.notFound("Project not found");
    const isPM = existing.projectManager?.toString() === actor.id;
    if (!isManagerial(actor.role) && !isPM) throw ApiError.forbidden("Insufficient role");
    const doc = await projectRepository.addMembers(id, input.userIds);
    if (!doc) throw ApiError.notFound("Project not found");
    return toProjectDTO(await loadPopulated(id));
  },

  async removeMember(id: string, userId: string, actor: { id: string; role: Role }) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw ApiError.notFound("Project not found");
    const isPM = existing.projectManager?.toString() === actor.id;
    if (!isManagerial(actor.role) && !isPM) throw ApiError.forbidden("Insufficient role");
    const doc = await projectRepository.removeMember(id, userId);
    if (!doc) throw ApiError.notFound("Project not found");
    return toProjectDTO(await loadPopulated(id));
  },

  async updateProgress(id: string, input: UpdateProgressInput, actor: { id: string; role: Role }) {
    if (actor.role !== ROLES.SUPER_ADMIN) {
      throw ApiError.forbidden(
        "Progress is auto-calculated from approved task submissions. Only Super Admin can override.",
      );
    }
    const existing = await projectRepository.findById(id);
    if (!existing) throw ApiError.notFound("Project not found");
    const doc = await projectRepository.update(id, {
      completionPercentage: input.completionPercentage,
      updatedBy: actor.id as never,
    });
    return toProjectDTO(await loadPopulated(doc!._id.toString()));
  },

  async updateStatus(id: string, input: UpdateStatusInput, actor: { id: string; role: Role }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    const doc = await projectRepository.update(id, {
      status: input.status,
      updatedBy: actor.id as never,
    });
    if (!doc) throw ApiError.notFound("Project not found");
    return toProjectDTO(await loadPopulated(id));
  },

  /** Submit (or resubmit) project deliverables. PM, Admin, Super Admin, or members can submit. */
  async submit(id: string, input: SubmitProjectInput, actor: { id: string; role: Role }) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw ApiError.notFound("Project not found");
    if (!isManagerial(actor.role)) ensureMember(existing, actor.id);
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
    existing.updatedBy = actorOid as never;
    await existing.save();

    const reviewers = new Set<string>();
    if (existing.projectManager) reviewers.add(existing.projectManager.toString());
    await notificationService.notify({
      recipients: Array.from(reviewers),
      type: "task.assigned",
      title: "Project submitted for review",
      body: existing.title,
      link: `/projects?id=${id}`,
    });
    if (enrichedAttachments.length > 0) {
      await notificationService.notify({
        recipients: Array.from(reviewers),
        type: "file.uploaded",
        title: `${enrichedAttachments.length} file${enrichedAttachments.length > 1 ? "s" : ""} uploaded`,
        body: `${existing.title} · v${nextVersion}`,
        link: `/projects?id=${id}`,
      });
    }
    await auditService.record({
      actor: { id: actor.id, role: actor.role },
      action: "submission.create",
      entity: "project",
      entityId: id,
      summary: `Submitted project "${existing.title}" v${nextVersion}`,
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
      entity: "project",
      entityId: id,
      summary: `Submitted project "${existing.title}" (v${nextVersion})`,
      metadata: { version: nextVersion, attachments: enrichedAttachments.length },
    });
    return toProjectDTO(await loadPopulated(id));
  },

  /** Approve / reject / request changes on the latest project submission. Re-review allowed; history appended. */
  async review(id: string, input: ReviewProjectInput, actor: { id: string; role: Role }) {
    const existing = await projectRepository.findById(id);
    if (!existing) throw ApiError.notFound("Project not found");
    const isPM = existing.projectManager?.toString() === actor.id;
    if (!isManagerial(actor.role) && !isPM) {
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
    if (nextStatus === "approved") existing.status = "completed";
    existing.updatedBy = reviewerOid as never;
    await existing.save();

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
          ? "Project submission approved"
          : nextStatus === "rejected"
            ? "Project submission rejected"
            : "Changes requested on project submission",
      body: existing.title,
      link: `/projects?id=${id}`,
    });
    if (nextStatus === "approved") {
      const members = new Set<string>([
        ...(existing.assignedEmployees ?? []).map((u) => u.toString()),
        existing.projectManager ? existing.projectManager.toString() : "",
      ]);
      members.delete("");
      await notificationService.notify({
        recipients: Array.from(members),
        type: "project.completed",
        title: "Project completed",
        body: existing.title,
        link: `/projects?id=${id}`,
      });
      await activityService.record({
        actor: { id: actor.id, role: actor.role },
        action: "project.complete",
        entity: "project",
        entityId: id,
        summary: `Completed project "${existing.title}"`,
      });
    }
    await auditService.record({
      actor: { id: actor.id, role: actor.role },
      action: "submission.review",
      entity: "project",
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
      entity: "project",
      entityId: id,
      summary: `${nextStatus.replace("_", " ")} submission v${latest.version} of "${existing.title}"`,
      metadata: { version: latest.version, comment: input.comments },
    });
    return toProjectDTO(await loadPopulated(id));
  },

  async getOne(id: string, actor: { id: string; role: Role }) {
    const doc = await loadPopulated(id);
    if (!isManagerial(actor.role)) ensureMember(doc, actor.id);
    return toProjectDTO(doc);
  },

  async list(q: ListProjectsQuery, actor: { id: string; role: Role }) {
    const scopedMember = isManagerial(actor.role) ? q.member : actor.id;
    const { items, total } = await projectRepository.list({ ...q, member: scopedMember });
    return {
      items: items.map(toProjectDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};
