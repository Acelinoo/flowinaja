"use server";

import { requireAuthenticatedUser } from "@/lib/auth/server";
import { ApprovalService } from "@/services/approval.service";
import { revalidatePath } from "next/cache";

export interface ApprovalActionState {
  success: boolean;
  error?: string;
  decision?: string;
}

export async function decideApprovalAction(
  _prevState: ApprovalActionState | null,
  formData: FormData
): Promise<ApprovalActionState> {
  try {
    const user = await requireAuthenticatedUser();

    const requestId = formData.get("requestId")?.toString();
    const approvalId = formData.get("approvalId")?.toString();
    const decision = formData.get("decision")?.toString() as
      | "APPROVE"
      | "REJECT"
      | "REQUEST_REVISION";
    const comment = formData.get("comment")?.toString();

    if (!requestId || !approvalId || !decision) {
      return {
        success: false,
        error: "Parameter yang diperlukan untuk keputusan persetujuan tidak lengkap",
      };
    }

    if (!["APPROVE", "REJECT", "REQUEST_REVISION"].includes(decision)) {
      return {
        success: false,
        error: `Keputusan persetujuan '${decision}' tidak valid`,
      };
    }

    const result = await ApprovalService.decideApproval({
      organizationId: user.organizationId,
      requestId,
      approvalId,
      decision,
      comment,
      actor: user,
    });

    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/approvals");
    revalidatePath("/requests");

    return {
      success: true,
      decision: result.decision,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mencatat keputusan persetujuan";
    return {
      success: false,
      error: message,
    };
  }
}
