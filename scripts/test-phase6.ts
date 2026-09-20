import {
  PrismaClient,
  RequestPriority,
  RequestStatus,
  UserRole,
} from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import { DashboardService } from "../src/services/dashboard.service";
import { CurrentUserContext } from "../src/types";
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
  ACTIVITY_ACTION_LABELS,
  NOTIFICATION_TYPE_LABELS,
} from "../src/lib/constants/presentation";

const prisma = new PrismaClient();

async function runPhase6Tests() {
  console.log("=================================================");
  console.log("🧪 MENJALANKAN PENGUJIAN OTOMATIS PHASE 6 — DASHBOARD & REPORTING");
  console.log("=================================================");

  // 1. Setup Test Actors & Organizations
  const org = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (!org) throw new Error("Organisasi 'demo-org' tidak ditemukan!");

  const otherOrg = await prisma.organization.upsert({
    where: { slug: "other-org" },
    update: {},
    create: {
      name: "Other Isolated Org",
      slug: "other-org",
    },
  });

  const employeeUser = await prisma.user.findUnique({ where: { email: "employee@flowinaja.local" } });
  const supervisorUser = await prisma.user.findUnique({ where: { email: "supervisor@flowinaja.local" } });
  const managerUser = await prisma.user.findUnique({ where: { email: "manager@flowinaja.local" } });
  const adminUser = await prisma.user.findUnique({ where: { email: "admin@flowinaja.local" } });

  if (!employeeUser || !supervisorUser || !managerUser || !adminUser) {
    throw new Error("Pengguna dasar (seed) belum lengkap!");
  }

  // Cross-tenant user
  const otherSupervisorUser = await prisma.user.upsert({
    where: { email: "other.supervisor@other.local" },
    update: { organizationId: otherOrg.id, role: UserRole.SUPERVISOR },
    create: {
      email: "other.supervisor@other.local",
      name: "Other Org Supervisor",
      role: UserRole.SUPERVISOR,
      organizationId: otherOrg.id,
      isActive: true,
    },
  });

  const employeeCtx: CurrentUserContext = {
    id: employeeUser.id,
    name: employeeUser.name,
    email: employeeUser.email,
    role: employeeUser.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: employeeUser.departmentId,
  };

  const supervisorCtx: CurrentUserContext = {
    id: supervisorUser.id,
    name: supervisorUser.name,
    email: supervisorUser.email,
    role: supervisorUser.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: supervisorUser.departmentId,
  };

  const managerCtx: CurrentUserContext = {
    id: managerUser.id,
    name: managerUser.name,
    email: managerUser.email,
    role: managerUser.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: managerUser.departmentId,
  };

  const adminCtx: CurrentUserContext = {
    id: adminUser.id,
    name: adminUser.name,
    email: adminUser.email,
    role: adminUser.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: adminUser.departmentId,
  };

  const otherSupervisorCtx: CurrentUserContext = {
    id: otherSupervisorUser.id,
    name: otherSupervisorUser.name,
    email: otherSupervisorUser.email,
    role: otherSupervisorUser.role,
    organizationId: otherOrg.id,
    organizationName: otherOrg.name,
    departmentId: otherSupervisorUser.departmentId,
  };

  const purchaseType = await prisma.requestType.findFirst({
    where: { organizationId: org.id, code: "REQ-PUR" },
  });
  if (!purchaseType) throw new Error("Tipe permintaan 'REQ-PUR' tidak ditemukan!");

  // Ensure fresh test request for Dashboard tests
  const testTitle = `Uji Dasbor Phase 6 ${Date.now()}`;
  const createdReq = await RequestService.createDraft(
    {
      requestTypeId: purchaseType.id,
      title: testTitle,
      description: "Permintaan uji untuk verifikasi agregasi dasbor dan pelaporan operasional.",
      priority: RequestPriority.HIGH,
      metadata: {
        item: "Laptop Uji Dasbor",
        quantity: 1,
        estimatedCost: 15000000,
        justification: "Pengadaan laptop untuk operasional tim pengembang",
      },
    },
    employeeCtx
  );

  await RequestService.submitDraft(createdReq.id, employeeCtx);

  let passCount = 0;
  function assert(condition: boolean, testName: string) {
    if (!condition) {
      console.error(`❌ GAGAL: ${testName}`);
      throw new Error(`Uji gagal: ${testName}`);
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/20): ${testName}`);
  }

  // TEST 1: Role-based overview resolution (Employee -> EMPLOYEE)
  const employeeDashboard = await DashboardService.getDashboardForUser(employeeCtx);
  assert(employeeDashboard.role === UserRole.EMPLOYEE, "1. Resolusi peran karyawan mengembalikan peran 'EMPLOYEE'");

  // TEST 2: Role-based overview resolution (Supervisor -> SUPERVISOR)
  const supFromGeneral = await DashboardService.getDashboardForUser(supervisorCtx);
  const manFromGeneral = await DashboardService.getDashboardForUser(managerCtx);
  assert(
    supFromGeneral.role === UserRole.SUPERVISOR && manFromGeneral.role === UserRole.MANAGER,
    "2. Resolusi peran supervisor & manajer mengembalikan peran 'SUPERVISOR' & 'MANAGER'"
  );

  // TEST 3: Role-based overview resolution (Admin -> ADMIN)
  const admFromGeneral = await DashboardService.getDashboardForUser(adminCtx);
  assert(admFromGeneral.role === UserRole.ADMIN, "3. Resolusi peran admin mengembalikan peran 'ADMIN'");

  // Specific role dashboard objects for detailed inspections
  const supervisorDashboard = await DashboardService.getApproverDashboard(supervisorCtx);
  const adminDashboard = await DashboardService.getAdminDashboard(adminCtx);

  // TEST 4: Requester KPI correctness
  const realUserRequestsCount = await prisma.request.count({
    where: { organizationId: org.id, requesterId: employeeUser.id },
  });
  assert(
    employeeDashboard.myRequestsSummary.total === realUserRequestsCount,
    "4. Metrik total pada ringkasan permintaan pengaju akurat sesuai database"
  );

  // TEST 5: Requester recent requests listing
  assert(
    Array.isArray(employeeDashboard.recentRequests) && employeeDashboard.recentRequests.length > 0,
    "5. Daftar permintaan terbaru untuk pengaju tersedia dan berupa data nyata"
  );

  // TEST 6: Approver actionable queue count matches exact actionable conditions
  const allPending = await prisma.approval.findMany({
    where: {
      request: { organizationId: org.id, status: RequestStatus.IN_REVIEW },
      status: "PENDING",
      approvalStep: { roleRequired: UserRole.SUPERVISOR },
    },
    include: { request: true },
  });
  const realActionableCount = allPending.filter(
    (a) => a.stepOrder === a.request.currentStepOrder && a.cycle === a.request.currentCycle
  ).length;
  assert(
    supervisorDashboard.pendingApprovals.totalCount === realActionableCount,
    "6. Jumlah antrean persetujuan tertunda untuk supervisor sesuai dengan kondisi aksi nyata"
  );

  // TEST 7: Approver actionable items contain request details
  const hasActionableItems = supervisorDashboard.pendingApprovals.actionableItems.every(
    (item) => Boolean(item.request && item.request.requestType && item.request.requester)
  );
  assert(hasActionableItems, "7. Setiap elemen antrean persetujuan memuat relasi permintaan, tipe, dan pengaju");

  // TEST 8: Approver workload count
  const realSupervisorDecisions = await prisma.approval.count({
    where: {
      request: { organizationId: org.id },
      approverId: supervisorUser.id,
      status: { in: ["APPROVED", "REJECTED", "REVISION_REQUESTED"] },
    },
  });
  assert(
    supervisorDashboard.workloadStats.totalDecided === realSupervisorDecisions,
    "8. Beban kerja keputusan yang diambil oleh supervisor sesuai dengan riwayat database"
  );

  // TEST 9: Admin organization-wide total requests KPI
  const realOrgRequests = await prisma.request.count({ where: { organizationId: org.id } });
  assert(
    adminDashboard.operationalOverview.totalRequests === realOrgRequests,
    "9. Metrik total permintaan seluruh organisasi pada dasbor admin akurat"
  );

  // TEST 10: Admin in-review count
  const realInReview = await prisma.request.count({
    where: {
      organizationId: org.id,
      status: { in: [RequestStatus.IN_REVIEW, RequestStatus.SUBMITTED] },
    },
  });
  assert(
    adminDashboard.operationalOverview.pendingReview === realInReview,
    "10. Jumlah permintaan dalam proses evaluasi (IN_REVIEW / SUBMITTED) pada admin akurat"
  );

  // TEST 11: Admin processing count
  const realProcessing = await prisma.request.count({
    where: { organizationId: org.id, status: RequestStatus.PROCESSING },
  });
  assert(
    adminDashboard.operationalOverview.processing === realProcessing,
    "11. Jumlah permintaan dalam pemrosesan operasional (PROCESSING) pada admin akurat"
  );

  // TEST 12: Admin status distribution breakdown matches real counts
  const totalInDistribution = adminDashboard.statusDistribution.reduce(
    (acc, item) => acc + item.count,
    0
  );
  assert(
    totalInDistribution === realOrgRequests,
    "12. Distribusi status mencakup seluruh permintaan dalam organisasi secara lengkap"
  );

  // TEST 13: Admin role-based pending workload distribution
  const supervisorPending = adminDashboard.approvalWorkloadByRole.SUPERVISOR;
  const managerPending = adminDashboard.approvalWorkloadByRole.MANAGER;
  assert(
    typeof supervisorPending === "number" && typeof managerPending === "number",
    "13. Beban persetujuan tertunda per peran (SUPERVISOR, MANAGER, ADMIN) terhitung sebagai angka valid"
  );

  // TEST 14: Completion rate calculation
  assert(
    adminDashboard.completionMetrics.completionRate >= 0 && adminDashboard.completionMetrics.completionRate <= 100,
    "14. Tingkat penyelesaian (completion rate) dihitung dalam rentang 0% - 100%"
  );

  // TEST 15: Date range filter: TODAY
  const adminToday = await DashboardService.getAdminDashboard(adminCtx, "TODAY");
  assert(
    adminToday.completionMetrics.totalFinalized <= adminDashboard.completionMetrics.totalFinalized,
    "15. Filter rentang waktu 'TODAY' menghasilkan metrik subset yang valid"
  );

  // TEST 16: Date range filter: 7D
  const admin7D = await DashboardService.getAdminDashboard(adminCtx, "7D");
  assert(
    admin7D.completionMetrics.totalFinalized <= adminDashboard.completionMetrics.totalFinalized,
    "16. Filter rentang waktu '7D' menghasilkan metrik subset yang valid"
  );

  // TEST 17: Date range filter: THIS_MONTH
  const adminThisMonth = await DashboardService.getAdminDashboard(adminCtx, "THIS_MONTH");
  assert(
    typeof adminThisMonth.completionMetrics.completionRate === "number",
    "17. Filter rentang waktu 'THIS_MONTH' menghasilkan kalkulasi performa valid"
  );

  // TEST 18: Date range filter: LAST_MONTH
  const adminLastMonth = await DashboardService.getAdminDashboard(adminCtx, "LAST_MONTH");
  assert(
    typeof adminLastMonth.completionMetrics.completedCount === "number",
    "18. Filter rentang waktu 'LAST_MONTH' menghasilkan metrik valid"
  );

  // TEST 19: Organization isolation
  const otherDashboard = await DashboardService.getApproverDashboard(otherSupervisorCtx);
  assert(
    otherDashboard.pendingApprovals.totalCount === 0,
    "19. Isolasi organisasi multi-tenant: Supervisor dari tenant lain tidak melihat antrean dari demo-org"
  );

  // TEST 20: Standardisasi Bahasa Indonesia
  const hasAllStatuses = [
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
    "REVISION_REQUIRED",
    "PROCESSING",
    "COMPLETED",
    "CANCELLED",
  ].every((s) => typeof STATUS_LABELS[s as keyof typeof STATUS_LABELS] === "string");

  const hasAllRoles = ["EMPLOYEE", "SUPERVISOR", "MANAGER", "ADMIN"].every(
    (r) => typeof ROLE_LABELS[r as keyof typeof ROLE_LABELS] === "string"
  );

  const hasAllPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"].every(
    (p) => typeof PRIORITY_LABELS[p as keyof typeof PRIORITY_LABELS] === "string"
  );

  const hasAllActivityActions = Object.values(ACTIVITY_ACTION_LABELS).every(
    (lbl) => typeof lbl === "string" && lbl.length > 0
  );

  const hasAllNotificationTypes = Object.values(NOTIFICATION_TYPE_LABELS).every(
    (lbl) => typeof lbl === "string" && lbl.length > 0
  );

  assert(
    hasAllStatuses && hasAllRoles && hasAllPriorities && hasAllActivityActions && hasAllNotificationTypes,
    "20. Seluruh kamus istilah standar Bahasa Indonesia lengkap (Status, Prioritas, Peran, Notifikasi, Audit)"
  );

  console.log("=================================================");
  console.log(`🎉 SEMUA ${passCount}/20 PENGUJIAN PHASE 6 LULUS DENGAN SEMPURNA!`);
  console.log("=================================================");
}

runPhase6Tests()
  .catch((e) => {
    console.error("FATAL ERROR IN TEST SUITE:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
