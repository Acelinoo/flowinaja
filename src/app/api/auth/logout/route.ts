import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const COOKIE_NAMES = [
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
  "__Secure-next-auth.pkce.code_verifier",
  "next-auth.pkce.code_verifier",
  "__Secure-authjs.state",
  "authjs.state",
];

async function handleLogout(request: Request) {
  const cookieStore = await cookies();
  const allExistingCookies = cookieStore.getAll();

  const namesToClear = new Set<string>(COOKIE_NAMES);
  for (const c of allExistingCookies) {
    if (
      c.name.includes("authjs") ||
      c.name.includes("next-auth") ||
      c.name.includes("session") ||
      c.name.includes("csrf") ||
      c.name.includes("token")
    ) {
      namesToClear.add(c.name);
    }
  }

  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url, { status: 302 });

  for (const name of namesToClear) {
    cookieStore.delete(name);

    // 1. Next.js response.cookies.set with Secure and HttpOnly
    response.cookies.set(name, "", {
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    // 2. Also set without Secure for localhost/HTTP compatibility
    if (!name.startsWith("__Secure-") && !name.startsWith("__Host-")) {
      response.cookies.set(name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      });
    }

    // 3. Raw Set-Cookie header for absolute browser compliance (RFC 6265bis)
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
    );
  }

  // Prevent browser from caching this redirect
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}

export const GET = handleLogout;
export const POST = handleLogout;
