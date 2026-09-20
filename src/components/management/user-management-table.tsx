"use client";

import React, { useState, useTransition } from "react";
import { UserRole } from "@prisma/client";
import {
  updateUserRoleAction,
  updateUserDepartmentAction,
  toggleUserStatusAction,
} from "@/actions/user.actions";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Building2,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants/presentation";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  departmentId: string | null;
  department?: { id: string; name: string; code: string | null } | null;
  createdAt: string | Date;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string | null;
}

interface UserManagementTableProps {
  initialUsers: UserItem[];
  departments: DepartmentItem[];
  currentUserId: string;
}

export function UserManagementTable({
  initialUsers,
  departments,
  currentUserId,
}: UserManagementTableProps) {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setLoadingUserId(userId);
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, newRole);
      setLoadingUserId(null);

      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showToast("success", `Peran pengguna berhasil diperbarui menjadi ${ROLE_LABELS[newRole] || newRole}.`);
      } else {
        showToast("error", res.error || "Gagal memperbarui peran pengguna.");
      }
    });
  };

  const handleDepartmentChange = (userId: string, newDeptId: string) => {
    const deptId = newDeptId === "NONE" ? null : newDeptId;
    setLoadingUserId(userId);
    startTransition(async () => {
      const res = await updateUserDepartmentAction(userId, deptId);
      setLoadingUserId(null);

      if (res.success) {
        const foundDept = departments.find((d) => d.id === deptId) || null;
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, departmentId: deptId, department: foundDept } : u
          )
        );
        showToast(
          "success",
          foundDept
            ? `Departemen pengguna diubah ke ${foundDept.name}.`
            : "Pengguna ditetapkan sebagai Lintas Departemen."
        );
      } else {
        showToast("error", res.error || "Gagal memperbarui departemen pengguna.");
      }
    });
  };

  const handleStatusToggle = (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setLoadingUserId(userId);
    startTransition(async () => {
      const res = await toggleUserStatusAction(userId, nextStatus);
      setLoadingUserId(null);

      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: nextStatus } : u))
        );
        showToast(
          "success",
          `Status akun berhasil diubah menjadi ${nextStatus ? "Aktif" : "Nonaktif"}.`
        );
      } else {
        showToast("error", res.error || "Gagal memperbarui status akun.");
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <div className="space-y-3">
      {/* Dynamic Floating Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[10px] font-semibold underline opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Pengguna</th>
              <th className="py-3 px-4">Ubah Peran (Role)</th>
              <th className="py-3 px-4">Departemen</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Bergabung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const isLoading = loadingUserId === u.id;

              return (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* User info */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[11px] text-blue-600 dark:text-blue-400 shrink-0">
                        {u.name ? getInitials(u.name) : <UserIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {u.name}
                          </span>
                          {isSelf && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" />
                          {u.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Role Selector */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <select
                        disabled={isLoading || (isSelf && u.role === UserRole.ADMIN)}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`h-8 px-2.5 text-xs font-semibold rounded-md border transition-all focus:outline-none focus:ring-1 focus:ring-blue-600 ${
                          u.role === UserRole.ADMIN
                            ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300"
                            : u.role === UserRole.MANAGER
                            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-300"
                            : u.role === UserRole.SUPERVISOR
                            ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300"
                            : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <option value={UserRole.EMPLOYEE}>Karyawan (Employee)</option>
                        <option value={UserRole.SUPERVISOR}>Penyelia (Supervisor)</option>
                        <option value={UserRole.MANAGER}>Manajer (Manager)</option>
                        <option value={UserRole.ADMIN}>Administrator (Admin)</option>
                      </select>
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />}
                    </div>
                  </td>

                  {/* Department Selector */}
                  <td className="py-3 px-4">
                    <select
                      disabled={isLoading}
                      value={u.departmentId || "NONE"}
                      onChange={(e) => handleDepartmentChange(u.id, e.target.value)}
                      className="h-8 px-2.5 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                    >
                      <option value="NONE">Lintas Departemen</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Active Toggle */}
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      disabled={isLoading || isSelf}
                      onClick={() => handleStatusToggle(u.id, u.isActive)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-md border transition-colors ${
                        u.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
                      } ${isSelf ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {u.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </td>

                  {/* Joined Date */}
                  <td className="py-3 px-4 text-right text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
