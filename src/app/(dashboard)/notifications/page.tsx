import React from "react";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { NotificationService } from "@/services/notification.service";
import { NotificationInbox } from "@/components/notifications/notification-inbox";

export const metadata = {
  title: "Pusat Notifikasi | Flowinaja",
  description: "Pantau dan kelola notifikasi alur kerja serta pemberitahuan audit dalam aplikasi.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unreadOnly?: string }>;
}) {
  const user = await requireAuthenticatedUser();
  const resolvedSearchParams = await searchParams;

  const page = parseInt(resolvedSearchParams.page || "1", 10);
  const unreadOnly = resolvedSearchParams.unreadOnly === "true";

  const [notificationData, preferences] = await Promise.all([
    NotificationService.getNotificationsForUser({
      organizationId: user.organizationId,
      userId: user.id,
      unreadOnly,
      page,
      limit: 20,
    }),
    NotificationService.getPreferences(user.organizationId, user.id),
  ]);

  return (
    <NotificationInbox
      initialNotifications={notificationData.notifications}
      initialUnreadCount={notificationData.unreadCount}
      initialTotalCount={notificationData.totalCount}
      initialPage={notificationData.currentPage}
      totalPages={notificationData.totalPages}
      userRole={user.role}
      preferences={{
        approvalPending: preferences.approvalPending,
        requestUpdates: preferences.requestUpdates,
        processingUpdates: preferences.processingUpdates,
        completionUpdates: preferences.completionUpdates,
      }}
    />
  );
}
