import { Types } from "mongoose";
import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { ticketRepository } from "./ticket.repository";
import { toTicketDTO } from "./ticket.dto";
import type {
  AssignTicketInput,
  CreateTicketInput,
  ListTicketQuery,
  ReplyTicketInput,
} from "./ticket.validator";
import { counterUtil } from "../../../utils/counter.util";
import { notificationService } from "../notifications/notification.service";
import { auditService } from "../audit/audit.service";
import { activityService } from "../activities/activity.service";

function isManagerial(role: Role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

async function loadPopulated(id: string) {
  const doc = await ticketRepository.model
    .findById(id)
    .populate("raisedBy", "name email role employeeCode")
    .populate("assignedTo", "name email role")
    .populate("conversation.author", "name email role")
    .exec();
  if (!doc) throw ApiError.notFound("Ticket not found");
  return doc;
}

function ownerId(doc: { raisedBy: unknown }): string {
  const x = doc.raisedBy as { _id?: { toString(): string }; toString?: () => string };
  if (x?._id) return x._id.toString();
  if (typeof x?.toString === "function") return x.toString();
  return "";
}

function assertVisibility(doc: { raisedBy: unknown; assignedTo?: unknown }, actor: { id: string; role: Role }) {
  if (isManagerial(actor.role)) return;
  const owner = ownerId({ raisedBy: doc.raisedBy });
  const assigned = doc.assignedTo as { _id?: { toString(): string } } | null;
  const assignedId = assigned?._id?.toString();
  if (owner !== actor.id && assignedId !== actor.id) throw ApiError.forbidden("Not allowed");
}

export const ticketService = {
  async list(q: ListTicketQuery, actor: { id: string; role: Role }) {
    const adapted: ListTicketQuery & { raisedBy?: string; assignedTo?: string } = { ...q };
    if (!isManagerial(actor.role)) adapted.raisedBy = actor.id;
    else if (q.scope === "mine") adapted.raisedBy = actor.id;
    else if (q.scope === "assigned") adapted.assignedTo = actor.id;
    const { items, total } = await ticketRepository.list(adapted);
    return {
      items: items.map((t) => toTicketDTO(t)),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },

  async getOne(id: string, actor: { id: string; role: Role }) {
    const doc = await loadPopulated(id);
    assertVisibility(doc, actor);
    return toTicketDTO(doc, true);
  },

  async create(input: CreateTicketInput, actor: { id: string; role: Role; name?: string }) {
    const seq = await counterUtil.next("supportTicket");
    const ticketNumber = `TKT${seq.toString().padStart(5, "0")}`;
    const doc = await ticketRepository.create({
      ticketNumber,
      subject: input.subject,
      description: input.description,
      category: input.category,
      priority: input.priority,
      status: "open",
      raisedBy: actor.id as never,
      conversation: [
        {
          author: new Types.ObjectId(actor.id),
          body: input.description,
          internal: false,
        } as never,
      ],
    });
    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "ticket.create",
      entity: "ticket",
      entityId: doc._id.toString(),
      summary: `Ticket ${ticketNumber} raised: ${input.subject}`,
    });
    return toTicketDTO(await loadPopulated(doc._id.toString()), true);
  },

  async reply(id: string, input: ReplyTicketInput, actor: { id: string; role: Role; name?: string }) {
    const existing = await ticketRepository.findById(id);
    if (!existing) throw ApiError.notFound("Ticket not found");
    const ownerStr = existing.raisedBy.toString();
    const assignedStr = existing.assignedTo?.toString();
    if (!isManagerial(actor.role) && ownerStr !== actor.id && assignedStr !== actor.id) {
      throw ApiError.forbidden("Not allowed");
    }
    if (existing.status === "closed") throw ApiError.badRequest("Ticket is closed");
    existing.conversation.push({
      author: new Types.ObjectId(actor.id),
      body: input.body,
      internal: !!input.internal && isManagerial(actor.role),
    } as never);
    if (existing.status === "open" && isManagerial(actor.role)) existing.status = "in_progress";
    await existing.save();
    const target = ownerStr === actor.id ? assignedStr : ownerStr;
    if (target && !input.internal) {
      await notificationService.notify({
        recipients: [target],
        type: "ticket.update",
        title: `Ticket ${existing.ticketNumber} updated`,
        body: input.body.slice(0, 200),
        link: "/support",
      });
    }
    return toTicketDTO(await loadPopulated(id), true);
  },

  async assign(id: string, input: AssignTicketInput, actor: { id: string; role: Role; name?: string }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    const existing = await ticketRepository.findById(id);
    if (!existing) throw ApiError.notFound("Ticket not found");
    await ticketRepository.update(id, {
      assignedTo: input.assignedTo as never,
      status: existing.status === "open" ? "in_progress" : existing.status,
    });
    await notificationService.notify({
      recipients: [input.assignedTo],
      type: "ticket.update",
      title: `Ticket ${existing.ticketNumber} assigned to you`,
      body: existing.subject,
      link: "/support",
    });
    return toTicketDTO(await loadPopulated(id), true);
  },

  async close(id: string, actor: { id: string; role: Role; name?: string }) {
    const existing = await ticketRepository.findById(id);
    if (!existing) throw ApiError.notFound("Ticket not found");
    if (!isManagerial(actor.role) && existing.raisedBy.toString() !== actor.id) {
      throw ApiError.forbidden("Not allowed");
    }
    await ticketRepository.update(id, { status: "closed", closedAt: new Date() });
    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "ticket.close",
      entity: "ticket",
      entityId: id,
      summary: `Ticket ${existing.ticketNumber} closed`,
    });
    await notificationService.notify({
      recipients: [existing.raisedBy.toString()],
      type: "ticket.resolved",
      title: `Ticket ${existing.ticketNumber} resolved`,
      body: existing.subject,
      link: "/support",
    });
    await activityService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "ticket.resolve",
      entity: "ticket",
      entityId: id,
      summary: `Resolved ticket ${existing.ticketNumber}`,
    });
    return toTicketDTO(await loadPopulated(id), true);
  },

  async reopen(id: string, actor: { id: string; role: Role }) {
    const existing = await ticketRepository.findById(id);
    if (!existing) throw ApiError.notFound("Ticket not found");
    if (!isManagerial(actor.role) && existing.raisedBy.toString() !== actor.id) {
      throw ApiError.forbidden("Not allowed");
    }
    await ticketRepository.update(id, {
      status: "open",
      reopenedAt: new Date(),
      closedAt: null,
    });
    return toTicketDTO(await loadPopulated(id), true);
  },
};
