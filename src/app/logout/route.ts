import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const COOKIE_BASE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Host-authjs.csrf-token",
  "authjs.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.callback-url",
  "__Secure-authjs.pkce.code_verifier",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.state",
  "authjs.state",
];

async function handleLogout(request: Request) {
  const namesToClear = new Set<string>();

  // 1. Add all base auth cookie names and their chunk variations (.0 to .9)
  for (const base of COOKIE_BASE_NAMES) {
    namesToClear.add(base);
    for (let i = 0; i <= 9; i++) {
      namesToClear.add(`${base}.${i}`);
    }
  }

  // 2. Add any cookies from next/headers
  try {
    const cookieStore = await cookies();
    const all = cookieStore.getAll();
    for (const c of all) {
      namesToClear.add(c.name);
    }
  } catch (err) {}

  // 3. Add any cookies parsed directly from raw cookie header
  try {
    const rawCookieHeader = request.headers.get("cookie");
    if (rawCookieHeader) {
      const parts = rawCookieHeader.split(";");
      for (const part of parts) {
        const trimmed = part.trim();
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          namesToClear.add(trimmed.slice(0, eqIdx).trim());
        }
      }
    }
  } catch (err) {}

  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url, { status: 302 });

  const isHttps =
    request.url.startsWith("https") ||
    request.headers.get("x-forwarded-proto") === "https" ||
    process.env.NODE_ENV === "production";

  for (const name of namesToClear) {
    const isSecure = name.startsWith("__Secure-") || name.startsWith("__Host-") || isHttps;
    response.cookies.set(name, "", {
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
    });
  }

  // Clear-Site-Data instructs the browser engine to wipe all cookies for this origin
  response.headers.set("Clear-Site-Data", '"cookies"');
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export const GET = handleLogout;
export const POST = handleLogout;
