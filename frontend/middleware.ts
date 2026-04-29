import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check if user is accessing dashboard
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    // In a real app, you'd check for a valid JWT token
    // For now, we'll check localStorage on the client side
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
