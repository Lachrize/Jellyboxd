import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = process.env.SESSION_COOKIE || "jellyboxd_session";

/**
 * Lightweight auth gate. Middleware runs on the edge where Prisma can't, so it
 * only checks for the *presence* of the session cookie to keep protected pages
 * snappy. Real validation happens in server components via `requireUser()`.
 */
const PROTECTED = [/^\/home/, /^\/journal/, /^\/stats/, /^\/parametres/, /^\/import/, /^\/listes/];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED.some((re) => re.test(pathname));
  if (!isProtected) return NextResponse.next();

  const hasSession = req.cookies.has(COOKIE_NAME);
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons|favicon.ico|manifest.webmanifest|sw.js).*)"],
};
