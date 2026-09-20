"use server";

import { requireAuthenticatedUser } from "@/lib/auth/server";
import { RequestService } from "@/services/request.service";
import { RequestPriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface RequestActionState {
  success: boolean;
  error?: string;
  requestId?: string;
}

/**
 * Helper to extract metadata from FormData.
 * Supports both JSON string in 'metadata' field and prefixed 'meta_*' fields.
 */
function extractMetadata(formData: FormData): Record<string, unknown> {
  const rawMeta = formData.get("metadata");
  if (rawMeta && typeof rawMeta === "string" && rawMeta.trim().startsWith("{")) {
    try {
      return JSON.parse(rawMeta);
    } catch {
      // ignore parse failure and fall through
    }
  }

  const result: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    if (key.startsWith("meta_")) {
      const fieldName = key.replace("meta_", "");
      result[fieldName] = value;
    }
  });

  return result;
}

/**
 * Server action to create a request (either as DRAFT or directly SUBMITTED).
 */
export async function createRequestAction(
  _prevState: RequestActionState | null,
  formData: FormData
): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    const intent = formData.get("intent")?.toString() || "draft";
    const title = formData.get("title")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const requestTypeId = formData.get("requestTypeId")?.toString() || "";
    const priorityRaw = formData.get("priority")?.toString();

    const priority =
      priorityRaw && Object.values(RequestPriority).includes(priorityRaw as RequestPriority)
        ? (priorityRaw as RequestPriority)
        : RequestPriority.NORMAL;

    const metadata = extractMetadata(formData);

    if (intent === "submit") {
      const created = await RequestService.createAndSubmit(
        {
          title,
          description,
          requestTypeId,
          priority,
          metadata,
        },
        user
      );

      revalidatePath("/requests");
      return { success: true, requestId: created.id };
    } else {
      const draft = await RequestService.createDraft(
        {
          title,
          description,
          requestTypeId,
          priority,
          metadata,
        },
        user
      );

      revalidatePath("/requests");
      return { success: true, requestId: draft.id };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat permintaan";
    return { success: false, error: message };
  }
}

/**
 * Server action to update an existing draft request, and optionally submit it.
 */
export async function updateDraftAction(
  requestId: string,
  _prevState: RequestActionState | null,
  formData: FormData
): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    const intent = formData.get("intent")?.toString() || "draft";
    const title = formData.get("title")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const requestTypeId = formData.get("requestTypeId")?.toString() || "";
    const priorityRaw = formData.get("priority")?.toString();

    const priority =
      priorityRaw && Object.values(RequestPriority).includes(priorityRaw as RequestPriority)
        ? (priorityRaw as RequestPriority)
        : RequestPriority.NORMAL;

    const metadata = extractMetadata(formData);

    // 1. Update draft details first
    await RequestService.updateDraft(
      requestId,
      {
        title,
        description,
        requestTypeId,
        priority,
        metadata,
      },
      user
    );

    // 2. If intent is submit, transition status
    if (intent === "submit") {
      await RequestService.submitDraft(requestId, user);
    }

    revalidatePath(`/requests/${requestId}`);
    revalidatePath(`/requests/${requestId}/edit`);
    revalidatePath("/requests");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui draf permintaan";
    return { success: false, error: message };
  }
}

/**
 * Server action to submit an existing draft from the detail view.
 */
export async function submitDraftAction(requestId: string): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    await RequestService.submitDraft(requestId, user);

    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengajukan draf permintaan";
    return { success: false, error: message };
  }
}

/**
 * Server action to update a request in REVISION_REQUIRED status, and optionally resubmit it.
 */
export async function updateRevisionAction(
  requestId: string,
  _prevState: RequestActionState | null,
  formData: FormData
): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    const intent = formData.get("intent")?.toString() || "save";
    const title = formData.get("title")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const priorityRaw = formData.get("priority")?.toString();

    const priority =
      priorityRaw && Object.values(RequestPriority).includes(priorityRaw as RequestPriority)
        ? (priorityRaw as RequestPriority)
        : RequestPriority.NORMAL;

    const metadata = extractMetadata(formData);

    // 1. Update revision specifications
    await RequestService.updateRevision(
      requestId,
      {
        title,
        description,
        priority,
        metadata,
      },
      user
    );

    // 2. If intent is resubmit, trigger resubmission
    if (intent === "resubmit" || intent === "submit") {
      await RequestService.resubmitRevision(requestId, user);
    }

    revalidatePath(`/requests/${requestId}`);
    revalidatePath(`/requests/${requestId}/edit`);
    revalidatePath("/requests");
    revalidatePath("/approvals");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui spesifikasi revisi";
    return { success: false, error: message };
  }
}

/**
 * Server action to resubmit a revised request directly from the detail view.
 */
export async function resubmitRevisionAction(requestId: string): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    await RequestService.resubmitRevision(requestId, user);

    revalidatePath(`/requests/${requestId}`);
    revalidatePath(`/requests/${requestId}/edit`);
    revalidatePath("/requests");
    revalidatePath("/approvals");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal mengajukan ulang permintaan";
    return { success: false, error: message };
  }
}

/**
 * Server action to transition an APPROVED request to PROCESSING.
 */
export async function startProcessingAction(requestId: string): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    await RequestService.startProcessing(requestId, user);

    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memulai pemrosesan permintaan";
    return { success: false, error: message };
  }
}

/**
 * Server action to mark a PROCESSING request as COMPLETED.
 */
export async function completeRequestAction(requestId: string): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    await RequestService.completeRequest(requestId, user);

    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyelesaikan permintaan";
    return { success: false, error: message };
  }
}

/**
 * Server action to cancel a non-terminal request.
 */
export async function cancelRequestAction(
  requestId: string,
  reason?: string
): Promise<RequestActionState> {
  try {
    const user = await requireAuthenticatedUser();

    await RequestService.cancelRequest(requestId, user, reason);

    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/requests");
    revalidatePath("/approvals");

    return { success: true, requestId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membatalkan permintaan";
    return { success: false, error: message };
  }
}

