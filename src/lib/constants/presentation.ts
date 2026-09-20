import {
  RequestStatus,
  ApprovalStatus,
  RequestPriority,
  UserRole,
  ActivityAction,
  NotificationType,
} from "@prisma/client";

/**
 * Pemetaan resmi status permintaan dan persetujuan ke Bahasa Indonesia formal.
 */
export const STATUS_LABELS: Record<string, string> = {
  [RequestStatus.DRAFT]: "Draf",
  [RequestStatus.SUBMITTED]: "Diajukan",
  [RequestStatus.IN_REVIEW]: "Menunggu Persetujuan",
  [RequestStatus.APPROVED]: "Disetujui",
  [RequestStatus.REJECTED]: "Ditolak",
  [RequestStatus.REVISION_REQUIRED]: "Memerlukan Revisi",
  [RequestStatus.PROCESSING]: "Sedang Diproses",
  [RequestStatus.COMPLETED]: "Selesai",
  [RequestStatus.CANCELLED]: "Dibatalkan",
  [ApprovalStatus.PENDING]: "Menunggu",
  [ApprovalStatus.REVISION_REQUESTED]: "Memerlukan Revisi",
};

/**
 * Pemetaan resmi tingkat prioritas ke Bahasa Indonesia formal.
 */
export const PRIORITY_LABELS: Record<string, string> = {
  [RequestPriority.LOW]: "Rendah",
  [RequestPriority.NORMAL]: "Normal",
  [RequestPriority.HIGH]: "Tinggi",
  [RequestPriority.URGENT]: "Mendesak",
};

/**
 * Pemetaan resmi peran pengguna ke Bahasa Indonesia formal.
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Admin",
  [UserRole.MANAGER]: "Manajer",
  [UserRole.SUPERVISOR]: "Supervisor",
  [UserRole.EMPLOYEE]: "Karyawan",
};

/**
 * Pemetaan deskripsi aksi log audit ke Bahasa Indonesia formal.
 */
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  [ActivityAction.REQUEST_CREATED]: "Permintaan dibuat",
  [ActivityAction.REQUEST_UPDATED]: "Permintaan diperbarui",
  [ActivityAction.REQUEST_SUBMITTED]: "Permintaan diajukan",
  [ActivityAction.REQUEST_RESUBMITTED]: "Permintaan diajukan kembali",
  [ActivityAction.APPROVAL_APPROVED]: "Persetujuan tahap diberikan",
  [ActivityAction.REQUEST_APPROVED]: "Permintaan disetujui sepenuhnya",
  [ActivityAction.REQUEST_REJECTED]: "Permintaan ditolak",
  [ActivityAction.REVISION_REQUESTED]: "Revisi diminta",
  [ActivityAction.REQUEST_PROCESSING]: "Pemrosesan permintaan dimulai",
  [ActivityAction.REQUEST_COMPLETED]: "Permintaan selesai diproses",
  [ActivityAction.REQUEST_CANCELLED]: "Permintaan dibatalkan",
  [ActivityAction.USER_UPDATED]: "Data pengguna diperbarui",
  [ActivityAction.SETTINGS_UPDATED]: "Pengaturan sistem diperbarui",
};

/**
 * Pemetaan jenis notifikasi ke label Bahasa Indonesia formal.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.APPROVAL_PENDING]: "Persetujuan Tertunda",
  [NotificationType.REQUEST_APPROVED]: "Permintaan Disetujui",
  [NotificationType.REQUEST_REJECTED]: "Permintaan Ditolak",
  [NotificationType.REVISION_REQUESTED]: "Revisi Diminta",
  [NotificationType.REQUEST_PROCESSING]: "Permintaan Sedang Diproses",
  [NotificationType.REQUEST_COMPLETED]: "Permintaan Selesai",
  [NotificationType.REQUEST_CANCELLED]: "Permintaan Dibatalkan",
};

/**
 * Format tanggal ke standar konvensi formal Bahasa Indonesia.
 * Contoh: "19 September 2026" atau "19 September 2026, 14:30 WIB"
 */
export function formatDateIndonesian(
  date: Date | string | number,
  options?: { includeTime?: boolean }
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  if (options?.includeTime) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  }

  return `${day} ${month} ${year}`;
}

/**
 * Format angka ke standar Bahasa Indonesia dengan pemisah ribuan titik.
 * Contoh: 1250 -> "1.250"
 */
export function formatNumberIndonesian(value: number): string {
  if (isNaN(value)) return "0";
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * Format mata uang Rupiah formal.
 * Contoh: 15000000 -> "Rp 15.000.000"
 */
export function formatCurrencyIDR(amount: number): string {
  if (isNaN(amount)) return "Rp 0";
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}
