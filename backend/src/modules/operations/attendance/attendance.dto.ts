import type { AttendanceDoc, AttendanceStatus } from "./attendance.repository";

export interface AttendancePersonDTO {
  id: string;
  name: string;
  email: string;
  role?: string;
  employeeCode?: string;
}

export interface AttendanceDTO {
  id: string;
  employee: AttendancePersonDTO | null;
  date: string;
  checkIn?: string;
  checkOut?: string;
  workingHours: number;
  status: AttendanceStatus;
  notes?: string;
}

function toPerson(u: unknown): AttendancePersonDTO | null {
  const x = u as
    | { _id?: { toString(): string }; name?: string; email?: string; role?: string; employeeCode?: string }
    | null;
  if (!x || !x._id) return null;
  return {
    id: x._id.toString(),
    name: x.name ?? "",
    email: x.email ?? "",
    role: x.role,
    employeeCode: x.employeeCode,
  };
}

function deriveStatus(a: AttendanceDoc): AttendanceStatus {
  if (a.status === "leave") return "leave";
  if (a.checkIn && a.checkOut) return (a.workingHours || 0) >= 7 ? "present" : "half_day";
  if (a.checkIn) return "present";
  return "absent";
}

export function toAttendanceDTO(a: AttendanceDoc): AttendanceDTO {
  return {
    id: a._id.toString(),
    employee: toPerson(a.employee),
    date: a.date.toISOString(),
    checkIn: a.checkIn ? a.checkIn.toISOString() : undefined,
    checkOut: a.checkOut ? a.checkOut.toISOString() : undefined,
    workingHours: a.workingHours,
    status: deriveStatus(a),
    notes: a.notes,
  };
}
