import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Flowinaja development data...");

  // 1. Seed Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: "demo-org" },
    update: {},
    create: {
      name: "Demo Organization",
      slug: "demo-org",
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
      name: "Purchase Request",
      code: "REQ-PUR",
      description: "Procurement of office equipment, software licenses, or asset purchases.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Supervisor Review", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.MANAGER, title: "Department Manager Approval", isFinal: false },
        { stepOrder: 3, roleRequired: UserRole.ADMIN, title: "Finance & Admin Sign-off", isFinal: true },
      ],
    },
    {
      name: "IT Access Request",
      code: "REQ-IT",
      description: "Access privileges to company systems, VPN, servers, and internal tools.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Supervisor Review", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.ADMIN, title: "IT Admin Provisioning", isFinal: true },
      ],
    },
    {
      name: "Maintenance Request",
      code: "REQ-MNT",
      description: "Facility maintenance, equipment repairs, and workplace infrastructure fixes.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Supervisor Inspection", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.ADMIN, title: "Facility Admin Authorization", isFinal: true },
      ],
    },
    {
      name: "Business Travel Request",
      code: "REQ-TRV",
      description: "Travel authorization, per-diem allowances, accommodation, and conference attendance.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Supervisor Review", isFinal: false },
        { stepOrder: 2, roleRequired: UserRole.MANAGER, title: "Department Manager Budget Approval", isFinal: true },
      ],
    },
    {
      name: "General Request",
      code: "REQ-GEN",
      description: "General administrative requests, inquiries, and internal operational submissions.",
      steps: [
        { stepOrder: 1, roleRequired: UserRole.SUPERVISOR, title: "Supervisor Review", isFinal: true },
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
