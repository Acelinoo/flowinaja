import { PrismaClient, RequestStatus, ApprovalStatus, ActivityAction, RequestPriority, UserRole } from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import { ApprovalService } from "../src/services/approval.service";
import { CurrentUserContext } from "../src/types";

const prisma = new PrismaClient();

async function runPhase3Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING FLOWINAJA PHASE 3 VERIFICATION SUITE");
  console.log("=================================================");

  // 1. Setup Test Actors & Organizations
  const org = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (!org) throw new Error("Seed organization 'demo-org' not found!");

  // Create or retrieve an isolated second organization for cross-tenant testing
  const otherOrg = await prisma.organization.upsert({
    where: { slug: "other-org" },
    update: {},
    create: {
      name: "Other Isolated Org",
      slug: "other-org",
    },
  });

  const employee = await prisma.user.findUnique({ where: { email: "employee@flowinaja.local" } });
  const supervisor = await prisma.user.findUnique({ where: { email: "supervisor@flowinaja.local" } });
  const manager = await prisma.user.findUnique({ where: { email: "manager@flowinaja.local" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@flowinaja.local" } });

  if (!employee || !supervisor || !manager || !admin) {
    throw new Error("Required seed users missing!");
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
    id: employee.id,
    name: employee.name,
    email: employee.email,
    role: employee.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: employee.departmentId,
  };

  const supervisorCtx: CurrentUserContext = {
    id: supervisor.id,
    name: supervisor.name,
    email: supervisor.email,
    role: supervisor.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: supervisor.departmentId,
  };

  const managerCtx: CurrentUserContext = {
    id: manager.id,
    name: manager.name,
    email: manager.email,
    role: manager.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: manager.departmentId,
  };

  const adminCtx: CurrentUserContext = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: admin.departmentId,
  };

  const otherSupervisorCtx: CurrentUserContext = {
    id: otherSupervisorUser.id,
    name: otherSupervisorUser.name,
    email: otherSupervisorUser.email,
    role: otherSupervisorUser.role,
    organizationId: otherOrg.id,
    organizationName: otherOrg.name,
    departmentId: null,
  };

  console.log(`✓ Tenant verified: ${org.name} (${org.id})`);
  console.log(`✓ Actors verified: Employee, Supervisor, Manager, Admin`);
  console.log(`✓ Cross-tenant actor: ${otherSupervisorUser.name} (${otherOrg.name})`);

  const requestTypes = await RequestService.getRequestTypes(org.id);
  const purType = requestTypes.find((t) => t.code === "REQ-PUR")!;
  const itType = requestTypes.find((t) => t.code === "REQ-IT")!;
  const mntType = requestTypes.find((t) => t.code === "REQ-MNT")!;
  const trvType = requestTypes.find((t) => t.code === "REQ-TRV")!;
  const genType = requestTypes.find((t) => t.code === "REQ-GEN")!;

  const runId = Date.now().toString().slice(-4);

  // -------------------------------------------------------------
  // TEST 1: Purchase Request Sequential Workflow (3 Steps -> APPROVED)
  // -------------------------------------------------------------
  console.log("\n--- [LIFECYCLE 1: PURCHASE REQUEST (SUPERVISOR -> MANAGER -> ADMIN -> APPROVED)] ---");
  const purReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 Purchase Request [${runId}]`,
      description: "Procuring developer hardware equipment.",
      requestTypeId: purType.id,
      priority: RequestPriority.HIGH,
      metadata: {
        item: "MacBook Pro M3 Max",
        quantity: 1,
        estimatedCost: 45000000,
        justification: "High-performance compile workloads",
      },
    },
    employeeCtx
  );

  console.log(`  ✓ Created & Submitted: ID ${purReq.id}, Status: ${purReq.status}, CurrentStep: ${purReq.currentStepOrder}`);
  if (purReq.status !== RequestStatus.IN_REVIEW || purReq.currentStepOrder !== 1) {
    throw new Error(`Expected status IN_REVIEW at Step 1, got ${purReq.status} at Step ${purReq.currentStepOrder}`);
  }

  // Verify only Step 1 approval exists in PENDING status
  let purApprovals = await ApprovalService.getApprovalsByRequestId(org.id, purReq.id);
  if (purApprovals.length !== 1 || purApprovals[0].stepOrder !== 1 || purApprovals[0].status !== ApprovalStatus.PENDING) {
    throw new Error(`Expected exactly 1 pending approval at step 1, found ${purApprovals.length}`);
  }
  console.log(`  ✓ Only Step 1 approval exists (Pending, Role: ${purApprovals[0].approvalStep?.roleRequired})`);

  // Step 1: Supervisor Approves
  const step1Result = await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: purReq.id,
    approvalId: purApprovals[0].id,
    decision: "APPROVE",
    comment: "Equipment specifications verified and endorsed.",
    actor: supervisorCtx,
  });
  console.log(`  ✓ Step 1 Approved by Supervisor. Decision: ${step1Result.decision}`);

  // Verify Step 2 activated and request still IN_REVIEW at step 2
  purApprovals = await ApprovalService.getApprovalsByRequestId(org.id, purReq.id);
  if (purApprovals.length !== 2) throw new Error(`Expected 2 approvals after step 1, found ${purApprovals.length}`);
  if (purApprovals[0].status !== ApprovalStatus.APPROVED || purApprovals[1].status !== ApprovalStatus.PENDING) {
    throw new Error("Approval status progression incorrect after step 1");
  }

  const purReqAfterStep1 = await RequestService.getRequestById(org.id, purReq.id);
  if (purReqAfterStep1?.status !== RequestStatus.IN_REVIEW || purReqAfterStep1?.currentStepOrder !== 2) {
    throw new Error(`Expected request IN_REVIEW at Step 2, got ${purReqAfterStep1?.status} at ${purReqAfterStep1?.currentStepOrder}`);
  }
  console.log(`  ✓ Advanced to Step 2: Request status is IN_REVIEW, CurrentStep: 2 (Role: ${purApprovals[1].approvalStep?.roleRequired})`);

  // Step 2: Manager Approves
  const step2Result = await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: purReq.id,
    approvalId: purApprovals[1].id,
    decision: "APPROVE",
    comment: "Department budget allocation cleared.",
    actor: managerCtx,
  });
  console.log(`  ✓ Step 2 Approved by Manager. Decision: ${step2Result.decision}`);

  // Verify Step 3 activated and request still IN_REVIEW at step 3
  purApprovals = await ApprovalService.getApprovalsByRequestId(org.id, purReq.id);
  if (purApprovals.length !== 3) throw new Error(`Expected 3 approvals after step 2, found ${purApprovals.length}`);
  if (purApprovals[1].status !== ApprovalStatus.APPROVED || purApprovals[2].status !== ApprovalStatus.PENDING) {
    throw new Error("Approval status progression incorrect after step 2");
  }

  const purReqAfterStep2 = await RequestService.getRequestById(org.id, purReq.id);
  if (purReqAfterStep2?.status !== RequestStatus.IN_REVIEW || purReqAfterStep2?.currentStepOrder !== 3) {
    throw new Error(`Expected request IN_REVIEW at Step 3, got ${purReqAfterStep2?.status} at ${purReqAfterStep2?.currentStepOrder}`);
  }
  console.log(`  ✓ Advanced to Step 3: Request status is IN_REVIEW, CurrentStep: 3 (Role: ${purApprovals[2].approvalStep?.roleRequired})`);

  // Step 3: Admin Final Approves
  const step3Result = await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: purReq.id,
    approvalId: purApprovals[2].id,
    decision: "APPROVE",
    comment: "Final executive sign-off and PO issued.",
    actor: adminCtx,
  });
  console.log(`  ✓ Step 3 Approved by Admin (Final Step). Decision: ${step3Result.decision}`);

  // Verify request is APPROVED
  const purReqFinal = await RequestService.getRequestById(org.id, purReq.id);
  if (purReqFinal?.status !== RequestStatus.APPROVED) {
    throw new Error(`Expected request status APPROVED, got ${purReqFinal?.status}`);
  }
  console.log(`  ✓ Final Lifecycle State: Request is APPROVED!`);

  // Verify Activity Logs for Purchase Request
  const purLogs = await prisma.activityLog.findMany({
    where: { requestId: purReq.id },
    orderBy: { createdAt: "asc" },
  });
  const purLogActions = purLogs.map((l) => l.action);
  console.log(`  ✓ Audit Trail: ${purLogActions.join(" -> ")}`);
  if (
    purLogActions[0] !== ActivityAction.REQUEST_CREATED ||
    purLogActions[1] !== ActivityAction.REQUEST_SUBMITTED ||
    purLogActions[2] !== ActivityAction.APPROVAL_APPROVED ||
    purLogActions[3] !== ActivityAction.APPROVAL_APPROVED ||
    purLogActions[4] !== ActivityAction.REQUEST_APPROVED
  ) {
    throw new Error(`Unexpected audit trail actions: ${JSON.stringify(purLogActions)}`);
  }

  // -------------------------------------------------------------
  // TEST 2: IT Access Request Workflow (2 Steps -> APPROVED)
  // -------------------------------------------------------------
  console.log("\n--- [LIFECYCLE 2: IT ACCESS REQUEST (SUPERVISOR -> ADMIN -> APPROVED)] ---");
  const itReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 IT Access Request [${runId}]`,
      description: "Requesting database console read privileges.",
      requestTypeId: itType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        system: "Production PostgreSQL Analytics Replica",
        accessLevel: "Read-Only",
        justification: "Data pipeline validation",
      },
    },
    employeeCtx
  );

  let itApprovals = await ApprovalService.getApprovalsByRequestId(org.id, itReq.id);
  // Step 1: Supervisor Approves
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: itReq.id,
    approvalId: itApprovals[0].id,
    decision: "APPROVE",
    comment: "Access verified",
    actor: supervisorCtx,
  });

  // Step 2: Admin Approves
  itApprovals = await ApprovalService.getApprovalsByRequestId(org.id, itReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: itReq.id,
    approvalId: itApprovals[1].id,
    decision: "APPROVE",
    comment: "IAM permissions provisioned",
    actor: adminCtx,
  });

  const itReqFinal = await RequestService.getRequestById(org.id, itReq.id);
  if (itReqFinal?.status !== RequestStatus.APPROVED) {
    throw new Error(`Expected IT request APPROVED, got ${itReqFinal?.status}`);
  }
  console.log(`  ✓ IT Access Request successfully APPROVED through Supervisor -> Admin sequence`);

  // -------------------------------------------------------------
  // TEST 3: Maintenance Request Workflow (2 Steps -> APPROVED)
  // -------------------------------------------------------------
  console.log("\n--- [LIFECYCLE 3: MAINTENANCE REQUEST (SUPERVISOR -> ADMIN -> APPROVED)] ---");
  const mntReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 Maintenance Request [${runId}]`,
      description: "Repairing meeting room projector wiring.",
      requestTypeId: mntType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        location: "Meeting Room B",
        issue: "Projector flickering",
        urgency: "MEDIUM",
        issueDetails: "HDMI connection loose in wall mount",
      },
    },
    employeeCtx
  );

  let mntApprovals = await ApprovalService.getApprovalsByRequestId(org.id, mntReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: mntReq.id,
    approvalId: mntApprovals[0].id,
    decision: "APPROVE",
    actor: supervisorCtx,
  });

  mntApprovals = await ApprovalService.getApprovalsByRequestId(org.id, mntReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: mntReq.id,
    approvalId: mntApprovals[1].id,
    decision: "APPROVE",
    actor: adminCtx,
  });

  const mntReqFinal = await RequestService.getRequestById(org.id, mntReq.id);
  if (mntReqFinal?.status !== RequestStatus.APPROVED) {
    throw new Error(`Expected Maintenance request APPROVED, got ${mntReqFinal?.status}`);
  }
  console.log(`  ✓ Maintenance Request successfully APPROVED`);

  // -------------------------------------------------------------
  // TEST 4: Business Travel Request Workflow (2 Steps -> APPROVED)
  // -------------------------------------------------------------
  console.log("\n--- [LIFECYCLE 4: BUSINESS TRAVEL REQUEST (SUPERVISOR -> MANAGER -> APPROVED)] ---");
  const trvReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 Travel Request [${runId}]`,
      description: "Attending annual developer symposium.",
      requestTypeId: trvType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        destination: "Bandung",
        travelDate: "2026-10-15",
        returnDate: "2026-10-18",
        purpose: "Keynote presentation and team alignment",
      },
    },
    employeeCtx
  );

  let trvApprovals = await ApprovalService.getApprovalsByRequestId(org.id, trvReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: trvReq.id,
    approvalId: trvApprovals[0].id,
    decision: "APPROVE",
    actor: supervisorCtx,
  });

  trvApprovals = await ApprovalService.getApprovalsByRequestId(org.id, trvReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: trvReq.id,
    approvalId: trvApprovals[1].id,
    decision: "APPROVE",
    actor: managerCtx,
  });

  const trvReqFinal = await RequestService.getRequestById(org.id, trvReq.id);
  if (trvReqFinal?.status !== RequestStatus.APPROVED) {
    throw new Error(`Expected Travel request APPROVED, got ${trvReqFinal?.status}`);
  }
  console.log(`  ✓ Business Travel Request successfully APPROVED through Supervisor -> Manager sequence`);

  // -------------------------------------------------------------
  // TEST 5: General Request Workflow (1 Step -> APPROVED)
  // -------------------------------------------------------------
  console.log("\n--- [LIFECYCLE 5: GENERAL REQUEST (SUPERVISOR -> APPROVED)] ---");
  const genReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 General Request [${runId}]`,
      description: "Ordering standard stationery supplies.",
      requestTypeId: genType.id,
      priority: RequestPriority.LOW,
      metadata: {
        category: "Office Supplies",
        details: "Sticky notes, whiteboard markers, notebooks",
      },
    },
    employeeCtx
  );

  const genApprovals = await ApprovalService.getApprovalsByRequestId(org.id, genReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: genReq.id,
    approvalId: genApprovals[0].id,
    decision: "APPROVE",
    comment: "General request approved",
    actor: supervisorCtx,
  });

  const genReqFinal = await RequestService.getRequestById(org.id, genReq.id);
  if (genReqFinal?.status !== RequestStatus.APPROVED) {
    throw new Error(`Expected General request APPROVED, got ${genReqFinal?.status}`);
  }
  console.log(`  ✓ General Request successfully APPROVED in 1 step`);

  // -------------------------------------------------------------
  // TEST 6: Rejection Flow & Reason Validation
  // -------------------------------------------------------------
  console.log("\n--- [TEST 6: REJECTION LIFECYCLE & VALIDATION] ---");
  const rejectReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 Rejection Test [${runId}]`,
      description: "Testing rejection behavior.",
      requestTypeId: purType.id,
      priority: RequestPriority.LOW,
      metadata: {
        item: "Gold-plated Mouse",
        quantity: 1,
        estimatedCost: 10000000,
        justification: "Aesthetic desk item",
      },
    },
    employeeCtx
  );

  const rejectApprovals = await ApprovalService.getApprovalsByRequestId(org.id, rejectReq.id);

  // Attempt rejection with empty/short reason -> MUST FAIL
  let emptyReasonFailed = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: rejectReq.id,
      approvalId: rejectApprovals[0].id,
      decision: "REJECT",
      comment: "no",
      actor: supervisorCtx,
    });
  } catch (err: unknown) {
    emptyReasonFailed = true;
    console.log(`  ✓ Short rejection reason correctly rejected: ${(err as Error).message}`);
  }
  if (!emptyReasonFailed) {
    throw new Error("VALIDATION FAILURE: Rejection was allowed without a valid reason (min 5 chars)!");
  }

  // Reject with valid reason
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: rejectReq.id,
    approvalId: rejectApprovals[0].id,
    decision: "REJECT",
    comment: "Disallowed non-business luxury asset procurement.",
    actor: supervisorCtx,
  });

  const rejectReqFinal = await RequestService.getRequestById(org.id, rejectReq.id);
  if (rejectReqFinal?.status !== RequestStatus.REJECTED) {
    throw new Error(`Expected request status REJECTED, got ${rejectReqFinal?.status}`);
  }
  console.log(`  ✓ Request transitioned to REJECTED status`);

  // Verify no future approval can be performed after rejection
  let subsequentApprovalBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: rejectReq.id,
      approvalId: rejectApprovals[0].id,
      decision: "APPROVE",
      actor: supervisorCtx,
    });
  } catch (err: unknown) {
    subsequentApprovalBlocked = true;
    console.log(`  ✓ Subsequent decision on REJECTED request blocked: ${(err as Error).message}`);
  }
  if (!subsequentApprovalBlocked) {
    throw new Error("LIFECYCLE FAILURE: Allowed decision on already rejected request!");
  }

  // -------------------------------------------------------------
  // TEST 7: Revision Request Flow & Validation
  // -------------------------------------------------------------
  console.log("\n--- [TEST 7: REVISION REQUEST LIFECYCLE & VALIDATION] ---");
  const revisionReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 Revision Test [${runId}]`,
      description: "Testing revision request behavior.",
      requestTypeId: itType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        system: "Cloud Admin",
        accessLevel: "Administrator",
        justification: "Need root privileges",
      },
    },
    employeeCtx
  );

  const revisionApprovals = await ApprovalService.getApprovalsByRequestId(org.id, revisionReq.id);

  // Attempt revision request without comment -> MUST FAIL
  let emptyRevisionFailed = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: revisionReq.id,
      approvalId: revisionApprovals[0].id,
      decision: "REQUEST_REVISION",
      comment: "",
      actor: supervisorCtx,
    });
  } catch (err: unknown) {
    emptyRevisionFailed = true;
    console.log(`  ✓ Empty revision reason correctly rejected: ${(err as Error).message}`);
  }
  if (!emptyRevisionFailed) {
    throw new Error("VALIDATION FAILURE: Revision was allowed without a valid reason!");
  }

  // Request revision with valid reason
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: revisionReq.id,
    approvalId: revisionApprovals[0].id,
    decision: "REQUEST_REVISION",
    comment: "Administrator access is too broad. Please adjust access level to Standard Operator.",
    actor: supervisorCtx,
  });

  const revisionReqFinal = await RequestService.getRequestById(org.id, revisionReq.id);
  if (revisionReqFinal?.status !== RequestStatus.REVISION_REQUIRED) {
    throw new Error(`Expected request status REVISION_REQUIRED, got ${revisionReqFinal?.status}`);
  }
  console.log(`  ✓ Request transitioned to REVISION_REQUIRED status`);

  // -------------------------------------------------------------
  // TEST 8: Strict Role Authorization (Exact Role Matching, No Hierarchical Bypass)
  // -------------------------------------------------------------
  console.log("\n--- [TEST 8: STRICT ROLE AUTHORIZATION & NO BYPASS] ---");
  const authReq = await RequestService.createAndSubmit(
    {
      title: `Phase 3 Authorization Test [${runId}]`,
      description: "Testing role mismatch guards.",
      requestTypeId: purType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        item: "Office Ergonomic Desk",
        quantity: 1,
        estimatedCost: 3500000,
        justification: "Standard desk",
      },
    },
    employeeCtx
  );

  const authApprovals = await ApprovalService.getApprovalsByRequestId(org.id, authReq.id);
  const activeStep1 = authApprovals[0]; // requires SUPERVISOR

  // Test: Manager attempting to approve Supervisor step -> MUST BE BLOCKED
  let managerMismatchBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: authReq.id,
      approvalId: activeStep1.id,
      decision: "APPROVE",
      actor: managerCtx,
    });
  } catch (err: unknown) {
    managerMismatchBlocked = true;
    console.log(`  ✓ Manager blocked from approving SUPERVISOR step: ${(err as Error).message}`);
  }
  if (!managerMismatchBlocked) {
    throw new Error("SECURITY FAILURE: Manager bypassed role requirement on Supervisor step!");
  }

  // Test: Admin attempting to approve Supervisor step directly -> MUST BE BLOCKED (No admin bypass)
  let adminBypassBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: authReq.id,
      approvalId: activeStep1.id,
      decision: "APPROVE",
      actor: adminCtx,
    });
  } catch (err: unknown) {
    adminBypassBlocked = true;
    console.log(`  ✓ Admin blocked from bypassing SUPERVISOR step: ${(err as Error).message}`);
  }
  if (!adminBypassBlocked) {
    throw new Error("SECURITY FAILURE: Admin bypassed role requirement on Supervisor step!");
  }

  // Test: Employee attempting to approve Supervisor step -> MUST BE BLOCKED
  let employeeApproveBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: authReq.id,
      approvalId: activeStep1.id,
      decision: "APPROVE",
      actor: employeeCtx,
    });
  } catch (err: unknown) {
    employeeApproveBlocked = true;
    console.log(`  ✓ Employee blocked from approving SUPERVISOR step: ${(err as Error).message}`);
  }
  if (!employeeApproveBlocked) {
    throw new Error("SECURITY FAILURE: Employee was able to approve a request!");
  }

  // -------------------------------------------------------------
  // TEST 9: Cross-Tenant Isolation
  // -------------------------------------------------------------
  console.log("\n--- [TEST 9: CROSS-TENANT ISOLATION] ---");
  let crossTenantBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: authReq.id,
      approvalId: activeStep1.id,
      decision: "APPROVE",
      actor: otherSupervisorCtx, // belongs to other-org
    });
  } catch (err: unknown) {
    crossTenantBlocked = true;
    console.log(`  ✓ Cross-tenant approver blocked: ${(err as Error).message}`);
  }
  if (!crossTenantBlocked) {
    throw new Error("SECURITY FAILURE: User from other organization approved a request!");
  }

  // -------------------------------------------------------------
  // TEST 10: Double Approval Prevention (Stale / Concurrent Approval)
  // -------------------------------------------------------------
  console.log("\n--- [TEST 10: DOUBLE APPROVAL PREVENTION] ---");
  // Legitimate approval by Supervisor
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: authReq.id,
    approvalId: activeStep1.id,
    decision: "APPROVE",
    actor: supervisorCtx,
  });
  console.log("  ✓ Step 1 successfully approved by Supervisor");

  // Attempt to approve the exact same Step 1 approval record a second time -> MUST BE BLOCKED
  let doubleApprovalBlocked = false;
  try {
    await ApprovalService.decideApproval({
      organizationId: org.id,
      requestId: authReq.id,
      approvalId: activeStep1.id,
      decision: "APPROVE",
      actor: supervisorCtx,
    });
  } catch (err: unknown) {
    doubleApprovalBlocked = true;
    console.log(`  ✓ Second approval on same record blocked: ${(err as Error).message}`);
  }
  if (!doubleApprovalBlocked) {
    throw new Error("CONCURRENCY FAILURE: Able to double-approve the same approval record!");
  }

  // -------------------------------------------------------------
  // TEST 11: Approval Inbox Scoping
  // -------------------------------------------------------------
  console.log("\n--- [TEST 11: APPROVAL INBOX SCOPING] ---");
  // Check employee inbox -> must be 0
  const employeeInbox = await ApprovalService.getPendingApprovalsForUser({ actor: employeeCtx });
  console.log(`  ✓ Employee Inbox items: ${employeeInbox.totalCount}`);
  if (employeeInbox.totalCount !== 0) {
    throw new Error(`Expected 0 inbox items for employee, got ${employeeInbox.totalCount}`);
  }

  // Check manager inbox -> authReq is now at Step 2 (Manager), so manager inbox must have at least 1 item
  const managerInbox = await ApprovalService.getPendingApprovalsForUser({ actor: managerCtx });
  console.log(`  ✓ Manager Inbox items: ${managerInbox.totalCount}`);
  const authReqInManagerInbox = managerInbox.approvals.find((a) => a.requestId === authReq.id);
  if (!authReqInManagerInbox) {
    throw new Error("Expected authReq at Step 2 to appear in Manager inbox");
  }
  console.log(`  ✓ authReq successfully surfaced in Manager inbox: Step ${authReqInManagerInbox.stepOrder} (${authReqInManagerInbox.approvalStep?.title})`);

  console.log("\n=================================================");
  console.log("🎉 ALL PHASE 3 VERIFICATION TESTS PASSED!");
  console.log("=================================================\n");
}

runPhase3Tests()
  .catch((e) => {
    console.error("\n❌ PHASE 3 VERIFICATION TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
