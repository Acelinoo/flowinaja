"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  FileText,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface RealtimeToast {
  id: string;
  type: "request_new" | "request_update" | "approval_update" | "sync";
  title: string;
  message: string;
  link?: string;
  timestamp: Date;
}

interface RealtimeSyncContextValue {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  unreadCount: number;
}

const RealtimeSyncContext = createContext<RealtimeSyncContextValue>({
  isSyncing: false,
  lastSyncedAt: null,
  syncNow: async () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  unreadCount: 0,
});

export const useRealtimeSync = () => useContext(RealtimeSyncContext);

/**
 * Web Audio API synthesized notification sound.
 * Elegant multi-tone chime without external audio assets.
 */
function playChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic chord notes: E5 (659.25Hz) and B5 (987.77Hz)
    const notes = [659.25, 987.77];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.55);
    });
  } catch {
    // AudioContext might be blocked before first user interaction
  }
}

export function RealtimeSyncProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [toasts, setToasts] = useState<RealtimeToast[]>([]);

  const lastVersionRef = useRef<string | null>(null);
  const isFirstCheckRef = useRef<boolean>(true);
  const soundEnabledRef = useRef<boolean>(true);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Initialize sound preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("flowinaja_sync_sound");
      const enabled = saved !== "false";
      setSoundEnabledState(enabled);
      soundEnabledRef.current = enabled;
    } catch {
      // ignore
    }
  }, []);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    soundEnabledRef.current = enabled;
    try {
      localStorage.setItem("flowinaja_sync_sound", enabled ? "true" : "false");
    } catch {
      // ignore
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = useCallback((toast: Omit<RealtimeToast, "id" | "timestamp">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: RealtimeToast = {
      ...toast,
      id,
      timestamp: new Date(),
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 3)]);

    if (soundEnabledRef.current) {
      playChime();
    }

    // Auto dismiss after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 7000);
  }, []);

  // Sync execution
  const executeSync = useCallback(
    async (isManual = false) => {
      if (isSyncing) return;
      setIsSyncing(true);

      try {
        const res = await fetch("/api/sync", {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
          },
        });

        if (!res.ok) {
          setIsSyncing(false);
          return;
        }

        const data = await res.json();
        setLastSyncedAt(new Date());

        if (typeof data.unreadNotificationsCount === "number") {
          setUnreadCount(data.unreadNotificationsCount);
        }

        // On first run, record baseline version without notifications
        if (isFirstCheckRef.current) {
          lastVersionRef.current = data.syncVersion;
          isFirstCheckRef.current = false;
          setIsSyncing(false);
          return;
        }

        // Check if database state changed
        if (data.syncVersion && data.syncVersion !== lastVersionRef.current) {
          lastVersionRef.current = data.syncVersion;

          // Seamless Server Component re-render
          router.refresh();

          // Provide contextual toast notification
          if (data.latestRequest) {
            const req = data.latestRequest;
            const isVeryRecent = Date.now() - new Date(req.createdAt).getTime() < 30000;

            if (isVeryRecent && !req.isSelf) {
              addToast({
                type: "request_new",
                title: "Permintaan Baru Diterima",
                message: `"${req.title}" oleh ${req.requesterName} (${req.requestTypeName})`,
                link: `/requests/${req.id}`,
              });
            } else {
              addToast({
                type: "request_update",
                title: "Pembaruan Alur Kerja",
                message: `Data permintaan "${req.title}" telah diperbarui secara real-time.`,
                link: `/requests/${req.id}`,
              });
            }
          }
        } else if (isManual) {
          router.refresh();
        }
      } catch {
        // Silently tolerate background network hiccups
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, router, addToast]
  );

  // Setup broadcast channel & window listeners
  useEffect(() => {
    try {
      const channel = new BroadcastChannel("flowinaja_realtime");
      broadcastRef.current = channel;
      channel.onmessage = () => {
        executeSync(false);
      };
    } catch {
      // BroadcastChannel not available in some older contexts
    }

    const onCustomMutate = () => {
      executeSync(false);
    };

    window.addEventListener("flowinaja:mutate", onCustomMutate);

    return () => {
      if (broadcastRef.current) {
        broadcastRef.current.close();
      }
      window.removeEventListener("flowinaja:mutate", onCustomMutate);
    };
  }, [executeSync]);

  // Periodic polling interval
  useEffect(() => {
    // Initial fetch
    executeSync(false);

    // Smart polling: every 4 seconds when tab is active
    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          executeSync(false);
        }
      }, 4000);
    };

    startPolling();

    // Trigger immediate sync on tab focus or visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        executeSync(false);
        startPolling();
      } else {
        if (intervalId) clearInterval(intervalId);
      }
    };

    const onWindowFocus = () => {
      executeSync(false);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [executeSync]);

  return (
    <RealtimeSyncContext.Provider
      value={{
        isSyncing,
        lastSyncedAt,
        syncNow: () => executeSync(true),
        soundEnabled,
        setSoundEnabled,
        unreadCount,
      }}
    >
      {children}

      {/* Floating Real-time Toast Notifications Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xl text-xs text-slate-800 dark:text-slate-100 animate-in slide-in-from-bottom-3 duration-200"
          >
            <div className="mt-0.5 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              {t.type === "request_new" ? (
                <FileText className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {t.title}
                </span>
                <span className="text-[10px] text-slate-400">Baru saja</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {t.message}
              </p>
              {t.link && (
                <div className="pt-1">
                  <Link
                    href={t.link}
                    onClick={() => removeToast(t.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Buka Rincian</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </RealtimeSyncContext.Provider>
  );
}
