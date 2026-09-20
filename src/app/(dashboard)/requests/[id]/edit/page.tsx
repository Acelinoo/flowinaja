import React from "react";
import { notFound, redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { RequestService } from "@/services/request.service";
import { RequestForm } from "@/components/requests/request-form";

interface EditDraftPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditDraftPage({ params }: EditDraftPageProps) {
  const user = await requireAuthenticatedUser();
  const { id } = await params;

  // Retrieve draft request scoped strictly to user and tenant
  const request = await RequestService.getRequestById(user.organizationId, id, user.id);

  if (!request) {
    notFound();
  }

  // Enforce draft or revision_required status restriction
  if (request.status !== "DRAFT" && request.status !== "REVISION_REQUIRED") {
    redirect(`/requests/${id}`);
  }

  const isRevision = request.status === "REVISION_REQUIRED";
  const requestTypes = await RequestService.getRequestTypes(user.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isRevision
            ? `Ubah Permintaan Revisi (Siklus #${request.currentCycle})`
            : "Ubah Draf Permintaan"}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isRevision
            ? `Perbarui spesifikasi untuk #${request.id.slice(-8).toUpperCase()} berdasarkan catatan revisi penyetuju sebelum diajukan kembali.`
            : `Ubah spesifikasi draf untuk #${request.id.slice(-8).toUpperCase()} sebelum diajukan secara resmi.`}
        </p>
      </div>

      <RequestForm
        isEditing={true}
        isRevision={isRevision}
        requestTypes={requestTypes.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          description: t.description,
        }))}
        initialData={{
          id: request.id,
          title: request.title,
          description: request.description,
          requestTypeId: request.requestTypeId,
          priority: request.priority,
          metadata: (request.metadata as Record<string, unknown>) || null,
        }}
      />
    </div>
  );
}

