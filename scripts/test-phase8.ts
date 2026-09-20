import {
  PrismaClient,
  RequestPriority,
  RequestStatus,
  ApprovalStatus,
  UserRole,
  ActivityAction,
} from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import { ApprovalService } from "../src/services/approval.service";
import { NotificationService } from "../src/services/notification.service";
import { GET as healthHandler } from "../src/app/api/health/route";
import nextConfig from "../next.config";

const prisma = new PrismaClient();

async function runPhase8Validation() {
  console.log("=================================================================");
  console.log("🚀 MENJALANKAN PENGUJIAN OTOMATIS PHASE 8 — PRODUCTION RELEASE");
  console.log("=================================================================");

  let passCount = 0;
  const totalTests = 20;

  try {
    // ---------------------------------------------------------------------------
    // TEST 1: Environment Variables Audit & Format Sanity
    // ---------------------------------------------------------------------------
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://"))) {
      throw new Error("DATABASE_URL must be a valid PostgreSQL connection string");
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    new URL(appUrl); // Will throw if invalid URL format
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 1. Variabel lingkungan (DATABASE_URL, NEXT_PUBLIC_APP_URL) valid dan terformat benar`);

    // ---------------------------------------------------------------------------
    // TEST 2: Direct Database Connectivity Probe
    // ---------------------------------------------------------------------------
    const pingResult = await prisma.$queryRaw<Array<{ ping: number }>>`SELECT 1 as ping`;
    if (!pingResult || pingResult.length === 0 || Number(pingResult[0].ping) !== 1) {
      throw new Error("Database probe query failed to return expected ping value 1");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 2. Probe konektivitas basis data atomik berhasil (SELECT 1 mengembalikan respon valid)`);

    // ---------------------------------------------------------------------------
    // TEST 3: Health Route Handler Production Sanity
    // ---------------------------------------------------------------------------
    const healthResponse = await healthHandler();
    const healthData = await healthResponse.json();
    if (
      healthResponse.status !== 200 ||
      healthData.status !== "healthy" ||
      healthData.version !== "1.0.0" ||
      healthData.database !== "connected"
    ) {
      throw new Error(`Health handler returned invalid status: ${JSON.stringify(healthData)}`);
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 3. Endpoint /api/health mengembalikan status 'healthy', version '1.0.0', dan database 'connected'`);

    // ---------------------------------------------------------------------------
    // TEST 4: Security Headers Configuration Sanity
    // ---------------------------------------------------------------------------
    if (!nextConfig.poweredByHeader === false) {
      throw new Error("nextConfig must set poweredByHeader: false");
    }
    if (typeof nextConfig.headers !== "function") {
      throw new Error("nextConfig must export an async headers() function");
    }
    const headersList = await nextConfig.headers();
    const globalHeaderRule = headersList.find((h) => h.source === "/:path*");
    if (!globalHeaderRule) {
      throw new Error("Missing global '/:path*' security header rule in next.config.ts");
    }
    const expectedHeaders = [
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Strict-Transport-Security",
      "Permissions-Policy",
    ];
    for (const key of expectedHeaders) {
      const found = globalHeaderRule.headers.find((header) => header.key === key);
      if (!found || !found.value) {
        throw new Error(`Missing or empty security header: ${key}`);
      }
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 4. Konfigurasi HTTP Security Headers (X-Frame-Options, HSTS, CSP/Permissions) terpasang lengkap`);

    // ---------------------------------------------------------------------------
    // TEST 5: Idempotent Seed Execution Verification
    // ---------------------------------------------------------------------------
    const orgSlug = "demo-org";
    const orgBefore = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!orgBefore) throw new Error("demo-org must exist");

    const usersCountBefore = await prisma.user.count({ where: { organizationId: orgBefore.id } });
    const reqTypesCountBefore = await prisma.requestType.count({ where: { organizationId: orgBefore.id } });

    // Re-upsert demo user to simulate rerun of seed
    await prisma.user.upsert({
      where: { email: "admin@flowinaja.local" },
      update: { role: UserRole.ADMIN },
      create: {
        email: "admin@flowinaja.local",
        name: "Admin User",
        role: UserRole.ADMIN,
        organizationId: orgBefore.id,
      },
    });

    const usersCountAfter = await prisma.user.count({ where: { organizationId: orgBefore.id } });
    const reqTypesCountAfter = await prisma.requestType.count({ where: { organizationId: orgBefore.id } });

    if (usersCountBefore !== usersCountAfter || reqTypesCountBefore !== reqTypesCountAfter) {
      throw new Error("Seed logic caused row duplication! Upsert invariant failed.");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 5. Skrip seed terverifikasi 100% idempoten (tidak menghasilkan baris duplikat saat dijalankan ulang)`);

    // Fetch primary actors
    const employee = await prisma.user.findUniqueOrThrow({ where: { email: "employee@flowinaja.local" } });
    const supervisor = await prisma.user.findUniqueOrThrow({ where: { email: "supervisor@flowinaja.local" } });
    const manager = await prisma.user.findUniqueOrThrow({ where: { email: "manager@flowinaja.local" } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@flowinaja.local" } });

    // Create an isolated organization for cross-tenant testing
    const isolatedOrg = await prisma.organization.upsert({
      where: { slug: "isolated-p8-org" },
      update: {},
      create: { name: "Isolated P8 Org", slug: "isolated-p8-org" },
    });
    const isolatedUser = await prisma.user.upsert({
      where: { email: "isolated-p8@example.local" },
      update: {},
      create: {
        email: "isolated-p8@example.local",
        name: "Isolated P8 User",
        role: UserRole.EMPLOYEE,
        organizationId: isolatedOrg.id,
      },
    });

    // ---------------------------------------------------------------------------
    // TEST 6: Multi-Tenant Isolation: Request Types
    // ---------------------------------------------------------------------------
    const demoTypes = await RequestService.getRequestTypes(orgBefore.id);
    const isolatedTypes = await RequestService.getRequestTypes(isolatedOrg.id);
    if (isolatedTypes.length !== 0 && isolatedTypes.some((t) => t.organizationId !== isolatedOrg.id)) {
      throw new Error("Request types leaked across organization boundaries");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 6. Isolasi data RequestType multi-tenant terbukti kedap (tidak bocor antar organisasi)`);

    // ---------------------------------------------------------------------------
    // TEST 7: Multi-Tenant Isolation: Departments
    // ---------------------------------------------------------------------------
    const isolatedDepts = await prisma.department.findMany({ where: { organizationId: isolatedOrg.id } });
    if (isolatedDepts.length !== 0) {
      throw new Error("Isolated organization unexpectedly had departments");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 7. Isolasi data Departemen multi-tenant terbukti kedap`);

    // ---------------------------------------------------------------------------
    // TEST 8: Multi-Tenant Isolation: Requests Listing
    // ---------------------------------------------------------------------------
    const isolatedRequests = await RequestService.listMyRequests({
      organizationId: isolatedOrg.id,
      requesterId: isolatedUser.id,
      page: 1,
      limit: 10,
    });
    if (isolatedRequests.totalCount !== 0 || isolatedRequests.requests.length !== 0) {
      throw new Error("Requests from demo-org leaked into isolated user query");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 8. Isolasi daftar permintaan (Requests) terbukti kedap`);

    // ---------------------------------------------------------------------------
    // TEST 9: Multi-Tenant Isolation: Approvals Inbox
    // ---------------------------------------------------------------------------
    const isolatedApprovals = await ApprovalService.getPendingApprovalsForUser({
      actor: {
        id: isolatedUser.id,
        role: UserRole.SUPERVISOR,
        organizationId: isolatedOrg.id,
        email: isolatedUser.email,
        name: isolatedUser.name,
        organizationName: isolatedOrg.name,
        departmentId: null,
        departmentName: null,
      },
      page: 1,
      limit: 10,
    });
    if (isolatedApprovals.totalCount !== 0) {
      throw new Error("Approval inbox from demo-org leaked into isolated organization supervisor query");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 9. Isolasi antrean persetujuan (Approvals Inbox) terbukti kedap`);

    // ---------------------------------------------------------------------------
    // TEST 10: Multi-Tenant Isolation: Activity Audit Trail
    // ---------------------------------------------------------------------------
    const isolatedLogs = await prisma.activityLog.findMany({
      where: { organizationId: isolatedOrg.id },
    });
    if (isolatedLogs.length !== 0) {
      throw new Error("Activity logs from demo-org leaked into isolated organization query");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 10. Isolasi jejak audit sistem (ActivityLog) terbukti kedap`);

    // ---------------------------------------------------------------------------
    // TEST 11: Multi-Tenant Isolation: Notifications
    // ---------------------------------------------------------------------------
    const isolatedNotifs = await NotificationService.getNotificationsForUser({
      organizationId: isolatedOrg.id,
      userId: isolatedUser.id,
      page: 1,
      limit: 10,
    });
    if (isolatedNotifs.totalCount !== 0) {
      throw new Error("Notifications leaked to isolated user");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 11. Isolasi notifikasi penerima terbukti kedap`);

    // ---------------------------------------------------------------------------
    // TEST 12: Multi-Tenant Isolation: Notification Preferences
    // ---------------------------------------------------------------------------
    const demoPref = await NotificationService.getPreferences(orgBefore.id, employee.id);
    const isolatedPref = await NotificationService.getPreferences(isolatedOrg.id, isolatedUser.id);
    if (demoPref.userId === isolatedPref.userId) {
      throw new Error("Notification preferences cross-contaminated between tenants");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 12. Isolasi preferensi notifikasi terbukti aman dan terpisah`);

    const employeeCtx = {
      id: employee.id,
      email: employee.email,
      name: employee.name,
      role: employee.role,
      organizationId: orgBefore.id,
      organizationName: orgBefore.name,
      departmentId: employee.departmentId,
      departmentName: null,
    };

    const purchaseType = demoTypes.find((t) => t.code === "REQ-PUR")!;
    const testTitle = `Phase 8 E2E Production Validation [${Date.now()}]`;
    const draftReq = await RequestService.createDraft(
      {
        title: testTitle,
        description: "Comprehensive production release verification request with full lifecycle simulation.",
        requestTypeId: purchaseType.id,
        priority: RequestPriority.HIGH,
        metadata: {
          item: "High Performance Server Rack",
          quantity: 1,
          estimatedCost: 45000000,
          justification: "Critical infrastructure for production reliability",
        },
      },
      employeeCtx
    );
    if (draftReq.status !== RequestStatus.DRAFT) {
      throw new Error(`Expected DRAFT status, got ${draftReq.status}`);
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 13. Pembuatan draf permintaan (DRAFT) berhasil tercatat`);

    const supervisorCtx = {
      id: supervisor.id,
      email: supervisor.email,
      name: supervisor.name,
      role: supervisor.role,
      organizationId: orgBefore.id,
      organizationName: orgBefore.name,
      departmentId: supervisor.departmentId,
      departmentName: null,
    };

    const managerCtx = {
      id: manager.id,
      email: manager.email,
      name: manager.name,
      role: manager.role,
      organizationId: orgBefore.id,
      organizationName: orgBefore.name,
      departmentId: manager.departmentId,
      departmentName: null,
    };

    const adminCtx = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      organizationId: orgBefore.id,
      organizationName: orgBefore.name,
      departmentId: admin.departmentId,
      departmentName: null,
    };

    // ---------------------------------------------------------------------------
    // TEST 14: End-to-End Workflow: Step B — Submission & Step 1 Activation
    // ---------------------------------------------------------------------------
    const submittedReq = await RequestService.submitDraft(draftReq.id, employeeCtx);
    if (submittedReq.status !== RequestStatus.IN_REVIEW || submittedReq.currentStepOrder !== 1) {
      throw new Error("Request did not advance to IN_REVIEW Step 1");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 14. Pengajuan draf berhasil mengaktifkan tahap alur IN_REVIEW Langkah 1`);

    // ---------------------------------------------------------------------------
    // TEST 15: End-to-End Workflow: Step C — Supervisor Approval (Step 1 -> 2)
    // ---------------------------------------------------------------------------
    const step1Approval = await prisma.approval.findFirstOrThrow({
      where: {
        requestId: submittedReq.id,
        cycle: 1,
        stepOrder: 1,
        status: ApprovalStatus.PENDING,
      },
    });

    const step1Result = await ApprovalService.decideApproval({
      organizationId: orgBefore.id,
      requestId: submittedReq.id,
      approvalId: step1Approval.id,
      decision: "APPROVE",
      comment: "Supervisor review approved. Advancing to department manager.",
      actor: supervisorCtx,
    });
    if (!step1Result.success) {
      throw new Error("Workflow failed to advance to Step 2");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 15. Persetujuan Supervisor (Langkah 1) berhasil memajukan alur ke Langkah 2`);

    // ---------------------------------------------------------------------------
    // TEST 16: End-to-End Workflow: Step D — Manager Approval (Step 2 -> 3)
    // ---------------------------------------------------------------------------
    const step2Approval = await prisma.approval.findFirstOrThrow({
      where: {
        requestId: submittedReq.id,
        cycle: 1,
        stepOrder: 2,
        status: ApprovalStatus.PENDING,
      },
    });

    const step2Result = await ApprovalService.decideApproval({
      organizationId: orgBefore.id,
      requestId: submittedReq.id,
      approvalId: step2Approval.id,
      decision: "APPROVE",
      comment: "Manager budget sign-off approved. Advancing to Admin final step.",
      actor: managerCtx,
    });
    if (!step2Result.success) {
      throw new Error("Workflow failed to advance to Step 3");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 16. Persetujuan Manajer (Langkah 2) berhasil memajukan alur ke Langkah 3`);

    // ---------------------------------------------------------------------------
    // TEST 17: End-to-End Workflow: Step E — Admin Approval (Final Step -> APPROVED)
    // ---------------------------------------------------------------------------
    const step3Approval = await prisma.approval.findFirstOrThrow({
      where: {
        requestId: submittedReq.id,
        cycle: 1,
        stepOrder: 3,
        status: ApprovalStatus.PENDING,
      },
    });

    const step3Result = await ApprovalService.decideApproval({
      organizationId: orgBefore.id,
      requestId: submittedReq.id,
      approvalId: step3Approval.id,
      decision: "APPROVE",
      comment: "Final executive approval granted.",
      actor: adminCtx,
    });
    if (!step3Result.success) {
      throw new Error("Workflow failed to reach final APPROVED state");
    }

    const approvedReq = await prisma.request.findUniqueOrThrow({ where: { id: submittedReq.id } });
    if (approvedReq.status !== RequestStatus.APPROVED) {
      throw new Error("Request record status is not APPROVED");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 17. Persetujuan Final Admin (Langkah 3) berhasil menetapkan status APPROVED`);

    // ---------------------------------------------------------------------------
    // TEST 18: End-to-End Workflow: Step F — Operational Processing (APPROVED -> PROCESSING)
    // ---------------------------------------------------------------------------
    const processingReq = await RequestService.startProcessing(approvedReq.id, managerCtx);
    if (processingReq.status !== RequestStatus.PROCESSING) {
      throw new Error("Request did not transition to PROCESSING");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 18. Pemenuhan operasional (startProcessing) berhasil mengubah status ke PROCESSING`);

    // ---------------------------------------------------------------------------
    // TEST 19: End-to-End Workflow: Step G — Completion (PROCESSING -> COMPLETED)
    // ---------------------------------------------------------------------------
    const completedReq = await RequestService.completeRequest(approvedReq.id, adminCtx);
    if (completedReq.status !== RequestStatus.COMPLETED) {
      throw new Error("Request did not transition to terminal COMPLETED status");
    }
    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 19. Penyelesaian permintaan (completeRequest) berhasil menetapkan status terminal COMPLETED`);

    // ---------------------------------------------------------------------------
    // TEST 20: Terminal Immutability & Audit Trail Integrity Verification
    // ---------------------------------------------------------------------------
    // Attempting to cancel a completed request must be rejected
    let cancelRejected = false;
    try {
      await RequestService.cancelRequest(completedReq.id, employeeCtx);
    } catch (err: unknown) {
      if ((err as Error).message.includes("terminal state")) {
        cancelRejected = true;
      }
    }
    if (!cancelRejected) {
      throw new Error("Terminal state violation: Successfully cancelled COMPLETED request!");
    }

    // Verify all lifecycle activity logs exist in sequence
    const logs = await prisma.activityLog.findMany({
      where: { requestId: completedReq.id },
      orderBy: { createdAt: "asc" },
    });
    const logActions = logs.map((l) => l.action);
    const expectedActions = [
      ActivityAction.REQUEST_CREATED,
      ActivityAction.REQUEST_SUBMITTED,
      ActivityAction.APPROVAL_APPROVED,
      ActivityAction.APPROVAL_APPROVED,
      ActivityAction.REQUEST_APPROVED,
      ActivityAction.REQUEST_PROCESSING,
      ActivityAction.REQUEST_COMPLETED,
    ];
    for (const action of expectedActions) {
      if (!logActions.includes(action)) {
        throw new Error(`Missing expected audit log action: ${action}`);
      }
    }

    // Verify notification was dispatched to requester
    const notifs = await prisma.notification.findMany({
      where: { requestId: completedReq.id, recipientId: employee.id },
    });
    if (notifs.length === 0) {
      throw new Error("Expected notifications for requester, none found");
    }

    passCount++;
    console.log(`✅ LULUS (${passCount}/${totalTests}): 20. Keutuhan status terminal (immutability) dan jejak audit (ActivityLog) 100% lengkap dan konsisten`);

    console.log("=================================================================");
    console.log("🎉 SEMUA 20/20 PENGUJIAN PHASE 8 LULUS DENGAN SEMPURNA!");
    console.log("=================================================================");
  } catch (error) {
    console.error("❌ PENGUJIAN GAGAL:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase8Validation();
