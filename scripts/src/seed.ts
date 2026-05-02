import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHmac, randomBytes } from "crypto";

const SECRET = process.env.SESSION_SECRET || "clinica-arguello-secret-2026";

function hashPassword(password: string, salt?: string): string {
  const s = salt || randomBytes(16).toString("hex");
  const hash = createHmac("sha256", SECRET).update(`${password}:${s}`).digest("hex");
  return `${s}:${hash}`;
}

async function main() {
  const users = [
    { name: "Dr. Carlos Argüello", email: "admin@clinica-arguello.com", password: "admin2026", role: "admin" as const },
    { name: "María González", email: "recepcion@clinica-arguello.com", password: "recep2026", role: "receptionist" as const },
    { name: "Dr. Luis Herrera", email: "dentista@clinica-arguello.com", password: "dent2026", role: "dentist" as const },
  ];

  for (const u of users) {
    const hash = hashPassword(u.password);
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, u.email));
    if (existing) {
      await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.email, u.email));
      console.log(`Updated password for ${u.email}`);
    } else {
      await db.insert(usersTable).values({ name: u.name, email: u.email, passwordHash: hash, role: u.role, isActive: true });
      console.log(`Created user ${u.email}`);
    }
  }

  console.log("Seed complete!");
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
