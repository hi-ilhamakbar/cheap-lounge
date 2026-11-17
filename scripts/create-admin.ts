/**
 * Create or reset an admin user.
 *   npm run admin:create -- admin@example.com "Admin Name" "a-strong-password"
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password) {
    console.error('Usage: npm run admin:create -- <email> "<name>" "<password>"');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const passwordHash = await hashPassword(password);
  const admin = await prisma.adminUser.upsert({
    where: { email: email.toLowerCase() },
    update: { name, passwordHash, active: true },
    create: { email: email.toLowerCase(), name, passwordHash },
  });
  await prisma.adminSession.deleteMany({ where: { adminId: admin.id } });
  console.log(`Admin ready: ${admin.email}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
