import { Types } from "mongoose";
import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { discussionRepository } from "./discussion.repository";
import { toDiscussionDTO } from "./discussion.dto";
import type {
  CreateDiscussionInput,
  EditMessageInput,
  ListDiscussionQuery,
  ParticipantsInput,
  PostMessageInput,
  UpdateDiscussionInput,
} from "./discussion.validator";
import { notificationService } from "../notifications/notification.service";
import { activityService } from "../activities/activity.service";

function isManagerial(role: Role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

async function loadPopulated(id: string) {
  const doc = await discussionRepository.model
    .findById(id)
    .populate("project", "title")
    .populate("createdBy", "name email role")
    .populate("participants", "name email role")
    .populate("messages.author", "name email role")
    .exec();
  if (!doc) throw ApiError.notFound("Discussion not found");
  return doc;
}

function participantIds(doc: { participants: unknown[]; createdBy?: unknown }): string[] {
  const ids = new Set<string>();
  for (const p of doc.participants) {
    const x = p as { _id?: { toString(): string } } | string;
    if (typeof x === "string") ids.add(x);
    else if (x?._id) ids.add(x._id.toString());
  }
  const c = doc.createdBy as { _id?: { toString(): string } } | string | undefined | null;
  if (c) {
    if (typeof c === "string") ids.add(c);
    else if (c._id) ids.add(c._id.toString());
  }
  return [...ids];
}

function assertParticipant(doc: { participants: unknown[]; createdBy?: unknown }, userId: string, role: Role) {
  if (isManagerial(role)) return;
  if (!participantIds(doc).includes(userId)) throw ApiError.forbidden("Not a participant");
}

export const discussionService = {
  async list(q: ListDiscussionQuery, actor: { id: string; role: Role }) {
    const adapted = { ...q };
    if (q.scope === "mine" || !isManagerial(actor.role)) adapted.participant = actor.id;
    const { items, total } = await discussionRepository.list(adapted);
    return {
      items: items.map((d) => toDiscussionDTO(d)),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },

  async getOne(id: string, actor: { id: string; role: Role }) {
    const doc = await loadPopulated(id);
    assertParticipant(doc, actor.id, actor.role);
    return toDiscussionDTO(doc, true);
  },

  async create(input: CreateDiscussionInput, actor: { id: string; role: Role; name?: string }) {
    const participants = new Set<string>([actor.id, ...input.participants]);
    const doc = await discussionRepository.create({
      title: input.title,
      description: input.description,
      project: input.project ? (input.project as never) : null,
      createdBy: actor.id as never,
      participants: [...participants].map((p) => new Types.ObjectId(p) as never),
      attachments: input.attachments,
      messages: [],
    });
    const fresh = await loadPopulated(doc._id.toString());
    return toDiscussionDTO(fresh, true);
  },

  async update(id: string, input: UpdateDiscussionInput, actor: { id: string; role: Role }) {
    const existing = await discussionRepository.findById(id);
    if (!existing) throw ApiError.notFound("Discussion not found");
    if (!isManagerial(actor.role) && existing.createdBy?.toString() !== actor.id) {
      throw ApiError.forbidden("Only the owner can edit");
    }
    await discussionRepository.update(id, input as never);
    return toDiscussionDTO(await loadPopulated(id), true);
  },

  async setParticipants(id: string, input: ParticipantsInput, actor: { id: string; role: Role }) {
    const existing = await discussionRepository.findById(id);
    if (!existing) throw ApiError.notFound("Discussion not found");
    if (!isManagerial(actor.role) && existing.createdBy?.toString() !== actor.id) {
      throw ApiError.forbidden("Only the owner can assign participants");
    }
    const ids = Array.from(new Set([actor.id, ...input.participants]));
    await discussionRepository.update(id, {
      participants: ids.map((p) => new Types.ObjectId(p) as never),
    });
    return toDiscussionDTO(await loadPopulated(id), true);
  },

  async postMessage(id: string, input: PostMessageInput, actor: { id: string; role: Role; name?: string }) {
    const existing = await loadPopulated(id);
    if (existing.closed) throw ApiError.badRequest("Discussion is closed");
    assertParticipant(existing, actor.id, actor.role);
    existing.messages.push({
      author: new Types.ObjectId(actor.id),
      body: input.body,
      attachments: input.attachments,
      editedAt: null,
    } as never);
    await existing.save();
    const fresh = await loadPopulated(id);
    const targets = participantIds(fresh).filter((u) => u !== actor.id);
    await notificationService.notify({
      recipients: targets,
      type: "discussion.message",
      title: `New message in "${fresh.title}"`,
      body: `${actor.name ?? "A teammate"}: ${input.body.slice(0, 120)}`,
      link: "/discussions",
    });
    await activityService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "discussion.post",
      entity: "discussion",
      entityId: id,
      summary: `Posted in "${fresh.title}"`,
    });
    return toDiscussionDTO(fresh, true);
  },

  async editMessage(
    id: string,
    messageId: string,
    input: EditMessageInput,
    actor: { id: string; role: Role },
  ) {
    const existing = await discussionRepository.findById(id);
    if (!existing) throw ApiError.notFound("Discussion not found");
    const msg = (existing.messages as unknown as { id: (id: string) => unknown }).id(messageId) as
      | { author: { toString(): string }; body: string; editedAt: Date | null }
      | null;
    if (!msg) throw ApiError.notFound("Message not found");
    if (msg.author.toString() !== actor.id) {
      throw ApiError.forbidden("Cannot edit another user's message");
    }
    msg.body = input.body;
    msg.editedAt = new Date();
    await existing.save();
    return toDiscussionDTO(await loadPopulated(id), true);
  },
};
