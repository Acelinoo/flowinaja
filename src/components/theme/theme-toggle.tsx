"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      try {
        localStorage.setItem("flowinaja_theme", "dark");
      } catch {}
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem("flowinaja_theme", "light");
      } catch {}
    }
  };

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400">
        <span className="w-4 h-4" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-800"
      title={theme === "dark" ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      aria-label={theme === "dark" ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline text-xs font-medium text-slate-300">Mode Terang</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600" />
          <span className="hidden sm:inline text-xs font-medium text-slate-700">Mode Gelap</span>
        </>
      )}
    </button>
  );
}
