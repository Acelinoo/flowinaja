import {
  PrismaClient,
  NotificationType,
  RequestPriority,
  UserRole,
} from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import { ApprovalService } from "../src/services/approval.service";
import { NotificationService } from "../src/services/notification.service";
import { CurrentUserContext } from "../src/types";

const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("🧪 RUNNING FLOWINAJA PHASE 5 VERIFICATION SUITE");
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

  // Second employee in the same tenant to test recipient isolation
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



  // Reset preferences to default enabled for clean test run
  await prisma.notificationPreference.deleteMany({
    where: {
      userId: { in: [employeeUser.id, supervisorUser.id, managerUser.id, adminUser.id, employee2User.id] },
    },
  });

  const requestTypes = await RequestService.getRequestTypes(org.id);
  const purType = requestTypes.find((t) => t.code === "REQ-PUR")!; // 2-step: SUPERVISOR -> MANAGER
  const itType = requestTypes.find((t) => t.code === "REQ-IT")!;   // 1-step: SUPERVISOR

  const runId = Date.now().toString().slice(-4);

  // -------------------------------------------------------------
  // TEST 1 & 2: Submission Alerts & Self-Notification Exclusion
  // -------------------------------------------------------------
  console.log("\n--- [TEST 1 & 2: SUBMISSION ALERTS & SELF-NOTIFICATION EXCLUSION] ---");
  const req1 = await RequestService.createAndSubmit(
    {
      title: `Phase 5 Request 1 [${runId}]`,
      description: "Procurement test for notification dispatch.",
      requestTypeId: purType.id,
      priority: RequestPriority.HIGH,
      metadata: {
        item: "4K High-Res Monitor",
        quantity: 1,
        estimatedCost: 8000000,
        justification: "UX testing requirement",
      },
    },
    employeeCtx
  );

  // Check Step 1 approver (supervisor) received APPROVAL_PENDING
  const supervisorNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: supervisorUser.id,
      requestId: req1.id,
      type: NotificationType.APPROVAL_PENDING,
    },
  });
  if (supervisorNotifs.length === 0) {
    throw new Error("Supervisor did not receive APPROVAL_PENDING notification on request submission!");
  }
  console.log(`  ✓ Supervisor received APPROVAL_PENDING: "${supervisorNotifs[0].title}"`);

  // Requester (employee) must NOT receive APPROVAL_PENDING for their own request
  const employeeSelfNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req1.id,
      type: NotificationType.APPROVAL_PENDING,
    },
  });
  if (employeeSelfNotifs.length > 0) {
    throw new Error("Requester incorrectly received APPROVAL_PENDING notification for their own request!");
  }
  console.log("  ✓ Requester correctly excluded from self-approval pending notification");

  // -------------------------------------------------------------
  // TEST 3: Multi-Step Advancement
  // -------------------------------------------------------------
  console.log("\n--- [TEST 3: MULTI-STEP ADVANCEMENT NOTIFICATION] ---");
  let approvals = await ApprovalService.getApprovalsByRequestId(org.id, req1.id);
  const step1Approval = approvals.find((a) => a.stepOrder === 1 && a.cycle === 1)!;

  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: req1.id,
    approvalId: step1Approval.id,
    decision: "APPROVE",
    comment: "Step 1 approved by supervisor.",
    actor: supervisorCtx,
  });

  // Check Step 2 approver (manager) received APPROVAL_PENDING
  const managerNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: managerUser.id,
      requestId: req1.id,
      type: NotificationType.APPROVAL_PENDING,
      stepOrder: 2,
    },
  });
  if (managerNotifs.length === 0) {
    throw new Error("Manager did not receive APPROVAL_PENDING notification on Step 2 advancement!");
  }
  console.log(`  ✓ Manager received Step 2 APPROVAL_PENDING: "${managerNotifs[0].title}"`);

  // -------------------------------------------------------------
  // TEST 4: Step 3 Sign-off & Final Approval Notification
  // -------------------------------------------------------------
  console.log("\n--- [TEST 4: STEP 3 SIGN-OFF & FINAL APPROVAL NOTIFICATION TO REQUESTER] ---");
  approvals = await ApprovalService.getApprovalsByRequestId(org.id, req1.id);
  const step2Approval = approvals.find((a) => a.stepOrder === 2 && a.cycle === 1)!;

  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: req1.id,
    approvalId: step2Approval.id,
    decision: "APPROVE",
    comment: "Step 2 approval granted by manager.",
    actor: managerCtx,
  });

  // Check Step 3 approver (admin) received APPROVAL_PENDING
  const adminNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: adminUser.id,
      requestId: req1.id,
      type: NotificationType.APPROVAL_PENDING,
      stepOrder: 3,
    },
  });
  if (adminNotifs.length === 0) {
    throw new Error("Admin did not receive APPROVAL_PENDING notification on Step 3 advancement!");
  }
  console.log(`  ✓ Admin received Step 3 APPROVAL_PENDING: "${adminNotifs[0].title}"`);

  // Final Step: Admin approves Step 3
  approvals = await ApprovalService.getApprovalsByRequestId(org.id, req1.id);
  const step3Approval = approvals.find((a) => a.stepOrder === 3 && a.cycle === 1)!;

  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: req1.id,
    approvalId: step3Approval.id,
    decision: "APPROVE",
    comment: "Step 3 final sign-off granted by admin.",
    actor: adminCtx,
  });

  const req1ApprovedNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req1.id,
      type: NotificationType.REQUEST_APPROVED,
    },
  });
  if (req1ApprovedNotifs.length === 0) {
    throw new Error("Requester did not receive REQUEST_APPROVED notification upon final sign-off!");
  }
  console.log(`  ✓ Requester received REQUEST_APPROVED notification: "${req1ApprovedNotifs[0].title}"`);

  // -------------------------------------------------------------
  // TEST 5: Rejection Notification
  // -------------------------------------------------------------
  console.log("\n--- [TEST 5: REJECTION NOTIFICATION TO REQUESTER] ---");
  const req2 = await RequestService.createAndSubmit(
    {
      title: `Phase 5 Request 2 (Rejection) [${runId}]`,
      description: "Request to be rejected.",
      requestTypeId: itType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        system: "Unapproved Internal System",
        accessLevel: "Admin Privilege",
        justification: "Testing rejection alerts",
      },
    },
    employeeCtx
  );

  const req2Approvals = await ApprovalService.getApprovalsByRequestId(org.id, req2.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: req2.id,
    approvalId: req2Approvals[0].id,
    decision: "REJECT",
    comment: "Does not meet security compliance.",
    actor: supervisorCtx,
  });

  const req2RejectedNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req2.id,
      type: NotificationType.REQUEST_REJECTED,
    },
  });
  if (req2RejectedNotifs.length === 0) {
    throw new Error("Requester did not receive REQUEST_REJECTED notification!");
  }
  console.log(`  ✓ Requester received REQUEST_REJECTED notification: "${req2RejectedNotifs[0].title}"`);

  // -------------------------------------------------------------
  // TEST 6 & 7: Revision Requested & Revision Resubmitted
  // -------------------------------------------------------------
  console.log("\n--- [TEST 6 & 7: REVISION REQUESTED & RESUBMISSION ALERTS] ---");
  const req3 = await RequestService.createAndSubmit(
    {
      title: `Phase 5 Request 3 (Revision) [${runId}]`,
      description: "Request to undergo revision cycle.",
      requestTypeId: itType.id,
      priority: RequestPriority.HIGH,
      metadata: {
        system: "Figma Enterprise Tool",
        accessLevel: "Editor License",
        justification: "Design team collaboration requirement",
      },
    },
    employeeCtx
  );

  const req3Approvals = await ApprovalService.getApprovalsByRequestId(org.id, req3.id);
  await ApprovalService.decideApproval({
    organizationId: org.id,
    requestId: req3.id,
    approvalId: req3Approvals[0].id,
    decision: "REQUEST_REVISION",
    comment: "Please specify number of required editor seats.",
    actor: supervisorCtx,
  });

  const revReqNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req3.id,
      type: NotificationType.REVISION_REQUESTED,
    },
  });
  if (revReqNotifs.length === 0) {
    throw new Error("Requester did not receive REVISION_REQUESTED notification!");
  }
  console.log(`  ✓ Requester received REVISION_REQUESTED: "${revReqNotifs[0].title}"`);

  // Update revision specifications and resubmit (transitions to Cycle 2)
  await RequestService.updateRevision(
    req3.id,
    {
      title: `Phase 5 Request 3 (Revision Resubmitted) [${runId}]`,
      description: "Updated with seat count details.",
      metadata: {
        system: "Figma Enterprise Tool",
        accessLevel: "Editor License",
        justification: "Design team collaboration - 5 editor seats required",
      },
    },
    employeeCtx
  );

  await RequestService.resubmitRevision(req3.id, employeeCtx);

  const cycle2ApproverNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: supervisorUser.id,
      requestId: req3.id,
      type: NotificationType.APPROVAL_PENDING,
      cycle: 2,
    },
  });
  if (cycle2ApproverNotifs.length === 0) {
    throw new Error("Step 1 approver did not receive APPROVAL_PENDING notification on cycle 2 resubmission!");
  }
  console.log(`  ✓ Supervisor received Cycle 2 APPROVAL_PENDING: "${cycle2ApproverNotifs[0].title}" (Cycle 2)`);

  // -------------------------------------------------------------
  // TEST 8 & 9: Processing & Completion Notifications
  // -------------------------------------------------------------
  console.log("\n--- [TEST 8 & 9: PROCESSING & COMPLETION ALERTS] ---");
  // Req1 is APPROVED from earlier. Start processing by Admin
  await RequestService.startProcessing(req1.id, adminCtx);

  const processingNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req1.id,
      type: NotificationType.REQUEST_PROCESSING,
    },
  });
  if (processingNotifs.length === 0) {
    throw new Error("Requester did not receive REQUEST_PROCESSING notification!");
  }
  console.log(`  ✓ Requester received REQUEST_PROCESSING: "${processingNotifs[0].title}"`);

  // Complete processing by Admin
  await RequestService.completeRequest(req1.id, adminCtx);

  const completedNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req1.id,
      type: NotificationType.REQUEST_COMPLETED,
    },
  });
  if (completedNotifs.length === 0) {
    throw new Error("Requester did not receive REQUEST_COMPLETED notification!");
  }
  console.log(`  ✓ Requester received REQUEST_COMPLETED: "${completedNotifs[0].title}"`);

  // -------------------------------------------------------------
  // TEST 10: Cancellation Notification
  // -------------------------------------------------------------
  console.log("\n--- [TEST 10: CANCELLATION NOTIFICATION] ---");
  const req4 = await RequestService.createAndSubmit(
    {
      title: `Phase 5 Request 4 (Cancellation) [${runId}]`,
      description: "Request to be cancelled by admin.",
      requestTypeId: itType.id,
      priority: RequestPriority.LOW,
      metadata: {
        system: "Temporary Diagnostic Utility",
        accessLevel: "Read-Only Access",
        justification: "Testing cancellation alerts workflow",
      },
    },
    employeeCtx
  );

  await RequestService.cancelRequest(req4.id, adminCtx, "Cancelled per admin review.");

  const cancelNotifs = await prisma.notification.findMany({
    where: {
      organizationId: org.id,
      recipientId: employeeUser.id,
      requestId: req4.id,
      type: NotificationType.REQUEST_CANCELLED,
    },
  });
  if (cancelNotifs.length === 0) {
    throw new Error("Requester did not receive REQUEST_CANCELLED notification!");
  }
  console.log(`  ✓ Requester received REQUEST_CANCELLED: "${cancelNotifs[0].title}"`);

  // -------------------------------------------------------------
  // TEST 11: Multi-Tenant Isolation
  // -------------------------------------------------------------
  console.log("\n--- [TEST 11: MULTI-TENANT NOTIFICATION ISOLATION] ---");
  const otherOrgNotifs = await NotificationService.getNotificationsForUser({
    organizationId: otherOrg.id,
    userId: otherSupervisorUser.id,
  });

  const leakedDemoOrgNotif = otherOrgNotifs.notifications.find((n) => n.organizationId === org.id);
  if (leakedDemoOrgNotif) {
    throw new Error("CRITICAL SECURITY VIOLATION: Cross-tenant notification leakage detected!");
  }
  console.log(`  ✓ Other Org user notifications strictly isolated (found ${otherOrgNotifs.totalCount} notifs, 0 cross-tenant)`);

  // -------------------------------------------------------------
  // TEST 12: Recipient Isolation Within Same Tenant
  // -------------------------------------------------------------
  console.log("\n--- [TEST 12: RECIPIENT ISOLATION WITHIN SAME TENANT] ---");
  const emp2Notifs = await NotificationService.getNotificationsForUser({
    organizationId: org.id,
    userId: employee2User.id,
  });

  const emp1NotifInEmp2Inbox = emp2Notifs.notifications.find((n) => n.recipientId !== employee2User.id);
  if (emp1NotifInEmp2Inbox) {
    throw new Error("Recipient isolation violated: Employee 2 received another user's notification!");
  }
  console.log("  ✓ Recipient isolation verified: User only sees notifications explicitly addressed to them");

  // -------------------------------------------------------------
  // TEST 13 & 14: Single Read & Mark All as Read
  // -------------------------------------------------------------
  console.log("\n--- [TEST 13 & 14: READ STATUS & BULK MARK ALL AS READ] ---");
  const unreadBefore = await NotificationService.getUnreadCount(org.id, employeeUser.id);
  if (unreadBefore === 0) {
    throw new Error("Expected unread notifications for employee, found 0");
  }

  // Single mark read
  const notifToRead = completedNotifs[0];
  const readResult = await NotificationService.markAsRead(notifToRead.id, employeeUser.id, org.id);
  if (!readResult.isRead || !readResult.readAt) {
    throw new Error("Notification was not marked as read with timestamp");
  }
  console.log(`  ✓ Single markAsRead verified for notif ID ${notifToRead.id}, isRead: ${readResult.isRead}`);

  // Bulk mark all read
  const bulkResult = await NotificationService.markAllAsRead(org.id, employeeUser.id);
  const unreadAfterBulk = await NotificationService.getUnreadCount(org.id, employeeUser.id);
  if (unreadAfterBulk !== 0) {
    throw new Error(`Expected 0 unread notifications after bulk mark read, found ${unreadAfterBulk}`);
  }
  console.log(`  ✓ markAllAsRead marked ${bulkResult.count} notifications as read. Unread count now: ${unreadAfterBulk}`);

  // -------------------------------------------------------------
  // TEST 15 & 16: Unread Count, Pagination & Filter
  // -------------------------------------------------------------
  console.log("\n--- [TEST 15 & 16: UNREAD COUNT, PAGINATION & FILTER] ---");
  // Clean up prior test notifications for employee2 for test idempotency
  await prisma.notification.deleteMany({
    where: { recipientId: employee2User.id },
  });

  // Create two unread notifications for employee2
  await prisma.notification.createMany({
    data: [
      {
        organizationId: org.id,
        recipientId: employee2User.id,
        type: NotificationType.REQUEST_APPROVED,
        title: "Test Page 1",
        message: "Message 1",
        isRead: false,
      },
      {
        organizationId: org.id,
        recipientId: employee2User.id,
        type: NotificationType.REQUEST_APPROVED,
        title: "Test Page 2",
        message: "Message 2",
        isRead: true,
        readAt: new Date(),
      },
    ],
  });

  const emp2UnreadCount = await NotificationService.getUnreadCount(org.id, employee2User.id);
  if (emp2UnreadCount !== 1) {
    throw new Error(`Expected unread count of 1 for employee2, got ${emp2UnreadCount}`);
  }
  console.log(`  ✓ Fast unreadCount verified: ${emp2UnreadCount}`);

  const unreadOnlyPage = await NotificationService.getNotificationsForUser({
    organizationId: org.id,
    userId: employee2User.id,
    unreadOnly: true,
  });
  if (unreadOnlyPage.notifications.some((n) => n.isRead)) {
    throw new Error("unreadOnly returned read notifications!");
  }
  console.log(`  ✓ unreadOnly filter verified: returned ${unreadOnlyPage.notifications.length} unread items`);

  // -------------------------------------------------------------
  // TEST 17: Anti-Duplicate Notification Protection (dedupeKey)
  // -------------------------------------------------------------
  console.log("\n--- [TEST 17: ANTI-DUPLICATE NOTIFICATION PROTECTION] ---");
  const countBeforeDedupe = await prisma.notification.count({
    where: {
      organizationId: org.id,
      recipientId: supervisorUser.id,
      requestId: req1.id,
      type: NotificationType.APPROVAL_PENDING,
      cycle: 1,
      stepOrder: 1,
    },
  });

  // Re-trigger dispatch for same request, cycle, and step
  await NotificationService.dispatchApprovalPendingNotifications({
    id: req1.id,
    title: req1.title,
    organizationId: org.id,
    requesterId: employeeUser.id,
    currentCycle: 1,
    currentStepOrder: 1,
  });

  const countAfterDedupe = await prisma.notification.count({
    where: {
      organizationId: org.id,
      recipientId: supervisorUser.id,
      requestId: req1.id,
      type: NotificationType.APPROVAL_PENDING,
      cycle: 1,
      stepOrder: 1,
    },
  });

  if (countAfterDedupe !== countBeforeDedupe) {
    throw new Error(`Deduplication failed! Count before: ${countBeforeDedupe}, count after: ${countAfterDedupe}`);
  }
  console.log(`  ✓ Anti-duplicate dedupeKey protection verified: duplicate trigger did not duplicate notification row (count: ${countAfterDedupe})`);

  // -------------------------------------------------------------
  // TEST 18: Notification Preferences Suppression
  // -------------------------------------------------------------
  console.log("\n--- [TEST 18: IN-APP PREFERENCE SUPPRESSION] ---");
  // Set employee2 preferences to disable requestUpdates
  await NotificationService.updatePreferences(org.id, employee2User.id, employee2User.role, {
    requestUpdates: false,
  });

  const suppressedNotif = await NotificationService.dispatchLifecycleNotification({
    organizationId: org.id,
    recipientId: employee2User.id,
    requestId: req1.id,
    type: NotificationType.REQUEST_APPROVED,
    title: "Should be suppressed",
    message: "Suppressed test message",
  });

  if (suppressedNotif !== null) {
    throw new Error("Notification was not suppressed despite user opting out of requestUpdates!");
  }
  console.log("  ✓ Preference suppression verified: REQUEST_APPROVED suppressed when requestUpdates is false");

  // -------------------------------------------------------------
  // TEST 19: Mandatory Approval Notifications for Approver Roles
  // -------------------------------------------------------------
  console.log("\n--- [TEST 19: MANDATORY APPROVER PREFERENCE INVARIANT] ---");
  // Attempt to disable approvalPending for Supervisor
  const supervisorUpdatedPref = await NotificationService.updatePreferences(
    org.id,
    supervisorUser.id,
    supervisorUser.role,
    {
      approvalPending: false, // Disallowed for approvers!
    }
  );

  if (supervisorUpdatedPref.approvalPending !== true) {
    throw new Error("CRITICAL RULE VIOLATION: Approver was allowed to disable mandatory approvalPending notifications!");
  }
  console.log("  ✓ Mandatory approver invariant verified: supervisor approvalPending remained true");

  // -------------------------------------------------------------
  // TEST 20: IDOR & Cross-Tenant Read Protection
  // -------------------------------------------------------------
  console.log("\n--- [TEST 20: IDOR & CROSS-TENANT ACCESS PROTECTION] ---");
  let idorBlocked = false;
  try {
    // Other org supervisor tries to mark employee's notification as read
    await NotificationService.markAsRead(notifToRead.id, otherSupervisorUser.id, otherOrg.id);
  } catch {
    idorBlocked = true;
  }

  if (!idorBlocked) {
    throw new Error("IDOR VIOLATION: Cross-tenant/unauthorized user marked another user's notification as read!");
  }
  console.log("  ✓ IDOR protection verified: Cross-tenant notification markAsRead threw 404/unauthorized");

  console.log("\n=================================================");
  console.log("🎉 ALL 20 PHASE 5 TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================\n");
}

runPhase5Tests()
  .catch((err) => {
    console.error("❌ PHASE 5 TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
