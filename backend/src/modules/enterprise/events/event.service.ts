import { Types } from "mongoose";
import { ApiError } from "../../../utils/apiError";
import { type Role } from "../../../config/constants";
import { eventRepository } from "./event.repository";
import { toEventDTO } from "./event.dto";
import type {
  CreateEventInput,
  ListEventQuery,
  RSVPInput,
  UpdateEventInput,
} from "./event.validator";
import { notificationService } from "../notifications/notification.service";
import { auditService } from "../audit/audit.service";
import { activityService } from "../activities/activity.service";

async function loadPopulated(id: string) {
  const doc = await eventRepository.model
    .findById(id)
    .populate("organizer", "name email role")
    .populate("participants", "name email role")
    .exec();
  if (!doc) throw ApiError.notFound("Event not found");
  return doc;
}

export const eventService = {
  async list(q: ListEventQuery) {
    const { items, total } = await eventRepository.list(q);
    return {
      items: items.map(toEventDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
  async getOne(id: string) {
    return toEventDTO(await loadPopulated(id));
  },
  async create(input: CreateEventInput, actor: { id: string; role: Role; name?: string }) {
    const doc = await eventRepository.create({
      title: input.title,
      description: input.description,
      venue: input.venue,
      eventDate: input.eventDate,
      endDate: input.endDate ?? null,
      organizer: actor.id as never,
      participants: input.participants.map((p) => new Types.ObjectId(p) as never),
      status: "scheduled",
    });
    const fresh = await loadPopulated(doc._id.toString());
    await notificationService.notify({
      recipients: input.participants,
      type: "event.created",
      title: `New event: ${fresh.title}`,
      body: `${fresh.eventDate.toDateString()} ${fresh.venue ?? ""}`.trim(),
      link: "/events",
    });
    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "event.create",
      entity: "event",
      entityId: doc._id.toString(),
      summary: `Created event "${fresh.title}"`,
    });
    await activityService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "event.create",
      entity: "event",
      entityId: doc._id.toString(),
      summary: `Created event "${fresh.title}"`,
    });
    return toEventDTO(fresh);
  },
  async update(id: string, input: UpdateEventInput, actor: { id: string; role: Role; name?: string }) {
    const existing = await eventRepository.findById(id);
    if (!existing) throw ApiError.notFound("Event not found");
    // Manager can only edit events they organize; admins/super_admin can edit all.
    const canManageAll = actor.role === "super_admin" || actor.role === "admin";
    if (!canManageAll && existing.organizer?.toString() !== actor.id) {
      throw ApiError.forbidden("You can only edit events you organize");
    }
    const patch: Record<string, unknown> = { ...input };
    if (input.participants) {
      patch.participants = input.participants.map((p) => new Types.ObjectId(p));
    }
    await eventRepository.update(id, patch);
    const fresh = await loadPopulated(id);
    await notificationService.notify({
      recipients: fresh.participants.map((p) => (p as unknown as { _id: { toString(): string } })._id.toString()),
      type: input.status === "cancelled" ? "event.cancelled" : "event.updated",
      title: input.status === "cancelled" ? `Event cancelled: ${fresh.title}` : `Event updated: ${fresh.title}`,
      body: `${fresh.eventDate.toDateString()} ${fresh.venue ?? ""}`.trim(),
      link: "/events",
    });
    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: input.status === "cancelled" ? "event.cancel" : "event.update",
      entity: "event",
      entityId: id,
      summary: `Updated event "${fresh.title}"`,
    });
    return toEventDTO(fresh);
  },
  async remove(id: string, actor: { id: string; role: Role; name?: string }) {
    const existing = await eventRepository.findById(id);
    if (!existing) throw ApiError.notFound("Event not found");
    const canManageAll = actor.role === "super_admin" || actor.role === "admin";
    if (!canManageAll && existing.organizer?.toString() !== actor.id) {
      throw ApiError.forbidden("You can only delete events you organize");
    }
    await eventRepository.model.findByIdAndDelete(id).exec();
    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "event.delete",
      entity: "event",
      entityId: id,
      summary: `Deleted event "${existing.title}"`,
    });
    return { ok: true };
  },
  async rsvp(id: string, input: RSVPInput, actor: { id: string }) {
    const doc = await eventRepository.findById(id);
    if (!doc) throw ApiError.notFound("Event not found");
    const existing = doc.rsvps.find((r) => r.user.toString() === actor.id);
    if (existing) {
      existing.status = input.status;
      existing.respondedAt = new Date();
    } else {
      doc.rsvps.push({
        user: new Types.ObjectId(actor.id),
        status: input.status,
        respondedAt: new Date(),
      });
    }
    await doc.save();
    return toEventDTO(await loadPopulated(id));
  },
};
