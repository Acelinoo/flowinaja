"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitDraftAction } from "@/actions/request.actions";
import { Send, AlertCircle } from "lucide-react";

interface SubmitDraftButtonProps {
  requestId: string;
}

export function SubmitDraftButton({ requestId }: SubmitDraftButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitDraftAction(requestId);
      if (!res.success) {
        setError(res.error || "Gagal mengajukan permintaan");
      } else {
        try {
          window.dispatchEvent(new Event("flowinaja:mutate"));
          const bc = new BroadcastChannel("flowinaja_realtime");
          bc.postMessage("mutate");
          bc.close();
        } catch {}
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        size="sm"
        disabled={isPending}
        onClick={handleSubmit}
        className="text-xs"
      >
        <Send className="w-3.5 h-3.5" />
        {isPending ? "Mengajukan..." : "Ajukan Permintaan"}
      </Button>
      {error && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
