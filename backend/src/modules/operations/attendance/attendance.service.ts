import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { attendanceRepository, type AttendanceDoc, type AttendanceStatus } from "./attendance.repository";
import { toAttendanceDTO } from "./attendance.dto";
import { activityService } from "../../enterprise/activities/activity.service";
import type {
  CheckInInput,
  CheckOutInput,
  ListAttendanceQuery,
  MarkAttendanceInput,
  SummaryQuery,
} from "./attendance.validator";

function isManagerial(role: Role): boolean {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function hoursBetween(a: Date, b: Date): number {
  const diff = (b.getTime() - a.getTime()) / (60 * 60 * 1000);
  return Math.max(0, Math.round(diff * 100) / 100);
}

function statusFromHours(h: number): "present" | "half_day" {
  // A completed attendance record (checked in + out) must never be "absent".
  // Business rule: >=7h => present, otherwise half_day.
  if (h >= 7) return "present";
  return "half_day";
}

function deriveStatus(a: {
  status: AttendanceStatus;
  checkIn?: Date | null;
  checkOut?: Date | null;
  workingHours: number;
}): AttendanceStatus {
  if (a.status === "leave") return "leave";
  if (a.checkIn && a.checkOut) return a.workingHours >= 7 ? "present" : "half_day";
  if (a.checkIn) return "present";
  return "absent";
}

async function loadPopulated(id: string) {
  return attendanceRepository.model
    .findById(id)
    .populate("employee", "name email role employeeCode")
    .exec();
}

export const attendanceService = {
  async checkIn(input: CheckInInput, actor: { id: string; role: Role }) {
    const now = input.at ?? new Date();
    const day = startOfDayUTC(now);
    const existing = await attendanceRepository.findForDay(actor.id, day);
    if (existing?.checkIn) throw ApiError.conflict("Already checked in today");
    const doc = await attendanceRepository.upsert(actor.id, day, {
      checkIn: now,
      notes: input.notes,
      status: existing?.status ?? "present",
    });
    const dto = toAttendanceDTO((await loadPopulated(doc._id.toString()))!);
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "attendance.mark",
      entity: "attendance",
      entityId: doc._id.toString(),
      summary: `Checked in at ${now.toISOString().slice(11, 16)}`,
    });
    return dto;
  },

  async checkOut(input: CheckOutInput, actor: { id: string; role: Role }) {
    const now = input.at ?? new Date();
    const day = startOfDayUTC(now);
    const existing = await attendanceRepository.findForDay(actor.id, day);
    if (!existing?.checkIn) throw ApiError.badRequest("You have not checked in today");
    if (existing.checkOut) throw ApiError.conflict("Already checked out");
    const workingHours = hoursBetween(existing.checkIn, now);
    const status = statusFromHours(workingHours);
    const doc = await attendanceRepository.upsert(actor.id, day, {
      checkOut: now,
      workingHours,
      status,
    });
    return toAttendanceDTO((await loadPopulated(doc._id.toString()))!);
  },

  async mark(input: MarkAttendanceInput, actor: { id: string; role: Role }) {
    if (!isManagerial(actor.role)) throw ApiError.forbidden("Insufficient role");
    const day = startOfDayUTC(input.date);
    let workingHours = 0;
    if (input.checkIn && input.checkOut) workingHours = hoursBetween(input.checkIn, input.checkOut);
    const patch: Partial<AttendanceDoc> = {
      status: input.status,
      checkIn: input.checkIn ?? null,
      checkOut: input.checkOut ?? null,
      workingHours,
      notes: input.notes,
    };
    const doc = await attendanceRepository.upsert(input.employee, day, patch);
    const dto = toAttendanceDTO((await loadPopulated(doc._id.toString()))!);
    await activityService.record({
      actor: { id: actor.id, role: actor.role },
      action: "attendance.mark",
      entity: "attendance",
      entityId: doc._id.toString(),
      summary: `Marked attendance (${input.status})`,
      metadata: { employee: input.employee, date: day.toISOString() },
    });
    return dto;
  },

  async today(actor: { id: string }) {
    const day = startOfDayUTC(new Date());
    const doc = await attendanceRepository.findForDay(actor.id, day);
    if (!doc) return null;
    return toAttendanceDTO((await loadPopulated(doc._id.toString()))!);
  },

  async list(q: ListAttendanceQuery, actor: { id: string; role: Role }) {
    let employee = q.employee;
    if (q.scope === "mine" || !isManagerial(actor.role)) employee = actor.id;
    const { items, total } = await attendanceRepository.list({ ...q, employee });
    return {
      items: items.map(toAttendanceDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },

  async summary(q: SummaryQuery, actor: { id: string; role: Role }) {
    const employee = isManagerial(actor.role) && q.employee ? q.employee : actor.id;
    const from = startOfDayUTC(q.from);
    const to = startOfDayUTC(q.to);
    const items = await attendanceRepository.model
      .find({ employee, date: { $gte: from, $lte: to } })
      .sort({ date: 1 })
      .exec();
    const summary = { present: 0, absent: 0, half_day: 0, leave: 0, hours: 0 };
    for (const a of items) {
      // Derive status fresh from the record so stale persisted statuses can't skew totals.
      const s = deriveStatus({
        status: a.status,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        workingHours: a.workingHours || 0,
      });
      summary[s] += 1;
      summary.hours += a.workingHours || 0;
    }
    summary.hours = Math.round(summary.hours * 100) / 100;
    return {
      employee,
      from: from.toISOString(),
      to: to.toISOString(),
      summary,
      records: items.map(toAttendanceDTO),
    };
  },
};
