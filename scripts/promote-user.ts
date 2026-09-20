import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.toLowerCase()?.trim();
  const roleInput = (process.argv[3] || "ADMIN").toUpperCase() as UserRole;

  if (!email) {
    console.error("❌ Gunakan format: npx tsx scripts/promote-user.ts <email> [ROLE]");
    console.error("   Contoh: npx tsx scripts/promote-user.ts user@gmail.com ADMIN");
    console.error("   Role yang tersedia: EMPLOYEE, SUPERVISOR, MANAGER, ADMIN");
    process.exit(1);
  }

  if (!Object.values(UserRole).includes(roleInput)) {
    console.error(`❌ Peran '${roleInput}' tidak valid.`);
    console.error("   Pilihan yang sah:", Object.values(UserRole).join(", "));
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`❌ Pengguna dengan email '${email}' belum ditemukan di basis data.`);
    console.error("   Pastikan pengguna sudah login setidaknya 1 kali via Google, atau buat pengguna terlebih dahulu.");
    process.exit(1);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: roleInput, isActive: true },
  });

  console.log(`✅ Berhasil! Pengguna '${updated.name}' (${updated.email}) kini memiliki peran [${updated.role}].`);
}

main()
  .catch((err) => {
    console.error("❌ Gagal memperbarui peran:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
