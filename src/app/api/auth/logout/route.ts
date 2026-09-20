import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * GET & POST /api/auth/logout
 * Direct endpoint to eradicate all NextAuth and Auth.js session cookies
 * and redirect to /login.
 */
async function handleLogout(request: Request) {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  const url = new URL("/login", request.url);
  const response = NextResponse.redirect(url);

  for (const c of allCookies) {
    if (
      c.name.includes("authjs") ||
      c.name.includes("next-auth") ||
      c.name.includes("session") ||
      c.name.includes("csrf")
    ) {
      cookieStore.delete(c.name);
      response.cookies.delete(c.name);
      response.cookies.set(c.name, "", {
        expires: new Date(0),
        maxAge: 0,
        path: "/",
      });
    }
  }

  return response;
}

export const GET = handleLogout;
export const POST = handleLogout;
