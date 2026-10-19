import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validarAccessToken } from "@/lib/auth"

/**
 * Middleware de autenticação para rotas da API.
 *
 * Rotas públicas (não exigem token):
 * - POST /api/auth/login
 *
 * Rotas protegidas (exigem Authorization: Bearer <token>):
 * - Todas as demais rotas em /api/*
 *
 * Se o token for inválido ou ausente, retorna 401.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas
  const rotasPublicas = ["/api/auth/login"]

  if (rotasPublicas.includes(pathname)) {
    return NextResponse.next()
  }

  // Protege todas as outras rotas da API
  if (pathname.startsWith("/api/")) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = validarAccessToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 })
    }

    // Anexa dados do usuário ao header para uso nos handlers (opcional)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-user-id", String(payload.userId))
    requestHeaders.set("x-user-email", payload.email)
    requestHeaders.set("x-user-papel", payload.papel)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
