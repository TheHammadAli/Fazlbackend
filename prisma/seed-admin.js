/**
 * Creates (or promotes) a super_admin account in the `admins` table.
 *
 *   node prisma/seed-admin.js --email=you@example.com --password='secret' [--name='Support']
 *
 * Why this exists: no endpoint can create a super_admin — POST /admins refuses
 * the role outright — so a fresh database has no way in to the admin panel.
 * This is the one-off bootstrap for that.
 *
 * Credentials are arguments, never literals — nothing secret belongs in a file
 * that gets committed.
 *
 * Idempotent: running it again on the same email re-hashes the password and
 * re-asserts the role rather than failing on the unique constraint.
 */
require("dotenv/config");
const bcrypt = require("bcryptjs");

const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { generateObjectId } = require("../dist/common/utils/object-id.util");

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

const email = (arg("email") || process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
const password = arg("password") || process.env.SEED_ADMIN_PASSWORD || "";
const name = arg("name") || "Super Admin";

if (!email || !password) {
  console.error(
    "Usage: node prisma/seed-admin.js --email=you@example.com --password='secret' [--name='Support']",
  );
  process.exit(1);
}

/** Matches AdminsService.nextCode so codes stay in one sequence. */
async function nextAdminCode(prisma) {
  const counter = await prisma.counter.upsert({
    where: { id: "adminCode" },
    create: { id: "adminCode", seq: 1 },
    update: { seq: { increment: 1 } },
  });
  return `ADM-${String(counter.seq).padStart(6, "0")}`;
}

(async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    // Same hashing AdminsService uses, so the account logs in through the normal path.
    const salt = await bcrypt.genSalt();
    const hashed = await bcrypt.hash(password, salt);

    const existing = await prisma.admin.findUnique({
      where: { email },
      select: { id: true, role: true, adminCode: true },
    });

    if (existing) {
      const admin = await prisma.admin.update({
        where: { id: existing.id },
        data: {
          password: hashed,
          role: "super_admin",
          isDisabled: false,
          // Any session signed in under the old password is ended.
          refreshToken: null,
        },
        select: { id: true, email: true, name: true, role: true, adminCode: true },
      });
      console.log("mojooda admin account update kiya:");
      console.log("  ", JSON.stringify(admin));
    } else {
      const admin = await prisma.admin.create({
        data: {
          id: generateObjectId(),
          adminCode: await nextAdminCode(prisma),
          name,
          email,
          password: hashed,
          role: "super_admin",
        },
        select: { id: true, email: true, name: true, role: true, adminCode: true },
      });
      console.log("naya super_admin bana:");
      console.log("  ", JSON.stringify(admin));
    }

    const supers = await prisma.admin.count({ where: { role: "super_admin" } });
    console.log(`\ndatabase mein ab ${supers} super_admin`);
  } finally {
    await prisma.$disconnect();
  }
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
