"use server";

import { requireRole } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { UserRole, ActivityAction } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface UserActionResult {
  success: boolean;
  error?: string;
}

/**
 * Mengubah peran (role) pengguna secara aman dengan otorisasi Admin.
 */
export async function updateUserRoleAction(
  targetUserId: string,
  newRole: UserRole
): Promise<UserActionResult> {
  try {
    const caller = await requireRole(UserRole.ADMIN);

    if (!targetUserId || !newRole) {
      return { success: false, error: "Parameter ID pengguna dan peran baru wajib disertakan." };
    }

    if (!Object.values(UserRole).includes(newRole)) {
      return { success: false, error: `Peran '${newRole}' tidak valid.` };
    }

    // Ambil data pengguna target di organisasi yang sama
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId: caller.organizationId,
      },
    });

    if (!targetUser) {
      return { success: false, error: "Pengguna tidak ditemukan dalam organisasi ini." };
    }

    // Mencegah admin menurunkan peran dirinya sendiri agar tidak terkunci
    if (targetUser.id === caller.id && newRole !== UserRole.ADMIN) {
      return {
        success: false,
        error: "Anda tidak dapat menurunkan peran Administrator akun Anda sendiri demi keamanan sistem.",
      };
    }

    const oldRole = targetUser.role;

    // Perbarui peran pengguna
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { role: newRole },
    });

    // Catat log aktivitas audit
    await prisma.activityLog.create({
      data: {
        organizationId: caller.organizationId,
        actorId: caller.id,
        action: ActivityAction.USER_UPDATED,
        details: `Peran pengguna "${targetUser.name}" (${targetUser.email}) diubah dari ${oldRole} menjadi ${newRole} oleh ${caller.name}.`,
      },
    });

    revalidatePath("/management/users");
    revalidatePath("/management/requests");
    revalidatePath("/approvals");

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Gagal memperbarui peran pengguna.";
    return { success: false, error: msg };
  }
}

/**
 * Mengubah departemen tempat pengguna bertugas.
 */
export async function updateUserDepartmentAction(
  targetUserId: string,
  departmentId: string | null
): Promise<UserActionResult> {
  try {
    const caller = await requireRole(UserRole.ADMIN);

    if (!targetUserId) {
      return { success: false, error: "ID pengguna target wajib disertakan." };
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId: caller.organizationId,
      },
    });

    if (!targetUser) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    if (departmentId) {
      const dept = await prisma.department.findFirst({
        where: {
          id: departmentId,
          organizationId: caller.organizationId,
        },
      });

      if (!dept) {
        return { success: false, error: "Departemen tidak ditemukan dalam organisasi ini." };
      }
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { departmentId: departmentId || null },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: caller.organizationId,
        actorId: caller.id,
        action: ActivityAction.USER_UPDATED,
        details: `Departemen pengguna "${targetUser.name}" diperbarui oleh ${caller.name}.`,
      },
    });

    revalidatePath("/management/users");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Gagal memperbarui departemen pengguna.";
    return { success: false, error: msg };
  }
}

/**
 * Mengaktifkan atau menonaktifkan akun pengguna.
 */
export async function toggleUserStatusAction(
  targetUserId: string,
  isActive: boolean
): Promise<UserActionResult> {
  try {
    const caller = await requireRole(UserRole.ADMIN);

    if (targetUserId === caller.id) {
      return { success: false, error: "Anda tidak dapat menonaktifkan akun Anda sendiri." };
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId: caller.organizationId,
      },
    });

    if (!targetUser) {
      return { success: false, error: "Pengguna tidak ditemukan." };
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { isActive },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: caller.organizationId,
        actorId: caller.id,
        action: ActivityAction.USER_UPDATED,
        details: `Status akun pengguna "${targetUser.name}" diubah menjadi ${isActive ? "Aktif" : "Nonaktif"} oleh ${caller.name}.`,
      },
    });

    revalidatePath("/management/users");
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Gagal mengubah status akun pengguna.";
    return { success: false, error: msg };
  }
}
