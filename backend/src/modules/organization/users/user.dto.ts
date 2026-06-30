import type { UserDoc } from "../../auth/repositories/user.repository";

export interface UserDTO {
  id: string;
  firstName?: string;
  lastName?: string;
  name: string;
  employeeCode?: string;
  email: string;
  phone?: string;
  dob?: string;
  joiningDate?: string;
  department?: string | null;
  role: string;
  designation?: string;
  address?: string;
  bio?: string;
  salary?: number;
  profileImage?: string;
  accountStatus: string;
  forcePasswordChange: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedUserDTO extends UserDTO {
  tempPassword: string;
}

export function toUserDTO(u: UserDoc): UserDTO {
  return {
    id: u._id.toString(),
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    employeeCode: u.employeeCode,
    email: u.email,
    phone: u.phone,
    dob: u.dob?.toISOString(),
    joiningDate: u.joiningDate?.toISOString(),
    department: u.department ? u.department.toString() : null,
    role: u.role,
    designation: u.designation,
    address: u.address,
    bio: u.bio,
    salary: u.salary,
    profileImage: u.profileImage,
    accountStatus: u.accountStatus,
    forcePasswordChange: u.forcePasswordChange,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
