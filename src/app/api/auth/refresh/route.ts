import { NextRequest, NextResponse } from "next/server"
import { refreshAccessToken } from "@/server/usuario.service"

/**
 * POST /api/auth/refresh
 * Renova o access token usando um refresh token válido.
 *
 * Body: { refreshToken: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token é obrigatório" },
        { status: 400 }
      )
    }

    const resultado = await refreshAccessToken(refreshToken)

    if (!resultado) {
      return NextResponse.json(
        { error: "Refresh token inválido ou expirado" },
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
    console.error("Erro ao renovar token:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
