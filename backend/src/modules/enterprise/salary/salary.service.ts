import { ApiError } from "../../../utils/apiError";
import { ROLES, type Role } from "../../../config/constants";
import { salaryRepository } from "./salary.repository";
import { toSalaryDTO } from "./salary.dto";
import type { GenerateSalaryInput, ListSalaryQuery } from "./salary.validator";
import { userRepository } from "../../auth/repositories/user.repository";
import { counterUtil } from "../../../utils/counter.util";
import { auditService } from "../audit/audit.service";
import { notificationService } from "../notifications/notification.service";
import { activityService } from "../activities/activity.service";
import { Types } from "mongoose";

function isManagerial(role: Role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN;
}

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

async function loadPopulated(id: string) {
  const doc = await salaryRepository.model
    .findById(id)
    .populate("employee", "name email role employeeCode")
    .populate("generatedBy", "name email role")
    .exec();
  if (!doc) throw ApiError.notFound("Salary slip not found");
  return doc;
}

export const salaryService = {
  async list(q: ListSalaryQuery, actor: { id: string; role: Role }) {
    const adapted = { ...q };
    if (!isManagerial(actor.role) || q.scope === "mine") adapted.employee = actor.id;
    const { items, total } = await salaryRepository.list(adapted);
    return {
      items: items.map(toSalaryDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },

  async getOne(id: string, actor: { id: string; role: Role }) {
    const doc = await loadPopulated(id);
    const empId = (doc.employee as unknown as { _id: { toString(): string } })._id.toString();
    if (!isManagerial(actor.role) && empId !== actor.id) throw ApiError.forbidden("Not allowed");
    return toSalaryDTO(doc);
  },

  async generate(input: GenerateSalaryInput, actor: { id: string; role: Role; name?: string }) {
    const employeeId = input.employeeId ?? input.employee;
    if (!employeeId || !Types.ObjectId.isValid(employeeId)) {
      throw ApiError.badRequest("Valid employee is required");
    }

    const employee = await userRepository.findById(employeeId);
    if (!employee) throw ApiError.notFound("Employee not found");
    const employeeObjectId = employee._id;
    if (!employeeObjectId) throw ApiError.badRequest("Valid employee is required");

    const existing = await salaryRepository.findExisting(employeeObjectId, input.month, input.year);
    if (existing) throw ApiError.conflict("Salary slip already exists for this period");

    const baseSalary = input.baseSalary ?? employee.salary ?? 0;
    if (baseSalary <= 0) throw ApiError.badRequest("Base salary is required");

    const workingDays = input.workingDays;
    const perDay = baseSalary / workingDays;
    const leaveDeduction = Math.max(0, Math.round(perDay * input.leaveDays * 100) / 100);
    const netSalary = Math.max(0, Math.round((baseSalary - leaveDeduction - input.deductions + input.bonus) * 100) / 100);

    const seq = await counterUtil.next(`salary-${input.year}-${input.month}`);
    const slipNumber = `SAL-${input.year}-${String(input.month).padStart(2, "0")}-${String(seq).padStart(4, "0")}`;

    let doc;
    try {
      doc = await salaryRepository.create({
        slipNumber,
        employee: employeeObjectId as never,
        employeeId: employeeObjectId as never,
        month: input.month,
        year: input.year,
        baseSalary,
        workingDays,
        leaveDays: input.leaveDays,
        leaveDeduction,
        deductions: input.deductions,
        bonus: input.bonus,
        netSalary,
        remarks: input.remarks,
        status: "finalized",
        generatedBy: actor.id as never,
        generatedAt: new Date(),
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const duplicate = await salaryRepository.findExisting(employeeObjectId, input.month, input.year);
        if (duplicate) throw ApiError.conflict("Salary slip already exists for this period");
      }
      throw error;
    }

    await auditService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "salary.generate",
      entity: "salary",
      entityId: doc._id.toString(),
      summary: `Salary slip ${slipNumber} generated for ${employee.name}`,
      metadata: { netSalary, month: input.month, year: input.year },
    });

    await notificationService.notify({
      recipients: [employee._id.toString()],
      type: "salary.generated",
      title: `Salary slip ${slipNumber} is ready`,
      body: `${input.month}/${input.year} · Net ${netSalary}`,
      link: "/salary-slips",
    });

    await activityService.record({
      actor: { id: actor.id, name: actor.name, role: actor.role },
      action: "salary.generate",
      entity: "salary",
      entityId: doc._id.toString(),
      summary: `Generated salary slip ${slipNumber} for ${employee.name}`,
      metadata: { netSalary, month: input.month, year: input.year },
    });

    return toSalaryDTO(await loadPopulated(doc._id.toString()));
  },
};
