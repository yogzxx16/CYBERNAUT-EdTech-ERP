import { ROLES } from "../config/constants";
import { userRepository } from "../modules/auth/repositories/user.repository";
import { passwordUtil } from "../utils/password.util";
import { roleService } from "../modules/organization/roles/role.service";
import { logger } from "../utils/logger";

export async function runSeed() {
  await roleService.ensureSystemRoles();

  const adminEmail = (process.env.SEED_SUPER_ADMIN_EMAIL || "superadmin@cybernaut.com").toLowerCase();
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || "ChangeMe@12345";
  const adminName = process.env.SEED_SUPER_ADMIN_NAME || "Super Admin";

  const existing = await userRepository.findByEmail(adminEmail);
  if (existing) {
    logger.info(`✔ Super Admin already exists (${adminEmail})`);
    return;
  }

  const hashed = await passwordUtil.hash(adminPassword);
  await userRepository.model.create({
    name: adminName,
    firstName: "Super",
    lastName: "Admin",
    email: adminEmail,
    password: hashed,
    role: ROLES.SUPER_ADMIN,
    accountStatus: "active",
    isActive: true,
    forcePasswordChange: true,
  });
  logger.info(`✔ Seeded Super Admin (${adminEmail})`);
}
