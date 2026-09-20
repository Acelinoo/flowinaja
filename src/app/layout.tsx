import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://flowinaja.vercel.app"),
  title: "Flowinaja — Platform Permintaan & Persetujuan Internal",
  description:
    "Platform alur kerja internal berorientasi produksi untuk mengelola permintaan, persetujuan bertahap, dan jejak audit operasional organisasi buatan acelino.my.id.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Flowinaja — Platform Permintaan & Persetujuan Internal",
    description: "Platform alur kerja internal berorientasi produksi buatan acelino.my.id",
    url: "https://flowinaja.vercel.app",
    siteName: "Flowinaja",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Flowinaja Logo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  authors: [{ name: "Acelino", url: "https://acelino.my.id" }],
  creator: "acelino.my.id",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('flowinaja_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans transition-colors duration-150">
        {children}
      </body>
    </html>
  );
}
