import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ESSENTIAL_AUTH_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Host-authjs.csrf-token",
  "authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "authjs.callback-url",
];

async function handleLogout(request: Request) {
  const namesToClear = new Set<string>(ESSENTIAL_AUTH_COOKIES);

  // Parse actual cookies sent by the browser
  const rawCookieHeader = request.headers.get("cookie");
  if (rawCookieHeader) {
    const parts = rawCookieHeader.split(";");
    for (const part of parts) {
      const trimmed = part.trim();
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const name = trimmed.slice(0, eqIdx).trim();
        if (
          name.includes("authjs") ||
          name.includes("next-auth") ||
          name.includes("session") ||
          name.includes("csrf") ||
          name.includes("callback")
        ) {
          namesToClear.add(name);
        }
      }
    }
  }

  // Also read from next/headers if accessible
  try {
    const cookieStore = await cookies();
    for (const c of cookieStore.getAll()) {
      if (
        c.name.includes("authjs") ||
        c.name.includes("next-auth") ||
        c.name.includes("session") ||
        c.name.includes("csrf")
      ) {
        namesToClear.add(c.name);
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

  // Clear-Site-Data: "cookies" tells the browser to wipe ALL origin cookies
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
