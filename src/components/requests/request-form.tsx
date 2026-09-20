"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RequestPriority } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createRequestAction, updateDraftAction, updateRevisionAction } from "@/actions/request.actions";
import {
  FileText,
  Send,
  Save,
  ArrowLeft,
  AlertCircle,
  ShoppingBag,
  KeyRound,
  Wrench,
  Plane,
  HelpCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

interface RequestTypeOption {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
}

interface RequestFormProps {
  requestTypes: RequestTypeOption[];
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    requestTypeId?: string;
    priority?: RequestPriority;
    metadata?: Record<string, unknown> | null;
  };
  isEditing?: boolean;
  isRevision?: boolean;
}

export function RequestForm({
  requestTypes,
  initialData,
  isEditing = false,
  isRevision = false,
}: RequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    initialData?.requestTypeId || (requestTypes.length > 0 ? requestTypes[0].id : "")
  );
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState<RequestPriority>(
    initialData?.priority || RequestPriority.NORMAL
  );

  // Metadata states
  const initialMeta = (initialData?.metadata as Record<string, unknown>) || {};
  const [metaItem, setMetaItem] = useState((initialMeta.item as string) || "");
  const [metaQuantity, setMetaQuantity] = useState((initialMeta.quantity as number)?.toString() || "1");
  const [metaEstimatedCost, setMetaEstimatedCost] = useState((initialMeta.estimatedCost as number)?.toString() || "0");
  const [metaJustification, setMetaJustification] = useState((initialMeta.justification as string) || "");

  const [metaSystem, setMetaSystem] = useState((initialMeta.system as string) || "");
  const [metaAccessLevel, setMetaAccessLevel] = useState((initialMeta.accessLevel as string) || "Read-Only");

  const [metaLocation, setMetaLocation] = useState((initialMeta.location as string) || "");
  const [metaIssue, setMetaIssue] = useState((initialMeta.issue as string) || "");
  const [metaUrgency, setMetaUrgency] = useState((initialMeta.urgency as string) || "MEDIUM");
  const [metaIssueDetails, setMetaIssueDetails] = useState((initialMeta.issueDetails as string) || "");

  const [metaDestination, setMetaDestination] = useState((initialMeta.destination as string) || "");
  const [metaTravelDate, setMetaTravelDate] = useState((initialMeta.travelDate as string) || "");
  const [metaReturnDate, setMetaReturnDate] = useState((initialMeta.returnDate as string) || "");
  const [metaTravelPurpose, setMetaTravelPurpose] = useState((initialMeta.purpose as string) || "");

  const [metaCategory, setMetaCategory] = useState((initialMeta.category as string) || "General Operational");
  const [metaDetails, setMetaDetails] = useState((initialMeta.details as string) || "");

  const selectedType = requestTypes.find((t) => t.id === selectedTypeId);
  const typeCode = (selectedType?.code || "").toUpperCase();

  const handleSubmit = (intent: "draft" | "submit" | "save" | "resubmit") => {
    setError(null);

    // Build metadata payload based on selected type
    let metadata: Record<string, unknown> = {};
    if (typeCode === "REQ-PUR") {
      metadata = {
        item: metaItem,
        quantity: parseInt(metaQuantity, 10) || 1,
        estimatedCost: parseFloat(metaEstimatedCost) || 0,
        justification: metaJustification,
      };
    } else if (typeCode === "REQ-IT") {
      metadata = {
        system: metaSystem,
        accessLevel: metaAccessLevel,
        justification: metaJustification,
      };
    } else if (typeCode === "REQ-MNT") {
      metadata = {
        location: metaLocation,
        issue: metaIssue,
        urgency: metaUrgency,
        issueDetails: metaIssueDetails,
      };
    } else if (typeCode === "REQ-TRV") {
      metadata = {
        destination: metaDestination,
        travelDate: metaTravelDate,
        returnDate: metaReturnDate,
        purpose: metaTravelPurpose,
      };
    } else if (typeCode === "REQ-GEN") {
      metadata = {
        category: metaCategory,
        details: metaDetails,
      };
    }

    const formData = new FormData();
    formData.append("intent", intent);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("requestTypeId", selectedTypeId);
    formData.append("priority", priority);
    formData.append("metadata", JSON.stringify(metadata));

    startTransition(async () => {
      let res;
      if (isRevision && initialData?.id) {
        res = await updateRevisionAction(initialData.id, null, formData);
      } else if (isEditing && initialData?.id) {
        res = await updateDraftAction(initialData.id, null, formData);
      } else {
        res = await createRequestAction(null, formData);
      }

      if (!res.success) {
        setError(res.error || "Terjadi kendala saat memproses permintaan.");
      } else if (res.requestId) {
        router.push(`/requests/${res.requestId}`);
      } else {
        router.push("/requests");
      }
    });
  };

  const getTypeIcon = (code: string) => {
    switch (code) {
      case "REQ-PUR":
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case "REQ-IT":
        return <KeyRound className="w-4 h-4 text-indigo-600" />;
      case "REQ-MNT":
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case "REQ-TRV":
        return <Plane className="w-4 h-4 text-blue-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top navigation & action header */}
      <div className="flex items-center justify-between">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Permintaan Saya
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleSubmit("draft")}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {isEditing ? "Perbarui Draf" : "Simpan sebagai Draf"}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={() => handleSubmit("submit")}
            className="text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Ajukan Permintaan
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Tindakan gagal:</span> {error}
          </div>
        </div>
      )}

      {/* Section 1: Classification & Core Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Informasi Dasar
          </CardTitle>
          <CardDescription className="text-xs">
            Pilih kategori permintaan operasional Anda dan tentukan informasi utama.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request Type Selector */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipe Permintaan <span className="text-rose-500">*</span>
              </label>
              {isRevision && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  (Tipe permintaan terkunci selama revisi)
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {requestTypes.map((type) => {
                const isSelected = type.id === selectedTypeId;
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={isRevision && !isSelected}
                    onClick={() => {
                      if (!isRevision) {
                        setSelectedTypeId(type.id);
                      }
                    }}
                    className={`flex items-start gap-3 p-3 text-left rounded-lg border transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-1 ring-blue-600"
                        : isRevision
                        ? "opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="mt-0.5">{getTypeIcon(type.code || "")}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                        <span className="truncate">{type.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {type.description || "Alur kerja standar internal."}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Request Title */}
          <div>
            <label htmlFor="title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Judul / Perihal <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pengadaan 3 Kursi Kantor Ergonomis untuk Operasional"
              className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">Ringkasan singkat permintaan (3–150 karakter).</p>
          </div>

          {/* Priority & Request Code Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="priority" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Prioritas
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RequestPriority)}
                className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value={RequestPriority.LOW}>Rendah — Operasional tidak mendesak</option>
                <option value={RequestPriority.NORMAL}>Normal — Waktu pemrosesan standar</option>
                <option value={RequestPriority.HIGH}>Tinggi — Pemrosesan dipercepat</option>
                <option value={RequestPriority.URGENT}>Mendesak — Kendala kritis operasional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Kode Alur Kerja
              </label>
              <div className="h-9 px-3 flex items-center text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-800">
                {selectedType?.code || "GENERAL"}
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <div>
            <label htmlFor="description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deskripsi Lengkap &amp; Latar Belakang <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Berikan rincian kontekstual yang jelas mengenai latar belakang dan tujuan operasional permintaan ini..."
              className="w-full p-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Type-Specific Structured Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getTypeIcon(typeCode)}
            <CardTitle className="text-sm font-semibold">
              Rincian Khusus {selectedType?.name || "Permintaan"}
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Kolom data yang diperlukan untuk evaluasi dan pemrosesan alur kerja {selectedType?.name || "permintaan ini"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Purchase Request Fields */}
          {typeCode === "REQ-PUR" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Barang / Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={metaItem}
                    onChange={(e) => setMetaItem(e.target.value)}
                    placeholder="Contoh: Kursi Kantor Ergonomis"
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Jumlah Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={metaQuantity}
                    onChange={(e) => setMetaQuantity(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimasi Total Biaya (IDR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={metaEstimatedCost}
                  onChange={(e) => setMetaEstimatedCost(e.target.value)}
                  placeholder="Contoh: 4500000"
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justifikasi Kebutuhan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={metaJustification}
                  onChange={(e) => setMetaJustification(e.target.value)}
                  placeholder="Jelaskan alasan dan manfaat pengadaan ini bagi operasional bisnis..."
                  className="w-full p-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* IT Access Request Fields */}
          {typeCode === "REQ-IT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Sistem / Aplikasi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={metaSystem}
                    onChange={(e) => setMetaSystem(e.target.value)}
                    placeholder="Contoh: AWS Production Console, GitHub Enterprise, VPN Kantor"
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Akses yang Dibutuhkan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={metaAccessLevel}
                    onChange={(e) => setMetaAccessLevel(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Read-Only">Hanya Baca (Viewer)</option>
                    <option value="Standard Operator">Operator Standar (Baca &amp; Tulis)</option>
                    <option value="Administrator">Administrator (Superuser)</option>
                    <option value="Temporary Debug">Akses Sementara Penanganan Masalah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Justifikasi Akses <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={metaJustification}
                  onChange={(e) => setMetaJustification(e.target.value)}
                  placeholder="Jelaskan alasan kebutuhan akses ini dan ruang lingkup tugas terkait..."
                  className="w-full p-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Maintenance Request Fields */}
          {typeCode === "REQ-MNT" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lokasi Fasilitas / Ruangan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={metaLocation}
                    onChange={(e) => setMetaLocation(e.target.value)}
                    placeholder="Contoh: Lantai 3 Ruang Rapat A, Ruang Server Gedung B"
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tingkat Urgensi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={metaUrgency}
                    onChange={(e) => setMetaUrgency(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="LOW">Rendah — Perbaikan minor atau estetika</option>
                    <option value="MEDIUM">Sedang — Perbaikan fasilitas standar</option>
                    <option value="HIGH">Tinggi — Mengganggu operasional harian</option>
                    <option value="CRITICAL">Kritis — Bahaya keselamatan atau gangguan sistem kritis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan Masalah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={metaIssue}
                  onChange={(e) => setMetaIssue(e.target.value)}
                  placeholder="Contoh: Unit pendingin ruangan bocor dan menetes ke meja kerja"
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi Detail Masalah <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={metaIssueDetails}
                  onChange={(e) => setMetaIssueDetails(e.target.value)}
                  placeholder="Uraikan indikasi kerusakan, spesifikasi unit, dan peringatan keselamatan yang diperlukan..."
                  className="w-full p-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Business Travel Request Fields */}
          {typeCode === "REQ-TRV" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kota / Lokasi Tujuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={metaDestination}
                  onChange={(e) => setMetaDestination(e.target.value)}
                  placeholder="Contoh: Kantor Cabang Surabaya &amp; Lokasi Klien"
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Keberangkatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={metaTravelDate}
                    onChange={(e) => setMetaTravelDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Kepulangan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={metaReturnDate}
                    onChange={(e) => setMetaReturnDate(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Maksud Perjalanan &amp; Target Capaian <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={metaTravelPurpose}
                  onChange={(e) => setMetaTravelPurpose(e.target.value)}
                  placeholder="Rincikan agenda pertemuan klien, deliverable yang ditargetkan, dan sasaran strategis..."
                  className="w-full p-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* General Request Fields */}
          {typeCode === "REQ-GEN" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kategori / Klasifikasi
                </label>
                <input
                  type="text"
                  value={metaCategory}
                  onChange={(e) => setMetaCategory(e.target.value)}
                  placeholder="Contoh: Administrasi / Logistik / Regulasi Internal"
                  className="w-full h-9 px-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detail Operasional &amp; Tindakan yang Diperlukan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={metaDetails}
                  onChange={(e) => setMetaDetails(e.target.value)}
                  placeholder="Uraikan seluruh aspek operasional dan dukungan yang Anda butuhkan..."
                  className="w-full p-3 text-xs rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          )}

          {/* Fallback for other / custom types */}
          {!["REQ-PUR", "REQ-IT", "REQ-MNT", "REQ-TRV", "REQ-GEN"].includes(typeCode) && (
            <p className="text-xs text-slate-500 italic">
              Berlaku spesifikasi standar alur kerja. Silakan lengkapi deskripsi umum di atas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Form Submission Controls Footer */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => handleSubmit(isRevision ? "save" : "draft")}
          className="text-xs"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          {isPending
            ? "Menyimpan..."
            : isRevision
            ? "Simpan Perubahan"
            : isEditing
            ? "Perbarui Draf"
            : "Simpan sebagai Draf"}
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => handleSubmit(isRevision ? "resubmit" : "submit")}
          className={`text-xs ${
            isRevision ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
          }`}
        >
          {isRevision ? (
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
          ) : (
            <Send className="w-3.5 h-3.5 mr-1" />
          )}
          {isPending
            ? "Mengajukan..."
            : isRevision
            ? "Simpan & Ajukan Ulang Permintaan"
            : "Ajukan Permintaan"}
        </Button>
      </div>
    </div>
  );
}
