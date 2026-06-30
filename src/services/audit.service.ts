import { api } from "./api";
import type { PaginatedResponse } from "./departments.service";

export interface AuditLog {
  id: string;
  actor: { id: string; name: string; email: string; role?: string } | null;
  actorName?: string;
  actorRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditListParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  actor?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  async list(params: AuditListParams = {}) {
    const res = await api.get<PaginatedResponse<AuditLog>>("/audit-logs", { params });
    return res.data;
  },
};
