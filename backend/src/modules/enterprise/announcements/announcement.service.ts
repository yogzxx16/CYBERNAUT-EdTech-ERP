import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { announcementRepository } from "./announcement.repository";
import { toAnnouncementDTO } from "./announcement.dto";
import type {
  CreateAnnouncementInput,
  ListAnnouncementQuery,
  UpdateAnnouncementInput,
} from "./announcement.validator";
import { userRepository } from "../../auth/repositories/user.repository";
import { notificationService } from "../notifications/notification.service";
import { auditService } from "../audit/audit.service";
import { activityService } from "../activities/activity.service";

async function loadPopulated(id: string) {
  const doc = await announcementRepository.model
    .findById(id)
    .populate("createdBy", "name email role")
    .populate("department", "name code")
    .exec();
  if (!doc) throw ApiError.notFound("Announcement not found");
  return doc;
}

async function recipientIdsFor(audience: string, department?: string | null) {
  const filter: Record<string, unknown> = { accountStatus: "active" };
  if (audience === "admins") filter.role = { $in: ["admin", "super_admin"] };
  else if (audience === "employees") filter.role = "employee";
  else if (audience === "interns") filter.role = "intern";
  else if (audience === "department" && department) filter.department = department;
  const rows = await userRepository.model.find(filter).select("_id").exec();
  return rows.map((r) => r._id.toString());
}

export const announcementService = {
  async list(q: ListAnnouncementQuery, actor: { id: string; role: Role }) {
    const adapted = { ...q };
    if (actor.role !== ROLES.SUPER_ADMIN && actor.role !== ROLES.ADMIN) {
      adapted.status = "published";
    }
    const { items, total } = await announcementRepository.list(adapted);
    return {
      items: items.map(toAnnouncementDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
  async getOne(id: string) {
    return toAnnouncementDTO(await loadPopulated(id));
  },
  async create(input: CreateAnnouncementInput, actor: { id: string; role: Role; name?: string }) {
    const doc = await announcementRepository.create({
      ...input,
      department: input.department ? (input.department as never) : null,
      createdBy: actor.id as never,
      status: "draft",
    });
    return toAnnouncementDTO(await loadPopulated(doc._id.toString()));
  },
  async update(id: string, input: UpdateAnnouncementInput) {
    const patch: Record<string, unknown> = { ...input };
    if (input.department !== undefined) {
      patch.department = input.department ? input.department : null;
    }
    await announcementRepository.update(id, patch as never);
    return toAnnouncementDTO(await loadPopulated(id));
  },
  async publish(id: string, actor: { id: string; role: Role; name?: string }) {
    const existing = await announcementRepository.findById(id);
    if (!existing) throw ApiError.notFound("Announcement not found");
    await announcementRepository.update(id, {
      status: "published",
      publishedAt: new Date(),
    });
    const fresh = await loadPopulated(id);
    const recipients = await recipientIdsFor(
      fresh.audience,
      fresh.department ? fresh.department.toString() : null,
    );
    await notificationService.notify({
      recipients,
      type: "announcement.published",
      title: fresh.title,
      body: fresh.description.slice(0, 240),
      link: "/announcements",
    });
    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "announcement.publish",
      entity: "announcement",
      entityId: id,
      summary: `Published announcement "${fresh.title}"`,
    });
    await activityService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "announcement.publish",
      entity: "announcement",
      entityId: id,
      summary: `Published announcement "${fresh.title}"`,
    });
    return toAnnouncementDTO(fresh);
  },
  async archive(id: string) {
    await announcementRepository.update(id, { status: "archived" });
    return toAnnouncementDTO(await loadPopulated(id));
  },
};
