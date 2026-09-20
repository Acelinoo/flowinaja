import { PrismaClient, RequestStatus, RequestPriority, ActivityAction } from "@prisma/client";
import { RequestService } from "../src/services/request.service";
import {
  validateCommonFields,
  validateTypeSpecificMetadata,
} from "../src/lib/validations/request.schema";
import { CurrentUserContext } from "../src/types";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=================================================");
  console.log("🧪 RUNNING FLOWINAJA PHASE 2 VERIFICATION SUITE");
  console.log("=================================================");

  // 1. Fetch seed users and organization
  const org = await prisma.organization.findUnique({ where: { slug: "demo-org" } });
  if (!org) throw new Error("Seed organization 'demo-org' not found!");

  const employeeUser = await prisma.user.findUnique({ where: { email: "employee@flowinaja.local" } });
  const supervisorUser = await prisma.user.findUnique({ where: { email: "supervisor@flowinaja.local" } });

  if (!employeeUser || !supervisorUser) {
    throw new Error("Seeded users not found!");
  }

  const employeeContext: CurrentUserContext = {
    id: employeeUser.id,
    name: employeeUser.name,
    email: employeeUser.email,
    role: employeeUser.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: employeeUser.departmentId,
  };

  const supervisorContext: CurrentUserContext = {
    id: supervisorUser.id,
    name: supervisorUser.name,
    email: supervisorUser.email,
    role: supervisorUser.role,
    organizationId: org.id,
    organizationName: org.name,
    departmentId: supervisorUser.departmentId,
  };

  console.log(`✓ Tenant verified: ${org.name} (${org.id})`);
  console.log(`✓ Requester: ${employeeContext.name} [${employeeContext.role}]`);
  console.log(`✓ Second User: ${supervisorContext.name} [${supervisorContext.role}]`);

  // 2. Request Types Verification
  console.log("\n--- [TEST 1: REQUEST TYPES VERIFICATION] ---");
  const requestTypes = await RequestService.getRequestTypes(org.id);
  console.log(`Found ${requestTypes.length} active Request Types`);
  if (requestTypes.length < 5) {
    throw new Error(`Expected at least 5 Request Types, found ${requestTypes.length}`);
  }

  const expectedCodes = ["REQ-PUR", "REQ-IT", "REQ-MNT", "REQ-TRV", "REQ-GEN"];
  for (const code of expectedCodes) {
    const found = requestTypes.find((t) => t.code === code);
    if (!found) throw new Error(`Missing expected request type code: ${code}`);
    console.log(`  ✓ Type: ${found.name} (${found.code}) with ${found.approvalSteps.length} sequential steps`);
    if (found.approvalSteps.length === 0) {
      throw new Error(`Request type ${found.name} must have sequential approval steps!`);
    }
  }

  // 3. Validation Logic Verification
  console.log("\n--- [TEST 2: COMMON & TYPE-SPECIFIC VALIDATION] ---");

  // Title validation
  const emptyTitle = validateCommonFields({ title: "", description: "test desc", requestTypeId: "123" });
  if (emptyTitle.success) throw new Error("Validation failed: empty title should fail");
  console.log("  ✓ Empty title rejected");

  const shortTitle = validateCommonFields({ title: "ab", description: "test desc", requestTypeId: "123" });
  if (shortTitle.success) throw new Error("Validation failed: short title (<3 chars) should fail");
  console.log("  ✓ Short title (<3 chars) rejected");

  // Purchase Request Metadata validation
  const invalidPur = validateTypeSpecificMetadata("REQ-PUR", {
    item: "Laptop",
    quantity: -1,
    estimatedCost: 20000000,
    justification: "Dev work",
  });
  if (invalidPur.success) throw new Error("Validation failed: negative quantity should fail");
  console.log("  ✓ Purchase request negative quantity rejected");

  const validPur = validateTypeSpecificMetadata("REQ-PUR", {
    item: "MacBook Pro M3",
    quantity: 2,
    estimatedCost: 60000000,
    justification: "Engineering deployment requirement",
  });
  if (!validPur.success) throw new Error("Validation failed: valid purchase metadata rejected");
  console.log("  ✓ Valid purchase metadata passed");

  // IT Access Metadata validation
  const invalidIT = validateTypeSpecificMetadata("REQ-IT", {
    system: "AWS",
    accessLevel: "",
    justification: "Need it",
  });
  if (invalidIT.success) throw new Error("Validation failed: missing accessLevel should fail");
  console.log("  ✓ IT access missing access level rejected");

  // Maintenance Metadata validation
  const invalidMnt = validateTypeSpecificMetadata("REQ-MNT", {
    location: "Floor 2",
    issue: "AC broken",
    urgency: "INVALID_URGENCY",
    issueDetails: "Details here",
  });
  if (invalidMnt.success) throw new Error("Validation failed: invalid urgency should fail");
  console.log("  ✓ Maintenance invalid urgency rejected");

  // Business Travel Metadata validation
  const invalidTravel = validateTypeSpecificMetadata("REQ-TRV", {
    destination: "Surabaya",
    travelDate: "2026-10-10",
    returnDate: "2026-10-05", // earlier than travelDate
    purpose: "Client meeting",
  });
  if (invalidTravel.success) throw new Error("Validation failed: returnDate earlier than travelDate should fail");
  console.log("  ✓ Business travel invalid return date rejected");

  // 4. Draft Creation & Audit Log Verification
  console.log("\n--- [TEST 3: DRAFT CREATION & AUDIT LOG] ---");
  const purType = requestTypes.find((t) => t.code === "REQ-PUR")!;

  const runId = Date.now().toString().slice(-4);
  const draft = await RequestService.createDraft(
    {
      title: `Procurement of 2 Developer Monitors [${runId}]`,
      description: "Dual 4K monitors for mobile development workstation.",
      requestTypeId: purType.id,
      priority: RequestPriority.HIGH,
      metadata: {
        item: "Dell UltraSharp 27",
        quantity: 2,
        estimatedCost: 14000000,
        justification: "Multi-window UI/UX engineering",
      },
    },
    employeeContext
  );

  console.log(`  ✓ Draft created: ID ${draft.id}, Status: ${draft.status}, Title: "${draft.title}"`);
  if (draft.status !== RequestStatus.DRAFT) {
    throw new Error(`Expected status DRAFT, got ${draft.status}`);
  }

  // Verify activity log for creation
  const logsAfterDraft = await prisma.activityLog.findMany({
    where: { requestId: draft.id },
  });
  if (logsAfterDraft.length !== 1 || logsAfterDraft[0].action !== ActivityAction.REQUEST_CREATED) {
    throw new Error(`Expected 1 REQUEST_CREATED log, found: ${JSON.stringify(logsAfterDraft)}`);
  }
  console.log(`  ✓ Audit log confirmed: ${logsAfterDraft[0].action} recorded`);

  // 5. Draft Update Verification
  console.log("\n--- [TEST 4: DRAFT UPDATE & AUDIT LOG] ---");
  const updatedDraft = await RequestService.updateDraft(
    draft.id,
    {
      title: `Procurement of 3 Developer Monitors [${runId}]`,
      priority: RequestPriority.URGENT,
      metadata: {
        item: "Dell UltraSharp 27 4K",
        quantity: 3,
        estimatedCost: 21000000,
        justification: "Multi-window UI/UX engineering for upcoming product launch",
      },
    },
    employeeContext
  );

  console.log(`  ✓ Draft updated: Title: "${updatedDraft.title}", Priority: ${updatedDraft.priority}`);
  if (updatedDraft.title !== `Procurement of 3 Developer Monitors [${runId}]`) {
    throw new Error("Update failed to change title");
  }

  // Verify activity log for update
  const logsAfterUpdate = await prisma.activityLog.findMany({
    where: { requestId: draft.id },
    orderBy: { createdAt: "desc" },
  });
  if (logsAfterUpdate.length !== 2 || logsAfterUpdate[0].action !== ActivityAction.REQUEST_UPDATED) {
    throw new Error(`Expected REQUEST_UPDATED log, found: ${JSON.stringify(logsAfterUpdate)}`);
  }
  console.log(`  ✓ Audit log confirmed: ${logsAfterUpdate[0].action} recorded`);

  // 6. Security & IDOR Verification
  console.log("\n--- [TEST 5: SECURITY & IDOR ISOLATION] ---");

  // Attempt to edit another user's draft
  let idorBlocked = false;
  try {
    await RequestService.updateDraft(
      draft.id,
      { title: "Hacked by Supervisor" },
      supervisorContext
    );
  } catch (err: unknown) {
    idorBlocked = true;
    console.log(`  ✓ Non-owner edit attempt rejected: ${(err as Error).message}`);
  }
  if (!idorBlocked) {
    throw new Error("SECURITY FAILURE: Non-owner was able to update another user's draft!");
  }

  // Attempt to submit another user's draft
  let submitIdorBlocked = false;
  try {
    await RequestService.submitDraft(draft.id, supervisorContext);
  } catch (err: unknown) {
    submitIdorBlocked = true;
    console.log(`  ✓ Non-owner submit attempt rejected: ${(err as Error).message}`);
  }
  if (!submitIdorBlocked) {
    throw new Error("SECURITY FAILURE: Non-owner was able to submit another user's draft!");
  }

  // 7. Draft Submission Verification
  console.log("\n--- [TEST 6: DRAFT SUBMISSION & AUDIT LOG] ---");
  const submitted = await RequestService.submitDraft(draft.id, employeeContext);
  console.log(`  ✓ Draft submitted: Status transitioned to ${submitted.status}`);
  if (submitted.status !== RequestStatus.SUBMITTED && submitted.status !== RequestStatus.IN_REVIEW) {
    throw new Error(`Expected status SUBMITTED or IN_REVIEW, got ${submitted.status}`);
  }

  const logsAfterSubmit = await prisma.activityLog.findMany({
    where: { requestId: draft.id },
    orderBy: { createdAt: "desc" },
  });
  if (logsAfterSubmit[0].action !== ActivityAction.REQUEST_SUBMITTED) {
    throw new Error(`Expected latest log to be REQUEST_SUBMITTED, got ${logsAfterSubmit[0].action}`);
  }
  console.log(`  ✓ Audit log confirmed: ${logsAfterSubmit[0].action} recorded`);

  // 8. Lifecycle Guard (Cannot edit submitted request)
  console.log("\n--- [TEST 7: LIFECYCLE GUARDS] ---");
  let editSubmittedBlocked = false;
  try {
    await RequestService.updateDraft(
      draft.id,
      { title: "Attempt edit submitted" },
      employeeContext
    );
  } catch (err: unknown) {
    editSubmittedBlocked = true;
    console.log(`  ✓ Edit on SUBMITTED request rejected: ${(err as Error).message}`);
  }
  if (!editSubmittedBlocked) {
    throw new Error("LIFECYCLE FAILURE: Able to edit a request that is already SUBMITTED!");
  }

  // Cannot re-submit submitted request
  let resubmitBlocked = false;
  try {
    await RequestService.submitDraft(draft.id, employeeContext);
  } catch (err: unknown) {
    resubmitBlocked = true;
    console.log(`  ✓ Re-submit on SUBMITTED request rejected: ${(err as Error).message}`);
  }
  if (!resubmitBlocked) {
    throw new Error("LIFECYCLE FAILURE: Able to re-submit a request that is already SUBMITTED!");
  }

  // 9. Direct Create-and-Submit Verification
  console.log("\n--- [TEST 8: DIRECT CREATE-AND-SUBMIT] ---");
  const itType = requestTypes.find((t) => t.code === "REQ-IT")!;
  const directSubmit = await RequestService.createAndSubmit(
    {
      title: "AWS Production Read-Only Access",
      description: "Required for debugging production database performance.",
      requestTypeId: itType.id,
      priority: RequestPriority.NORMAL,
      metadata: {
        system: "AWS Production CloudWatch & RDS",
        accessLevel: "Read-Only",
        justification: "Performance profiling during load spike",
      },
    },
    employeeContext
  );

  console.log(`  ✓ Direct created & submitted: ID ${directSubmit.id}, Status: ${directSubmit.status}`);
  if (directSubmit.status !== RequestStatus.SUBMITTED && directSubmit.status !== RequestStatus.IN_REVIEW) {
    throw new Error(`Expected status SUBMITTED or IN_REVIEW, got ${directSubmit.status}`);
  }

  const directLogs = await prisma.activityLog.findMany({
    where: { requestId: directSubmit.id },
    orderBy: { createdAt: "asc" },
  });
  console.log(`  ✓ Direct logs recorded: ${directLogs.map((l) => l.action).join(" -> ")}`);
  if (directLogs.length !== 2 || directLogs[0].action !== ActivityAction.REQUEST_CREATED || directLogs[1].action !== ActivityAction.REQUEST_SUBMITTED) {
    throw new Error("Expected both REQUEST_CREATED and REQUEST_SUBMITTED logs for direct submission");
  }

  // 10. Workspace Queries: Search, Filter, Pagination
  console.log("\n--- [TEST 9: WORKSPACE LISTING, SEARCH, FILTER, PAGINATION] ---");
  const myRequests = await RequestService.listMyRequests({
    organizationId: org.id,
    requesterId: employeeContext.id,
    page: 1,
    limit: 10,
  });

  console.log(`  ✓ Total Employee requests in tenant: ${myRequests.totalCount}`);
  if (myRequests.requests.length < 2) {
    throw new Error("Expected at least 2 requests for employee");
  }

  // Search by title
  const searchResult = await RequestService.listMyRequests({
    organizationId: org.id,
    requesterId: employeeContext.id,
    search: `[${runId}]`,
  });
  console.log(`  ✓ Search query '[${runId}]' matched: ${searchResult.totalCount} request(s)`);
  if (searchResult.totalCount !== 1) {
    throw new Error(`Expected 1 match, found ${searchResult.totalCount}`);
  }

  // Filter by status (query active status of submitted requests)
  const filterSubmitted = await RequestService.listMyRequests({
    organizationId: org.id,
    requesterId: employeeContext.id,
    status: submitted.status,
  });
  console.log(`  ✓ Filter by active status (${submitted.status}) matched: ${filterSubmitted.totalCount} request(s)`);

  // Filter by type
  const filterType = await RequestService.listMyRequests({
    organizationId: org.id,
    requesterId: employeeContext.id,
    requestTypeId: itType.id,
  });
  console.log(`  ✓ Filter by IT Access type matched: ${filterType.totalCount} request(s)`);

  // 11. Request Detail Retrieval
  console.log("\n--- [TEST 10: REQUEST DETAIL FULL GRAPH QUERY] ---");
  const detail = await RequestService.getRequestById(org.id, draft.id);
  if (!detail) throw new Error("Failed to load request detail");
  console.log(`  ✓ Detail loaded: "${detail.title}"`);
  console.log(`    - Requester: ${detail.requester.name} (${detail.requester.role})`);
  console.log(`    - Request Type: ${detail.requestType.name} (${detail.requestType.code})`);
  console.log(`    - Approval Steps: ${detail.requestType.approvalSteps.length} sequential steps`);
  console.log(`    - Activity Logs: ${detail.activityLogs.length} events recorded`);

  console.log("\n=================================================");
  console.log("🎉 ALL PHASE 2 TESTS PASSED PERFECTLY!");
  console.log("=================================================\n");
}

runTests()
  .catch((e) => {
    console.error("\n❌ PHASE 2 VERIFICATION TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
