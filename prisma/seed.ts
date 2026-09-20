import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Flowinaja development data...");

  // 1. Seed Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: "gerobaklink" },
    update: { name: "Gerobaklink" },
    create: {
      name: "Gerobaklink",
      slug: "gerobaklink",
    },
  });
  console.log(`✓ Organization: ${org.name} (${org.id})`);

  // 2. Seed Default Department
  const department = await prisma.department.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "Operations & Technology",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "Operations & Technology",
      code: "OPS-TECH",
    },
  });
  console.log(`✓ Department: ${department.name} (${department.code})`);

  // 3. Seed 4 Users (1 per role)
  const usersToSeed = [
    {
      email: "admin@flowinaja.local",
      name: "Admin User",
      role: UserRole.ADMIN,
    },
    {
      email: "manager@flowinaja.local",
      name: "Manager User",
      role: UserRole.MANAGER,
    },
    {
      email: "supervisor@flowinaja.local",
      name: "Supervisor User",
      role: UserRole.SUPERVISOR,
    },
    {
      email: "employee@flowinaja.local",
      name: "Employee User",
      role: UserRole.EMPLOYEE,
    },
  ];

  for (const u of usersToSeed) {
    const createdUser = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        departmentId: department.id,
        organizationId: org.id,
        isActive: true,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        organizationId: org.id,
        departmentId: department.id,
        isActive: true,
        emailVerified: new Date(),
      },
    });
    console.log(`✓ User seeded: ${createdUser.name} [${createdUser.role}] (${createdUser.email})`);
  }

  // 4. Seed 5 Request Types with Sequential ApprovalSteps
  const requestTypesToSeed = [
    {
      name: "Permintaan Pengadaan (Purchase Request)",
      code: "REQ-PUR",
      description: "Pengadaan perlengkapan kantor, lisensi perangkat lunak, dan pembelian aset operasional.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Pemeriksaan Penyelia (Supervisor)", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.MANAGER, title: "Persetujuan Manajer Departemen", isFinal: false },
        { stepOrder: 3, roleRequired: UserRole.ADMIN, title: "Otorisasi Keuangan & Administrasi", isFinal: true },
      ],
    },
    {
      name: "Permintaan Akses IT (IT Access Request)",
      code: "REQ-IT",
      description: "Hak akses sistem organisasi, jaringan VPN perusahaan, server, dan perangkat lunak internal.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Pemeriksaan Penyelia (Supervisor)", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.ADMIN, title: "Penyediaan Akses Administrator IT", isFinal: true },
      ],
    },
    {
      name: "Permintaan Pemeliharaan (Maintenance Request)",
      code: "REQ-MNT",
      description: "Pemeliharaan fasilitas gedung, perbaikan peralatan kantor, dan perbaikan infrastruktur kerja.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Inspeksi Awal Penyelia", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.ADMIN, title: "Otorisasi Administrasi Fasilitas", isFinal: true },
      ],
    },
    {
      name: "Permintaan Perjalanan Dinas (Business Travel Request)",
      code: "REQ-TRV",
      description: "Otorisasi perjalanan dinas luar kota, tunjangan harian, akomodasi penginapan, dan kegiatan dinas.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Pemeriksaan Penyelia (Supervisor)", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.MANAGER, title: "Persetujuan Anggaran Manajer", isFinal: true },
      ],
    },
    {
      name: "Permintaan Operasional Umum (General Request)",
      code: "REQ-GEN",
      description: "Pengajuan administratif umum, permintaan informasi operasional, dan kebutuhan kantor harian.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Pemeriksaan Penyelia (Supervisor)", isFinal: true },
      ],
    },
  ];

  for (const rt of requestTypesToSeed) {
    const createdType = await prisma.requestType.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: rt.name,
        },
      },
      update: {
        code: rt.code,
        description: rt.description,
        isActive: true,
      },
      create: {
        organizationId: org.id,
        name: rt.name,
        code: rt.code,
        description: rt.description,
        isActive: true,
      },
    });

    // Seed sequential approval steps
    for (const s of rt.steps) {
      await prisma.approvalStep.upsert({
        where: {
          requestTypeId_stepOrder: {
            requestTypeId: createdType.id,
            stepOrder: s.stepOrder,
          },
        },
        update: {
          roleRequired: s.roleRequired,
          title: s.title,
          isFinal: s.isFinal,
        },
        create: {
          requestTypeId: createdType.id,
          stepOrder: s.stepOrder,
          roleRequired: s.roleRequired,
          title: s.title,
          isFinal: s.isFinal,
        },
      });
    }

    console.log(`✓ RequestType seeded: ${createdType.name} (${rt.steps.length} sequential steps)`);
  }

  console.log("✅ Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
