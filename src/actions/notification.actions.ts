"use server";

import { requireAuthenticatedUser } from "@/lib/auth/server";
import { NotificationService, UpdatePreferencesInput } from "@/services/notification.service";
import { revalidatePath } from "next/cache";

export interface NotificationActionState {
  success: boolean;
  error?: string;
  count?: number;
}

/**
 * Server action to mark a single notification as read.
 * Enforces organization and user ownership.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<NotificationActionState> {
  try {
    const user = await requireAuthenticatedUser();
    await NotificationService.markAsRead(notificationId, user.id, user.organizationId);

    revalidatePath("/notifications");
    revalidatePath("/");

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as Error).message || "Gagal menandai notifikasi sebagai telah dibaca",
    };
  }
}

/**
 * Server action to mark all notifications as read for current user.
 */
export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  try {
    const user = await requireAuthenticatedUser();
    const result = await NotificationService.markAllAsRead(user.organizationId, user.id);

    revalidatePath("/notifications");
    revalidatePath("/");

    return { success: true, count: result.count };
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as Error).message || "Gagal menandai seluruh notifikasi sebagai telah dibaca",
    };
  }
}

/**
 * Server action to update user notification preferences.
 */
export async function updatePreferencesAction(
  input: UpdatePreferencesInput
): Promise<NotificationActionState> {
  try {
    const user = await requireAuthenticatedUser();
    await NotificationService.updatePreferences(
      user.organizationId,
      user.id,
      user.role,
      input
    );

    revalidatePath("/notifications");

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: (error as Error).message || "Gagal memperbarui preferensi notifikasi",
    };
  }
}
