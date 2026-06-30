import { userRepository, type UserDoc } from "../../auth/repositories/user.repository";
import { counterUtil } from "../../../utils/counter.util";
import { passwordUtil } from "../../../utils/password.util";
import { departmentRepository } from "../departments/department.repository";
import { ApiError } from "../../../utils/apiError";
import { toUserDTO, type CreatedUserDTO, type UserDTO } from "./user.dto";
import type { CreateUserInput, ListUsersQuery, UpdateSelfProfileInput, UpdateUserInput } from "./user.validator";
import type { Role } from "../../../config/constants";

const EMAIL_DOMAIN = "cybernaut.com";

function pad(n: number, width = 4): string {
  return n.toString().padStart(width, "0");
}

async function nextEmployeeCode(): Promise<string> {
  const seq = await counterUtil.next("employee_code");
  return `EMP${pad(seq)}`;
}

async function uniqueEmail(firstName: string, role: Role): Promise<string> {
  const base = `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}.${role.replace(/_/g, "")}`;
  let candidate = `${base}@${EMAIL_DOMAIN}`;
  let i = 0;
  // Cap loop to avoid runaway in pathological cases
  while (await userRepository.emailExists(candidate)) {
    i += 1;
    candidate = `${base}${i}@${EMAIL_DOMAIN}`;
    if (i > 9999) throw ApiError.internal("Unable to generate unique email");
  }
  return candidate;
}

function buildTempPassword(firstName: string, lastName: string, dob: Date): string {
  const fn = firstName.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3).padEnd(3, "x");
  const ln = lastName.toLowerCase().replace(/[^a-z]/g, "").charAt(0) || "x";
  const dd = pad(dob.getUTCDate(), 2);
  const mm = pad(dob.getUTCMonth() + 1, 2);
  return `${fn}${ln}${dd}${mm}`;
}

export const userService = {
  async create(input: CreateUserInput, actorId?: string): Promise<CreatedUserDTO> {
    if (input.department) {
      const dep = await departmentRepository.findById(input.department);
      if (!dep) throw ApiError.badRequest("Invalid department");
    }
    const employeeCode = await nextEmployeeCode();
    const email = await uniqueEmail(input.firstName, input.role as Role);
    const tempPassword = buildTempPassword(input.firstName, input.lastName, input.dob);
    const hashed = await passwordUtil.hash(tempPassword);

    const doc = await userRepository.model.create({
      firstName: input.firstName,
      lastName: input.lastName,
      name: `${input.firstName} ${input.lastName}`.trim(),
      employeeCode,
      email,
      password: hashed,
      phone: input.phone,
      dob: input.dob,
      joiningDate: input.joiningDate,
      department: input.department ?? null,
      role: input.role,
      salary: input.salary,
      profileImage: input.profileImage,
      accountStatus: "active",
      forcePasswordChange: true,
      isActive: true,
      createdBy: actorId ?? null,
      updatedBy: actorId ?? null,
    } as Partial<UserDoc>);

    return { ...toUserDTO(doc), tempPassword };
  },

  async update(id: string, input: UpdateUserInput, actorId?: string): Promise<UserDTO> {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound("User not found");
    if (input.department) {
      const dep = await departmentRepository.findById(input.department);
      if (!dep) throw ApiError.badRequest("Invalid department");
    }
    const patch: Partial<UserDoc> = {
      ...input,
      role: input.role as never,
      department: input.department === null ? null : (input.department as never),
      updatedBy: (actorId ?? null) as never,
    };
    if (input.firstName || input.lastName) {
      patch.name = `${input.firstName ?? user.firstName ?? ""} ${input.lastName ?? user.lastName ?? ""}`.trim();
    }
    const doc = await userRepository.model.findByIdAndUpdate(id, patch, { new: true }).exec();
    return toUserDTO(doc!);
  },

  async setStatus(id: string, status: "active" | "suspended", actorId?: string): Promise<UserDTO> {
    const doc = await userRepository.model
      .findByIdAndUpdate(
        id,
        { accountStatus: status, isActive: status === "active", updatedBy: actorId ?? null },
        { new: true },
      )
      .exec();
    if (!doc) throw ApiError.notFound("User not found");
    return toUserDTO(doc);
  },

  async getOne(id: string): Promise<UserDTO> {
    const doc = await userRepository.findById(id);
    if (!doc) throw ApiError.notFound("User not found");
    return toUserDTO(doc);
  },

  async updateSelf(id: string, input: UpdateSelfProfileInput): Promise<UserDTO> {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound("User not found");
    const patch: Partial<UserDoc> = { ...input };
    if (input.firstName || input.lastName) {
      patch.name = `${input.firstName ?? user.firstName ?? ""} ${input.lastName ?? user.lastName ?? ""}`.trim();
    }
    const doc = await userRepository.model.findByIdAndUpdate(id, patch, { new: true }).exec();
    try {
      const { notificationService } = await import("../../enterprise/notifications/notification.service");
      await notificationService.notify({
        recipients: [id],
        type: "profile.updated",
        title: "Profile updated",
        body: "Your profile changes have been saved.",
        link: "/profile",
      });
    } catch {
      /* non-fatal */
    }
    return toUserDTO(doc!);
  },

  async list(q: ListUsersQuery) {
    const filter: Record<string, unknown> = {};
    if (q.role && q.role !== "all") filter.role = q.role;
    if (q.status && q.status !== "all") filter.accountStatus = q.status;
    if (q.department) filter.department = q.department;
    if (q.search) {
      const rx = new RegExp(q.search.trim(), "i");
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { name: rx },
        { email: rx },
        { employeeCode: rx },
      ];
    }
    const sort: Record<string, 1 | -1> = {};
    if (q.sort) {
      const [field, dir] = q.sort.split(":");
      sort[field] = dir === "asc" ? 1 : -1;
    } else {
      sort.createdAt = -1;
    }
    const [items, total] = await Promise.all([
      userRepository.model
        .find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .exec(),
      userRepository.model.countDocuments(filter).exec(),
    ]);
    return {
      items: items.map(toUserDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};
