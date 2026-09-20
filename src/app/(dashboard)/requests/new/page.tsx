import React from "react";
import { requireAuthenticatedUser } from "@/lib/auth/server";
import { RequestService } from "@/services/request.service";
import { RequestForm } from "@/components/requests/request-form";

export default async function NewRequestPage() {
  const user = await requireAuthenticatedUser();
  const requestTypes = await RequestService.getRequestTypes(user.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Buat Permintaan Operasional
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Ajukan atau simpan draf permintaan operasional melalui jalur alur kerja organisasi yang terverifikasi.
        </p>
      </div>

      <RequestForm
        requestTypes={requestTypes.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          description: t.description,
        }))}
      />
    </div>
  );
}
