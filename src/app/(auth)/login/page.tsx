import React from "react";
import { Workflow, AlertCircle } from "lucide-react";
import { signIn } from "@/auth";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
  }>;
}

function getSafeRedirectUrl(url?: string): string {
  if (!url) return "/";
  // Safe relative paths starting with single '/'
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
    if (parsed.origin === appUrl.origin) {
      return parsed.pathname + parsed.search;
    }
  } catch {
    // Malformed URL, fallback to default
  }
  return "/";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, callbackUrl } = await searchParams;
  const redirectTo = getSafeRedirectUrl(callbackUrl);

  const getErrorMessage = (err: string) => {
    switch (err) {
      case "Configuration":
        return "Konfigurasi autentikasi belum lengkap. Pastikan AUTH_SECRET, AUTH_GOOGLE_ID, dan AUTH_GOOGLE_SECRET telah disetel pada Environment Variables di Vercel/server.";
      case "AccessDenied":
        return "Akses ditolak. Kemungkinan penyebab: (1) Akun Google belum didaftarkan di 'Test users' Google Cloud Console, atau (2) Database PostgreSQL (DATABASE_URL) belum terhubung di Vercel.";
      case "OAuthSignin":
        return "Gagal menghubungkan ke Google OAuth. Pastikan Client ID dan Secret valid.";
      case "OAuthCallbackError":
        return "Gagal memproses respon Google OAuth. Pastikan Redirect URI di Google Cloud Console cocok.";
      case "OAuthAccountNotLinked":
        return "Akun dengan email ini sudah terdaftar menggunakan metode masuk lain.";
      case "Callback":
        return "Autentikasi tidak dapat diselesaikan. Silakan coba kembali.";
      default:
        return `Terjadi kendala pada proses autentikasi (${err}). Silakan coba kembali.`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <Workflow className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Flowinaja
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Platform Permintaan &amp; Persetujuan Internal
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{getErrorMessage(error)}</span>
          </div>
        )}

        {/* Login Box */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="text-xs font-medium text-slate-500 text-center mb-4">
            Masuk dengan akun organisasi Anda
          </div>

          {/* Google OAuth Form */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo });
            }}
          >
            <button
              type="submit"
              className="w-full h-10 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Lanjutkan dengan Google</span>
            </button>
          </form>

          {/* GitHub OAuth Form */}
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo });
            }}
          >
            <button
              type="submit"
              className="w-full h-10 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Lanjutkan dengan GitHub</span>
            </button>
          </form>

          <div className="pt-2 text-center">
            <span className="text-[11px] text-slate-400">
              Kontrol akses berbasis peran (RBAC) ditegakkan di sisi server
            </span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-400">
          Flowinaja &bull; Tata Kelola Alur Kerja &amp; Identitas Produksi
        </div>
      </div>
    </div>
  );
}
