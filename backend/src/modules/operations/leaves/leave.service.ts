import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { leaveRepository } from "./leave.repository";
import { toLeaveDTO } from "./leave.dto";
import { notificationService } from "../../enterprise/notifications/notification.service";
import { activityService } from "../../enterprise/activities/activity.service";
import type {
  CreateLeaveInput,
  DecideLeaveInput,
  ListLeavesQuery,
  UpdateLeaveInput,
} from "./leave.validator";

function isManagerial(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function computeDays(start: Date, end: Date): number {
  const s = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const e = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  return Math.max(1, Math.floor((e.getTime() - s.getTime()) / MS_PER_DAY) + 1);
}

async function loadPopulated(id: string) {
  const doc = await leaveRepository.model
    .findById(id)
    .populate("employee", "name email role employeeCode")
    .populate("approvedBy", "name email role")
    .exec();
  if (!doc) throw ApiError.notFound("Leave request not found");
  return doc;
}

export const leaveService = {
  async create(input: CreateLeaveInput, actor: { id: string; role: Role }) {
    if (input.endDate < input.startDate) throw ApiError.badRequest("End date is before start date");
    const overlap = await leaveRepository.findOverlap(actor.id, input.startDate, input.endDate);
    if (overlap) throw ApiError.conflict("Overlapping leave request already exists");
    const numberOfDays = computeDays(input.startDate, input.endDate);
    const doc = await leaveRepository.create({
      employee: actor.id as never,
      leaveType: input.leaveType,
      reason: input.reason,
      startDate: input.startDate,
      endDate: input.endDate,
      numberOfDays,
      status: "pending",
    });
    return toLeaveDTO(await loadPopulated(doc._id.toString()));
  },

  async update(id: string, input: UpdateLeaveInput, actor: { id: string; role: Role }) {
    const existing = await leaveRepository.findById(id);
    if (!existing) throw ApiError.notFound("Leave request not found");
    if (existing.employee.toString() !== actor.id)
      throw ApiError.forbidden("Cannot edit another user's request");
    if (existing.status !== "pending")
      throw ApiError.badRequest("Only pending requests can be edited");

    const start = input.startDate ?? existing.startDate;
    const end = input.endDate ?? existing.endDate;
    if (end < start) throw ApiError.badRequest("End date is before start date");
    if (input.startDate || input.endDate) {
      const overlap = await leaveRepository.findOverlap(actor.id, start, end, id);
      if (overlap) throw ApiError.conflict("Overlapping leave request already exists");
    }
    const patch: Partial<typeof existing> = { ...input };
    patch.numberOfDays = computeDays(start, end);
    await leaveRepository.update(id, patch);
    return toLeaveDTO(await loadPopulated(id));
  },

  async cancel(id: string, actor: { id: string; role: Role }) {
    const existing = await leaveRepository.findById(id);
    if (!existing) throw ApiError.notFound("Leave request not found");
    if (existing.employee.toString() !== actor.id)
      throw ApiError.forbidden("Cannot cancel another user's request");
    if (existing.status !== "pending")
      throw ApiError.badRequest("Only pending requests can be cancelled");
    await leaveRepository.update(id, { status: "cancelled" });
    return toLeaveDTO(await loadPopulated(id));
  },

  async decide(id: string, input: DecideLeaveInput, actor: { id: string; role: Role }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    const existing = await leaveRepository.findById(id);
    if (!existing) throw ApiError.notFound("Leave request not found");
    if (existing.status !== "pending") throw ApiError.badRequest("Already decided");
    await leaveRepository.update(id, {
      status: input.status,
      approvedBy: actor.id as never,
      approvedAt: new Date(),
      rejectionReason: input.status === "rejected" ? input.rejectionReason : undefined,
    });
    const dto = toLeaveDTO(await loadPopulated(id));
    await notificationService.notify({
      recipients: [existing.employee.toString()],
      type: input.status === "approved" ? "leave.approved" : "leave.rejected",
      title: input.status === "approved" ? "Leave approved" : "Leave rejected",
      body: `${dto.leaveType} · ${dto.numberOfDays} day(s)`,
      link: "/leaves",
    });
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "leave.approve",
      entity: "leave",
      entityId: id,
      summary: `${input.status === "approved" ? "Approved" : "Rejected"} leave request (${dto.numberOfDays} days)`,
      metadata: { status: input.status },
    });
    return dto;
  },

  async getOne(id: string, actor: { id: string; role: Role }) {
    const doc = await loadPopulated(id);
    const empId = (doc.employee as unknown as { _id: { toString(): string } })._id.toString();
    if (!isManagerial(actor.role) && empId !== actor.id) {
      throw ApiError.forbidden("Not accessible");
    }
    return toLeaveDTO(doc);
  },

  async list(q: ListLeavesQuery, actor: { id: string; role: Role }) {
    let employee = q.employee;
    if (q.scope === "mine" || !isManagerial(actor.role)) employee = actor.id;
    const { items, total } = await leaveRepository.list({ ...q, employee });
    return {
      items: items.map(toLeaveDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};
