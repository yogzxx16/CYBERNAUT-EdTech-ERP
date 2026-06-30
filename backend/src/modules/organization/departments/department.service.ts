import { ApiError } from "../../../utils/apiError";
import { departmentRepository } from "./department.repository";
import { toDepartmentDTO } from "./department.dto";
import type {
  CreateDepartmentInput,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from "./department.validator";

export const departmentService = {
  async create(input: CreateDepartmentInput, actorId?: string) {
    if (await departmentRepository.existsByName(input.name))
      throw ApiError.conflict("Department name already exists");
    if (await departmentRepository.existsByCode(input.code))
      throw ApiError.conflict("Department code already exists");
    const doc = await departmentRepository.create({
      name: input.name,
      code: input.code.toUpperCase(),
      description: input.description,
      createdBy: actorId as never,
      updatedBy: actorId as never,
    });
    return toDepartmentDTO(doc);
  },

  async update(id: string, input: UpdateDepartmentInput, actorId?: string) {
    const existing = await departmentRepository.findById(id);
    if (!existing) throw ApiError.notFound("Department not found");
    if (input.name && (await departmentRepository.existsByName(input.name, id)))
      throw ApiError.conflict("Department name already exists");
    if (input.code && (await departmentRepository.existsByCode(input.code, id)))
      throw ApiError.conflict("Department code already exists");
    const updated = await departmentRepository.update(id, {
      ...input,
      code: input.code?.toUpperCase(),
      updatedBy: actorId as never,
    });
    return toDepartmentDTO(updated!);
  },

  async archive(id: string, actorId?: string) {
    const doc = await departmentRepository.setStatus(id, "archived", actorId ?? null);
    if (!doc) throw ApiError.notFound("Department not found");
    return toDepartmentDTO(doc);
  },

  async restore(id: string, actorId?: string) {
    const doc = await departmentRepository.setStatus(id, "active", actorId ?? null);
    if (!doc) throw ApiError.notFound("Department not found");
    return toDepartmentDTO(doc);
  },

  async getOne(id: string) {
    const doc = await departmentRepository.findById(id);
    if (!doc) throw ApiError.notFound("Department not found");
    return toDepartmentDTO(doc);
  },

  async list(q: ListDepartmentsQuery) {
    const { items, total } = await departmentRepository.list({
      page: q.page,
      limit: q.limit,
      search: q.search,
      status: q.status,
      sort: q.sort,
    });
    return {
      items: items.map(toDepartmentDTO),
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
    };
  },
};
