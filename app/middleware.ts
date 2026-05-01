import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'change-me-in-production')

export const config = {
  matcher: ['/backoffice/:path*'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/backoffice/login') {
    return NextResponse.next()
  }

  const token = request.cookies.get('qp_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/backoffice/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)
    const role = payload.role as string

    if (pathname.startsWith('/backoffice/management') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/backoffice/reading', request.url))
    }

    if (pathname.startsWith('/backoffice/reports') && role === 'READER') {
      return NextResponse.redirect(new URL('/backoffice/reading', request.url))
    }

    const res = NextResponse.next()
    res.headers.set('x-user-id', (payload.id as string) ?? '')
    res.headers.set('x-user-role', role)
    res.headers.set('x-user-entity-id', (payload.entityId as string) ?? '')
    return res
  } catch {
    return NextResponse.redirect(new URL('/backoffice/login', request.url))
  }
}
