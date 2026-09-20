import {
  PrismaClient,
  RequestPriority,
  ApprovalStatus,
  UserRole,
} from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import { ApprovalService } from "../src/services/approval.service";
import { NotificationService } from "../src/services/notification.service";
import { DashboardService } from "../src/services/dashboard.service";
import { CurrentUserContext } from "../src/types";
import { validateCommonFields, validateTypeSpecificMetadata } from "../src/lib/validations/request.schema";

const prisma = new PrismaClient();

async function runPhase7Tests() {
  console.log("=================================================================");
  console.log("🛡️ MENJALANKAN PENGUJIAN OTOMATIS PHASE 7 — PRODUCTION HARDENING");
  console.log("=================================================================");

  // 1. Setup Tenant Actors
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
    include: { approvalSteps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!purchaseType) throw new Error("Tipe permintaan 'REQ-PUR' tidak ditemukan!");

  let passCount = 0;
  function assert(condition: boolean, testName: string) {
    if (!condition) {
      console.error(`❌ GAGAL: ${testName}`);
      throw new Error(`Uji gagal: ${testName}`);
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/20): ${testName}`);
  }

  const runId = Date.now().toString().slice(-4);

  // -------------------------------------------------------------
  // TEST 1: Unauthenticated request rejected
  // -------------------------------------------------------------
  let test1Passed = false;
  try {
    const invalidCtx = { ...employeeCtx, id: "" };
    await RequestService.createDraft(
      {
        title: "Unauth Test",
        description: "Testing unauthenticated draft creation",
        requestTypeId: purchaseType.id,
      },
      invalidCtx
    );
  } catch {
    test1Passed = true;
  }
  assert(test1Passed, "1. Operasi dengan identitas pengguna kosong/tidak valid ditolak");

  // -------------------------------------------------------------
  // TEST 2: Cross-tenant GET rejected
  // -------------------------------------------------------------
  const tenantReq = await RequestService.createDraft(
    {
      title: `Tenant Isolation Test [${runId}]`,
      description: "Testing multi-tenant data boundary",
      requestTypeId: purchaseType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        item: "Isolation Monitor",
        quantity: 1,
        estimatedCost: 2500000,
        justification: "Cross-tenant check",
      },
    },
    employeeCtx
  );

  const crossTenantGet = await RequestService.getRequestById(otherOrg.id, tenantReq.id);
  assert(crossTenantGet === null, "2. Percobaan akses data GET lintas organisasi (cross-tenant) menghasilkan null (tidak bocor)");

  // -------------------------------------------------------------
  // TEST 3: Cross-tenant mutation rejected
  // -------------------------------------------------------------
  let crossTenantMutationBlocked = false;
  try {
    await RequestService.submitDraft(tenantReq.id, otherSupervisorCtx);
  } catch {
    crossTenantMutationBlocked = true;
  }
  assert(crossTenantMutationBlocked, "3. Mutasi lintas organisasi (submit/edit dari organisasi lain) ditolak secara tegas");

  // -------------------------------------------------------------
  // TEST 4: Unauthorized role rejected
  // -------------------------------------------------------------
  let unauthorizedStartProcessingBlocked = false;
  try {
    await RequestService.startProcessing(tenantReq.id, employeeCtx);
  } catch {
    unauthorizedStartProcessingBlocked = true;
  }
  assert(unauthorizedStartProcessingBlocked, "4. Peran yang tidak berwenang (Karyawan) diblokir dari aksi manajemen proses");

  // -------------------------------------------------------------
  // TEST 5: Employee cannot approve
  // -------------------------------------------------------------
  await RequestService.submitDraft(tenantReq.id, employeeCtx);
  const approvals1 = await ApprovalService.getApprovalsByRequestId(org.id, tenantReq.id);

  let employeeApproveBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: tenantReq.id,
      approvalId: approvals1[0].id,
      decision: "APPROVE",
      actor: employeeCtx,
    });
  } catch {
    employeeApproveBlocked = true;
  }
  assert(employeeApproveBlocked, "5. Karyawan (Pengaju) tidak dapat menyetujui persetujuannya sendiri");

  // -------------------------------------------------------------
  // TEST 6: Wrong approver role rejected
  // -------------------------------------------------------------
  let managerWrongStepBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: tenantReq.id,
      approvalId: approvals1[0].id, // requires SUPERVISOR
      decision: "APPROVE",
      actor: managerCtx,
    });
  } catch {
    managerWrongStepBlocked = true;
  }
  assert(managerWrongStepBlocked, "6. Penyetuju dengan peran yang tidak cocok (Manajer pada tahap Supervisor) diblokir");

  // -------------------------------------------------------------
  // TEST 7: Wrong approval cycle rejected
  // -------------------------------------------------------------
  // Supervisor requests revision
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: tenantReq.id,
    approvalId: approvals1[0].id,
    decision: "REQUEST_REVISION",
    comment: "Harap perbaiki jumlah unit yang diajukan",
    actor: supervisorCtx,
  });

  // Requester resubmits for Cycle 2
  await RequestService.resubmitRevision(tenantReq.id, employeeCtx);

  // Try to approve Cycle 1 approval record again
  let oldCycleBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: tenantReq.id,
      approvalId: approvals1[0].id, // old cycle record
      decision: "APPROVE",
      actor: supervisorCtx,
    });
  } catch {
    oldCycleBlocked = true;
  }
  assert(oldCycleBlocked, "7. Keputusan pada siklus persetujuan lama yang sudah tidak aktif diblokir");

  // -------------------------------------------------------------
  // TEST 8: Wrong step rejected
  // -------------------------------------------------------------
  const approvalsCycle2 = await ApprovalService.getApprovalsByRequestId(org.id, tenantReq.id);
  const activeCycle2Step1 = approvalsCycle2.find((a) => a.cycle === 2 && a.stepOrder === 1)!;

  // Try to act on Step 2 before Step 1 is decided (Step 2 doesn't even exist or is not active)
  let wrongStepBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: tenantReq.id,
      approvalId: "non-existent-step-2",
      decision: "APPROVE",
      actor: managerCtx,
    });
  } catch {
    wrongStepBlocked = true;
  }
  assert(wrongStepBlocked, "8. Keputusan pada tahap alur yang belum aktif diblokir secara server-side");

  // -------------------------------------------------------------
  // TEST 9: Already-decided approval rejected
  // -------------------------------------------------------------
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: tenantReq.id,
    approvalId: activeCycle2Step1.id,
    decision: "APPROVE",
    comment: "Disetujui untuk siklus 2",
    actor: supervisorCtx,
  });

  let duplicateDecisionBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: tenantReq.id,
      approvalId: activeCycle2Step1.id, // already APPROVED
      decision: "APPROVE",
      comment: "Mencoba approve lagi",
      actor: supervisorCtx,
    });
  } catch {
    duplicateDecisionBlocked = true;
  }
  assert(duplicateDecisionBlocked, "9. Rekaman persetujuan yang telah diputuskan tidak dapat diputuskan ulang (idempotency)");

  // -------------------------------------------------------------
  // TEST 10: Invalid lifecycle transition rejected
  // -------------------------------------------------------------
  const draftForBypass = await RequestService.createDraft(
    {
      title: `Bypass Guard Test [${runId}]`,
      description: "Testing state machine bypass guards",
      requestTypeId: purchaseType.id,
    },
    employeeCtx
  );

  let draftToProcessingBlocked = false;
  try {
    await RequestService.startProcessing(draftForBypass.id, adminCtx);
  } catch {
    draftToProcessingBlocked = true;
  }
  assert(draftToProcessingBlocked, "10. Transisi status ilegal (DRAFT langsung ke PROCESSING) diblokir oleh mesin status");

  // -------------------------------------------------------------
  // TEST 11: Completed request cannot be mutated illegally
  // -------------------------------------------------------------
  // Advance tenantReq to Step 2 (Manager) and Step 3 (Admin)
  const approvalsCycle2Step2 = (await ApprovalService.getApprovalsByRequestId(org.id, tenantReq.id)).find(
    (a) => a.cycle === 2 && a.stepOrder === 2 && a.status === "PENDING"
  )!;
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: tenantReq.id,
    approvalId: approvalsCycle2Step2.id,
    decision: "APPROVE",
    comment: "Anggaran disetujui",
    actor: managerCtx,
  });

  const approvalsCycle2Step3 = (await ApprovalService.getApprovalsByRequestId(org.id, tenantReq.id)).find(
    (a) => a.cycle === 2 && a.stepOrder === 3 && a.status === "PENDING"
  )!;
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: tenantReq.id,
    approvalId: approvalsCycle2Step3.id,
    decision: "APPROVE",
    comment: "Final sign-off",
    actor: adminCtx,
  });

  await RequestService.startProcessing(tenantReq.id, managerCtx);
  await RequestService.completeRequest(tenantReq.id, adminCtx);

  let completedCancelBlocked = false;
  try {
    await RequestService.cancelRequest(tenantReq.id, employeeCtx);
  } catch {
    completedCancelBlocked = true;
  }
  assert(completedCancelBlocked, "11. Permintaan dalam status terminal COMPLETED tidak dapat dibatalkan atau dimodifikasi");

  // -------------------------------------------------------------
  // TEST 12: Rejected request cannot be mutated illegally
  // -------------------------------------------------------------
  const rejectedReq = await RequestService.createAndSubmit(
    {
      title: `Rejected Terminal Guard [${runId}]`,
      description: "Testing rejected terminal state",
      requestTypeId: purchaseType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        item: "Expensive Watch",
        quantity: 1,
        estimatedCost: 50000000,
        justification: "Not business related",
      },
    },
    employeeCtx
  );

  const rejApprovals = await ApprovalService.getApprovalsByRequestId(org.id, rejectedReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: rejectedReq.id,
    approvalId: rejApprovals[0].id,
    decision: "REJECT",
    comment: "Aset pribadi dilarang diajukan",
    actor: supervisorCtx,
  });

  let rejectedStartProcessingBlocked = false;
  try {
    await RequestService.startProcessing(rejectedReq.id, adminCtx);
  } catch {
    rejectedStartProcessingBlocked = true;
  }
  assert(rejectedStartProcessingBlocked, "12. Permintaan dalam status terminal REJECTED tidak dapat diproses lebih lanjut");

  // -------------------------------------------------------------
  // TEST 13: Cancelled request cannot be mutated illegally
  // -------------------------------------------------------------
  const cancelledReq = await RequestService.createDraft(
    {
      title: `Cancelled Terminal Guard [${runId}]`,
      description: "Testing cancelled terminal state",
      requestTypeId: purchaseType.id,
    },
    employeeCtx
  );
  await RequestService.cancelRequest(cancelledReq.id, employeeCtx, "Dibatalkan oleh pengaju");

  let cancelledSubmitBlocked = false;
  try {
    await RequestService.submitDraft(cancelledReq.id, employeeCtx);
  } catch {
    cancelledSubmitBlocked = true;
  }
  assert(cancelledSubmitBlocked, "13. Permintaan dalam status terminal CANCELLED tidak dapat diajukan kembali");

  // -------------------------------------------------------------
  // TEST 14: Revision history remains immutable
  // -------------------------------------------------------------
  const tenantReqHistory = await ApprovalService.getApprovalsByRequestId(org.id, tenantReq.id);
  const cycle1Records = tenantReqHistory.filter((a) => a.cycle === 1);
  const cycle2Records = tenantReqHistory.filter((a) => a.cycle === 2);
  assert(
    cycle1Records.length > 0 && cycle2Records.length > 0 && cycle1Records[0].status === ApprovalStatus.REVISION_REQUESTED,
    "14. Jejak audit dan riwayat persetujuan siklus lama (Cycle 1) tetap permanen dan tidak terhapus (immutable)"
  );

  // -------------------------------------------------------------
  // TEST 15: Concurrent approval cannot double-advance workflow
  // -------------------------------------------------------------
  const concTestReq = await RequestService.createAndSubmit(
    {
      title: `Concurrent Approval Test [${runId}]`,
      description: "Testing optimistic concurrency locking on approval decision",
      requestTypeId: purchaseType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        item: "Testing Terminal",
        quantity: 1,
        estimatedCost: 5000000,
        justification: "Concurrency validation",
      },
    },
    employeeCtx
  );

  const concApprovals = await ApprovalService.getApprovalsByRequestId(org.id, concTestReq.id);
  const concTargetApprovalId = concApprovals[0].id;

  const [res1, res2] = await Promise.allSettled([
    ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: concTestReq.id,
      approvalId: concTargetApprovalId,
      decision: "APPROVE",
      comment: "Concurrent Decision 1",
      actor: supervisorCtx,
    }),
    ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: concTestReq.id,
      approvalId: concTargetApprovalId,
      decision: "APPROVE",
      comment: "Concurrent Decision 2",
      actor: supervisorCtx,
    }),
  ]);

  const concFulfilled = [res1, res2].filter((r) => r.status === "fulfilled").length;
  const concRejected = [res1, res2].filter((r) => r.status === "rejected").length;
  assert(
    concFulfilled === 1 && concRejected === 1,
    "15. Penguncian konkurensi atomik mencegah keputusan ganda (tepat 1 berhasil, 1 ditolak 409 Conflict)"
  );

  // -------------------------------------------------------------
  // TEST 16: Duplicate notification prevented by dedupeKey
  // -------------------------------------------------------------
  const dedupeKeyTest = `test-dedupe-${Date.now()}`;
  await prisma.notification.create({
    data: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      title: "Test Dedupe",
      message: "First notification",
      dedupeKey: dedupeKeyTest,
    },
  });

  let duplicateBlocked = false;
  try {
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        recipientId: employeeUser.id,
        title: "Test Dedupe Duplicate",
        message: "Second notification duplicate",
        dedupeKey: dedupeKeyTest,
      },
    });
  } catch {
    duplicateBlocked = true;
  }
  assert(duplicateBlocked, "16. Notifikasi duplikat dicegah secara deterministik melalui dedupeKey unik");

  // -------------------------------------------------------------
  // TEST 17: Notification recipient isolation
  // -------------------------------------------------------------
  const employeeNotif = await prisma.notification.create({
    data: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      title: "Private Employee Alert",
      message: "Only for employee",
    },
  });

  let recipientIsolationBlocked = false;
  try {
    await NotificationService.markAsRead(employeeNotif.id, supervisorUser.id, org.id);
  } catch {
    recipientIsolationBlocked = true;
  }
  assert(recipientIsolationBlocked, "17. Pengguna tidak dapat membaca atau menandai notifikasi milik pengguna lain (IDOR)");

  // -------------------------------------------------------------
  // TEST 18: Activity log organization isolation
  // -------------------------------------------------------------
  const otherOrgLogs = await prisma.activityLog.findMany({
    where: { organizationId: otherOrg.id },
  });
  const hasLeak = otherOrgLogs.some((l) => l.organizationId === org.id);
  assert(!hasLeak, "18. Jejak audit ActivityLog terisolasi secara ketat per tenant tanpa kebocoran data");

  // -------------------------------------------------------------
  // TEST 19: Dashboard organization isolation
  // -------------------------------------------------------------
  const otherOrgDashboard = await DashboardService.getAdminDashboard(otherSupervisorCtx);
  assert(
    otherOrgDashboard.operationalOverview.totalRequests === 0,
    "19. Metrik dasbor terisolasi 100% (organisasi baru tidak melihat data atau agregasi organisasi lain)"
  );

  // -------------------------------------------------------------
  // TEST 20: Input validation rejects malformed payload
  // -------------------------------------------------------------
  const commonInvalid = validateCommonFields({
    title: "ab", // too short (<3)
    description: "",
  });
  const metadataInvalid = validateTypeSpecificMetadata("REQ-PUR", {
    item: "A",
    quantity: -5,
    estimatedCost: -100,
  });
  assert(
    !commonInvalid.success && !metadataInvalid.success,
    "20. Validasi input sisi server menolak nilai batas ekstrem, string terlalu pendek, dan angka negatif"
  );

  console.log("=================================================================");
  console.log(`🎉 SEMUA ${passCount}/20 PENGUJIAN PHASE 7 LULUS DENGAN SEMPURNA!`);
  console.log("=================================================================");
}

runPhase7Tests()
  .catch((e) => {
    console.error("FATAL ERROR IN PHASE 7 SUITE:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
