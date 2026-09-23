import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/lib/auth/constants"

/**
 * Optimistic gate only: bounces requests without a session cookie to the
 * login page. Real session and role checks happen in the data access layer.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next()

  const { pathname, search } = request.nextUrl
  const loginUrl = new URL("/login", request.url)
  if (pathname.startsWith("/app/")) {
    loginUrl.searchParams.set("next", `${pathname}${search}`)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/app", "/app/:path*", "/change-password"],
}
