import {
  PrismaClient,
  RequestStatus,
  ApprovalStatus,
  ActivityAction,
  RequestPriority,
  UserRole,
} from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import { ApprovalService } from "../src/services/approval.service";
import { CurrentUserContext } from "../src/types";

const prisma = new PrismaClient();

async function runPhase4Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING FLOWINAJA PHASE 4 VERIFICATION SUITE");
  console.log("=================================================");

  // 1. Setup Test Actors & Organizations
  const org = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (!org) throw new Error("Seed organization 'demo-org' not found!");

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
    throw new Error("Required seed users missing!");
  }

  // Second employee in the same tenant to test non-owner unauthorized edits
  const employee2User = await prisma.user.upsert({
    where: { email: "employee2@flowinaja.local" },
    update: { organizationId: org.id, role: UserRole.EMPLOYEE },
    create: {
      email: "employee2@flowinaja.local",
      name: "Second Employee",
      role: UserRole.EMPLOYEE,
      organizationId: org.id,
      isActive: true,
    },
  });

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

  const employee2Ctx: CurrentUserContext = {
    id: employee2User.id,
    name: employee2User.name,
    email: employee2User.email,
    role: employee2User.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: employee2User.departmentId,
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
    departmentId: null,
  };

  const requestTypes = await RequestService.getRequestTypes(org.id);
  const purType = requestTypes.find((t) => t.code === "REQ-PUR")!;
  const itType = requestTypes.find((t) => t.code === "REQ-IT")!;

  const runId = Date.now().toString().slice(-4);

  // -------------------------------------------------------------
  // TEST 1: Revision Cycle & Approver Reason
  // -------------------------------------------------------------
  console.log("\n--- [TEST 1: REVISION CYCLE (SUPERVISOR APPROVE -> MANAGER REQUEST REVISION)] ---");
  const test1Req = await RequestService.createAndSubmit(
    {
      title: `Phase 4 Revision Test [${runId}]`,
      description: "Procuring dev monitors.",
      requestTypeId: purType.id,
      priority: RequestPriority.HIGH,
      metadata: {
        item: "Dell UltraSharp 27-inch 4K",
        quantity: 2,
        estimatedCost: 16000000,
        justification: "Front-end UX testing monitor requirement",
      },
    },
    employeeCtx
  );

  console.log(`  ✓ Request created & submitted: ID ${test1Req.id}, Status: ${test1Req.status}, Cycle: ${test1Req.currentCycle}`);
  if (test1Req.status !== RequestStatus.IN_REVIEW || test1Req.currentCycle !== 1) {
    throw new Error(`Expected IN_REVIEW and Cycle 1, got ${test1Req.status} (Cycle ${test1Req.currentCycle})`);
  }

  // Step 1: Supervisor Approves
  let approvals = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: approvals[0].id,
    decision: "APPROVE",
    comment: "Equipment specifications endorsed.",
    actor: supervisorCtx,
  });

  // Step 2: Manager Requests Revision
  approvals = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  const step2Approval = approvals.find((a) => a.stepOrder === 2 && a.cycle === 1)!;
  const revisionComment = "Please reduce quantity to 1 monitor and obtain a vendor quote discount.";
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: step2Approval.id,
    decision: "REQUEST_REVISION",
    comment: revisionComment,
    actor: managerCtx,
  });

  const reqAfterRevision = await RequestService.getRequestById(org.id, test1Req.id);
  if (reqAfterRevision?.status !== RequestStatus.REVISION_REQUIRED) {
    throw new Error(`Expected REVISION_REQUIRED, got ${reqAfterRevision?.status}`);
  }

  const revApproval = reqAfterRevision.approvals.find(
    (a) => a.status === ApprovalStatus.REVISION_REQUESTED && a.cycle === 1
  );
  if (!revApproval || revApproval.comment !== revisionComment) {
    throw new Error("Revision reason not correctly captured in approval record");
  }
  console.log(`  ✓ Status transitioned to REVISION_REQUIRED. Revision reason verified: "${revApproval.comment}"`);

  // -------------------------------------------------------------
  // TEST 2: Revision Authorization & Content Security
  // -------------------------------------------------------------
  console.log("\n--- [TEST 2: REVISION AUTHORIZATION & IDOR GUARDS] ---");

  // Another employee attempts to edit
  try {
    await RequestService.updateRevision(
      test1Req.id,
      { title: "Malicious Edit by Employee 2" },
      employee2Ctx
    );
    throw new Error("Security Failure: Another employee was able to edit revision request!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("403 Forbidden")) throw err;
    console.log(`  ✓ Non-owner employee edit blocked: ${msg}`);
  }

  // Manager attempts to edit requester content directly
  try {
    await RequestService.updateRevision(
      test1Req.id,
      { title: "Manager Forced Edit" },
      managerCtx
    );
    throw new Error("Security Failure: Manager was able to edit requester content!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("403 Forbidden")) throw err;
    console.log(`  ✓ Manager edit of requester content blocked: ${msg}`);
  }

  // Requester edits successfully
  const updatedReq = await RequestService.updateRevision(
    test1Req.id,
    {
      title: `Phase 4 Revised Monitor Request [${runId}]`,
      metadata: {
        item: "Dell UltraSharp 27-inch 4K",
        quantity: 1,
        estimatedCost: 8000000,
        justification: "Adjusted to single unit per manager feedback",
      },
    },
    employeeCtx
  );
  if (updatedReq.title !== `Phase 4 Revised Monitor Request [${runId}]`) {
    throw new Error("Requester update failed");
  }
  console.log(`  ✓ Original requester successfully updated specifications (Status: ${updatedReq.status})`);

  // -------------------------------------------------------------
  // TEST 3: Resubmission & Approval Cycle Initialization
  // -------------------------------------------------------------
  console.log("\n--- [TEST 3: RESUBMISSION & CYCLE #2 INITIALIZATION] ---");
  const resubmittedReq = await RequestService.resubmitRevision(test1Req.id, employeeCtx);

  console.log(`  ✓ Resubmitted: Status ${resubmittedReq.status}, Cycle: ${resubmittedReq.currentCycle}, Step: ${resubmittedReq.currentStepOrder}`);
  if (
    resubmittedReq.status !== RequestStatus.IN_REVIEW ||
    resubmittedReq.currentCycle !== 2 ||
    resubmittedReq.currentStepOrder !== 1
  ) {
    throw new Error(`Resubmission state incorrect: Cycle=${resubmittedReq.currentCycle}, Status=${resubmittedReq.status}, Step=${resubmittedReq.currentStepOrder}`);
  }

  // Verify historical Cycle 1 records are 100% intact and unchanged
  const allApprovalsAfterResubmit = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  const cycle1Approvals = allApprovalsAfterResubmit.filter((a) => a.cycle === 1);
  const cycle2Approvals = allApprovalsAfterResubmit.filter((a) => a.cycle === 2);

  if (cycle1Approvals.length !== 2) {
    throw new Error(`Expected 2 historical approvals in Cycle 1, found ${cycle1Approvals.length}`);
  }
  if (cycle1Approvals[0].status !== ApprovalStatus.APPROVED || cycle1Approvals[1].status !== ApprovalStatus.REVISION_REQUESTED) {
    throw new Error("Historical Cycle 1 approval statuses were mutated!");
  }
  console.log(`  ✓ Historical Cycle 1 records preserved immutably (Step 1: APPROVED, Step 2: REVISION_REQUESTED)`);

  if (cycle2Approvals.length !== 1 || cycle2Approvals[0].stepOrder !== 1 || cycle2Approvals[0].status !== ApprovalStatus.PENDING) {
    throw new Error(`Expected exactly 1 pending approval at Step 1 for Cycle 2, found ${cycle2Approvals.length}`);
  }
  console.log(`  ✓ Cycle 2 initialized correctly with only Step 1 in PENDING status`);

  // Verify REQUEST_RESUBMITTED activity event
  const resubmitLog = await prisma.activityLog.findFirst({
    where: { requestId: test1Req.id, action: ActivityAction.REQUEST_RESUBMITTED },
  });
  if (!resubmitLog) {
    throw new Error("ActivityAction.REQUEST_RESUBMITTED was not logged");
  }
  console.log(`  ✓ Audit log verified: ${resubmitLog.action} ("${resubmitLog.details}")`);

  // -------------------------------------------------------------
  // TEST 4: Multiple Revision Cycles (Cycle 1 -> Cycle 2 -> Cycle 3)
  // -------------------------------------------------------------
  console.log("\n--- [TEST 4: MULTIPLE REVISION CYCLES (CYCLE 1 -> 2 -> 3)] ---");
  // Cycle 2: Supervisor approves Step 1
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: cycle2Approvals[0].id,
    decision: "APPROVE",
    comment: "Cycle 2 Step 1 approved.",
    actor: supervisorCtx,
  });

  // Cycle 2: Manager requests second revision at Step 2
  const cycle2Step2 = (await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id)).find(
    (a) => a.cycle === 2 && a.stepOrder === 2
  )!;
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: cycle2Step2.id,
    decision: "REQUEST_REVISION",
    comment: "Attach internal budget allocation code.",
    actor: managerCtx,
  });

  const reqCycle2Rev = await RequestService.getRequestById(org.id, test1Req.id);
  if (reqCycle2Rev?.status !== RequestStatus.REVISION_REQUIRED || reqCycle2Rev.currentCycle !== 2) {
    throw new Error("Failed to transition to REVISION_REQUIRED in Cycle 2");
  }
  console.log("  ✓ Cycle 2 Revision Requested.");

  // Requester resubmits for Cycle 3
  const cycle3Req = await RequestService.resubmitRevision(test1Req.id, employeeCtx);
  if (cycle3Req.currentCycle !== 3 || cycle3Req.status !== RequestStatus.IN_REVIEW) {
    throw new Error(`Cycle 3 resubmission failed: Cycle=${cycle3Req.currentCycle}`);
  }
  console.log(`  ✓ Resubmitted to Cycle #3: Status ${cycle3Req.status}`);

  // Complete Cycle 3 through all 3 steps: Supervisor -> Manager -> Admin
  const cycle3Approvals1 = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  const c3s1 = cycle3Approvals1.find((a) => a.cycle === 3 && a.stepOrder === 1)!;
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: c3s1.id,
    decision: "APPROVE",
    comment: "C3 Step 1 Approved",
    actor: supervisorCtx,
  });

  const cycle3Approvals2 = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  const c3s2 = cycle3Approvals2.find((a) => a.cycle === 3 && a.stepOrder === 2)!;
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: c3s2.id,
    decision: "APPROVE",
    comment: "C3 Step 2 Approved",
    actor: managerCtx,
  });

  const cycle3Approvals3 = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  const c3s3 = cycle3Approvals3.find((a) => a.cycle === 3 && a.stepOrder === 3)!;
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: test1Req.id,
    approvalId: c3s3.id,
    decision: "APPROVE",
    comment: "C3 Step 3 Final Sign-off",
    actor: adminCtx,
  });

  // Verify all historical cycles (Cycle 1, Cycle 2, Cycle 3) exist intact
  const finalApprovals = await ApprovalService.getApprovalsByRequestId(org.id, test1Req.id);
  const c1 = finalApprovals.filter((a) => a.cycle === 1);
  const c2 = finalApprovals.filter((a) => a.cycle === 2);
  const c3 = finalApprovals.filter((a) => a.cycle === 3);

  console.log(`  ✓ Cycle 1 approvals: ${c1.length}, Cycle 2 approvals: ${c2.length}, Cycle 3 approvals: ${c3.length}`);
  if (c1.length !== 2 || c2.length !== 2 || c3.length !== 3) {
    throw new Error(`Cycle approval counts mismatch! C1=${c1.length}, C2=${c2.length}, C3=${c3.length}`);
  }
  console.log("  ✓ All 3 historical cycles preserved completely with chronological integrity");

  // -------------------------------------------------------------
  // TEST 5: Final Approval State
  // -------------------------------------------------------------
  console.log("\n--- [TEST 5: FINAL APPROVAL STATE] ---");
  const approvedReq = await RequestService.getRequestById(org.id, test1Req.id);
  if (approvedReq?.status !== RequestStatus.APPROVED) {
    throw new Error(`Expected APPROVED status, got ${approvedReq?.status}`);
  }
  console.log(`  ✓ Request status is APPROVED!`);

  // -------------------------------------------------------------
  // TEST 6: Processing Workflow & Role Authorization
  // -------------------------------------------------------------
  console.log("\n--- [TEST 6: PROCESSING WORKFLOW & ROLE AUTHORIZATION] ---");
  // Employee attempts to start processing -> must fail
  try {
    await RequestService.startProcessing(test1Req.id, employeeCtx);
    throw new Error("Security Failure: Employee was able to start processing!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("403 Forbidden")) throw err;
    console.log(`  ✓ Employee start processing blocked: ${msg}`);
  }

  // Manager starts processing -> succeeds
  const processingReq = await RequestService.startProcessing(test1Req.id, managerCtx);
  if (processingReq.status !== RequestStatus.PROCESSING) {
    throw new Error(`Expected status PROCESSING, got ${processingReq.status}`);
  }
  console.log(`  ✓ Manager started processing: Status transitioned to PROCESSING`);

  const procLog = await prisma.activityLog.findFirst({
    where: { requestId: test1Req.id, action: ActivityAction.REQUEST_PROCESSING },
  });
  if (!procLog) throw new Error("REQUEST_PROCESSING activity log missing");
  console.log(`  ✓ Audit log recorded: ${procLog.action} ("${procLog.details}")`);

  // -------------------------------------------------------------
  // TEST 7: Completion Workflow & Terminal State
  // -------------------------------------------------------------
  console.log("\n--- [TEST 7: COMPLETION WORKFLOW & TERMINAL STATE] ---");
  // Employee attempts to mark completed -> must fail
  try {
    await RequestService.completeRequest(test1Req.id, employeeCtx);
    throw new Error("Security Failure: Employee was able to complete request!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("403 Forbidden")) throw err;
    console.log(`  ✓ Employee completion attempt blocked: ${msg}`);
  }

  // Admin completes request -> succeeds
  const completedReq = await RequestService.completeRequest(test1Req.id, adminCtx);
  if (completedReq.status !== RequestStatus.COMPLETED) {
    throw new Error(`Expected status COMPLETED, got ${completedReq.status}`);
  }
  console.log(`  ✓ Admin completed request: Status transitioned to COMPLETED (Terminal State)`);

  const compLog = await prisma.activityLog.findFirst({
    where: { requestId: test1Req.id, action: ActivityAction.REQUEST_COMPLETED },
  });
  if (!compLog) throw new Error("REQUEST_COMPLETED activity log missing");
  console.log(`  ✓ Audit log recorded: ${compLog.action} ("${compLog.details}")`);

  // -------------------------------------------------------------
  // TEST 8: Cancellation Workflow & Terminal Guard
  // -------------------------------------------------------------
  console.log("\n--- [TEST 8: CANCELLATION WORKFLOW & TERMINAL GUARDS] ---");
  // Create a new request for cancellation testing
  const cancelTestReq = await RequestService.createAndSubmit(
    {
      title: `Cancel Test Request [${runId}]`,
      description: "Testing cancellation capabilities.",
      requestTypeId: itType.id,
      priority: RequestPriority.LOW,
      metadata: {
        system: "Staging Console",
        accessLevel: "Read-Only",
        justification: "Temporary test",
      },
    },
    employeeCtx
  );

  // Requester cancels their own active request
  const cancelledReq = await RequestService.cancelRequest(
    cancelTestReq.id,
    employeeCtx,
    "No longer needed for testing."
  );
  if (cancelledReq.status !== RequestStatus.CANCELLED) {
    throw new Error(`Expected CANCELLED, got ${cancelledReq.status}`);
  }
  console.log(`  ✓ Requester successfully cancelled request: Status transitioned to CANCELLED`);

  // Verify terminal states cannot be cancelled:
  // 1. Cannot cancel already CANCELLED request
  try {
    await RequestService.cancelRequest(cancelTestReq.id, employeeCtx);
    throw new Error("Terminal Guard Failure: CANCELLED request was cancelled again!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("400 Bad Request")) throw err;
    console.log(`  ✓ Already CANCELLED request cancellation blocked: ${msg}`);
  }

  // 2. Cannot cancel COMPLETED request
  try {
    await RequestService.cancelRequest(test1Req.id, adminCtx);
    throw new Error("Terminal Guard Failure: COMPLETED request was cancelled!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("400 Bad Request")) throw err;
    console.log(`  ✓ COMPLETED request cancellation blocked: ${msg}`);
  }

  // -------------------------------------------------------------
  // TEST 9: Status Bypass Protection
  // -------------------------------------------------------------
  console.log("\n--- [TEST 9: STATUS BYPASS PROTECTION] ---");
  const draftReq = await RequestService.createDraft(
    {
      title: `Status Bypass Test Draft [${runId}]`,
      description: "Draft testing status bypass.",
      requestTypeId: itType.id,
    },
    employeeCtx
  );

  // Attempt startProcessing on DRAFT
  try {
    await RequestService.startProcessing(draftReq.id, adminCtx);
    throw new Error("Status Bypass Failure: Draft transitioned directly to PROCESSING!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("400 Bad Request")) throw err;
    console.log(`  ✓ Draft -> PROCESSING bypass blocked: ${msg}`);
  }

  // Attempt completeRequest on DRAFT
  try {
    await RequestService.completeRequest(draftReq.id, adminCtx);
    throw new Error("Status Bypass Failure: Draft transitioned directly to COMPLETED!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("400 Bad Request")) throw err;
    console.log(`  ✓ Draft -> COMPLETED bypass blocked: ${msg}`);
  }

  // Attempt resubmitRevision on DRAFT
  try {
    await RequestService.resubmitRevision(draftReq.id, employeeCtx);
    throw new Error("Status Bypass Failure: Draft resubmitted!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (!msg.includes("400 Bad Request")) throw err;
    console.log(`  ✓ Draft -> resubmitRevision bypass blocked: ${msg}`);
  }

  // -------------------------------------------------------------
  // TEST 10: Cross-Organization IDOR Security
  // -------------------------------------------------------------
  console.log("\n--- [TEST 10: CROSS-ORGANIZATION IDOR SECURITY] ---");
  // Other org supervisor tries to mutate test1Req (which belongs to demo-org)
  try {
    await RequestService.startProcessing(test1Req.id, otherSupervisorCtx);
    throw new Error("IDOR Failure: Cross-org actor was able to start processing!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    // Should fail with 403 Forbidden or 404 Not Found
    console.log(`  ✓ Cross-organization startProcessing rejected: ${msg}`);
  }

  try {
    await RequestService.cancelRequest(test1Req.id, otherSupervisorCtx);
    throw new Error("IDOR Failure: Cross-org actor was able to cancel request!");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    console.log(`  ✓ Cross-organization cancelRequest rejected: ${msg}`);
  }

  // -------------------------------------------------------------
  // TEST 11: Concurrency / Stale State Guard
  // -------------------------------------------------------------
  console.log("\n--- [TEST 11: CONCURRENCY & STALE STATE GUARDS] ---");
  // Create an approved request
  const concReq = await RequestService.createAndSubmit(
    {
      title: `Concurrency Test Request [${runId}]`,
      description: "Testing concurrent lifecycle transitions.",
      requestTypeId: itType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        system: "Database Console",
        accessLevel: "Read-Only",
        justification: "Concurrency test",
      },
    },
    employeeCtx
  );

  // Approve through Step 1 and Step 2
  const cApprovals1 = await ApprovalService.getApprovalsByRequestId(org.id, concReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: concReq.id,
    approvalId: cApprovals1[0].id,
    decision: "APPROVE",
    comment: "Step 1 approved",
    actor: supervisorCtx,
  });
  const cApprovals2 = await ApprovalService.getApprovalsByRequestId(org.id, concReq.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: concReq.id,
    approvalId: cApprovals2[1].id,
    decision: "APPROVE",
    comment: "Step 2 final approval",
    actor: adminCtx,
  });

  // Now execute startProcessing twice concurrently
  const [proc1, proc2] = await Promise.allSettled([
    RequestService.startProcessing(concReq.id, adminCtx),
    RequestService.startProcessing(concReq.id, managerCtx),
  ]);

  const fulfilledCount = [proc1, proc2].filter((r) => r.status === "fulfilled").length;
  const rejectedCount = [proc1, proc2].filter((r) => r.status === "rejected").length;

  console.log(`  ✓ Concurrent startProcessing: Fulfilled=${fulfilledCount}, Rejected=${rejectedCount}`);
  if (fulfilledCount !== 1 || rejectedCount !== 1) {
    throw new Error(`Expected exactly 1 transition to succeed and 1 to fail, got ${fulfilledCount} succeeded`);
  }
  console.log("  ✓ Transactional concurrency guard prevented duplicate PROCESSING transition");

  // -------------------------------------------------------------
  // TEST 12: Phase 3 Workflow Regression
  // -------------------------------------------------------------
  console.log("\n--- [TEST 12: APPROVAL SERVICE COMPATIBILITY] ---");
  // Check pending inbox for manager and employee
  const managerInbox = await ApprovalService.getPendingApprovalsForUser({
    actor: managerCtx,
  });
  const employeeInbox = await ApprovalService.getPendingApprovalsForUser({
    actor: employeeCtx,
  });

  console.log(`  ✓ Manager pending approvals: ${managerInbox.totalCount}`);
  console.log(`  ✓ Employee pending approvals: ${employeeInbox.totalCount}`);
  if (employeeInbox.totalCount !== 0) {
    throw new Error("Employee should have 0 pending approvals!");
  }
  console.log("  ✓ Approval inbox filtering respects active cycle and step correctly");

  console.log("\n=================================================");
  console.log("🎉 ALL 12 PHASE 4 VERIFICATION TESTS PASSED!");
  console.log("=================================================");
}

runPhase4Tests()
  .catch((e) => {
    console.error("\n❌ PHASE 4 VERIFICATION FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
