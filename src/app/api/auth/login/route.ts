import { NextRequest, NextResponse } from "next/server"
import { login } from "@/server/usuario.service"
import { validarAccessToken } from "@/lib/auth"

/**
 * POST /api/auth/login
 * Autentica usuário com email e senha.
 * Retorna access token + refresh token + dados do usuário (sem senha).
 *
 * Body: { email: string, senha: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, senha } = body

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    const resultado = await login(email, senha)

    if (!resultado) {
      // Nunca revela se o email existe ou a senha está incorreta
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      )
    }

    const { usuario, tokens } = resultado

    return NextResponse.json({
      usuario,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.accessExpiresIn,
    })
  } catch (error) {
    console.error("Erro no login:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/login
 * Verifica se o access token enviado no header Authorization é válido.
 * Headers: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const token = authHeader.substring(7)
  const payload = validarAccessToken(token)

  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({
    authenticated: true,
    userId: payload.userId,
    email: payload.email,
    papel: payload.papel,
  })
}
