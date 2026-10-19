import { NextRequest, NextResponse } from "next/server"
import { abrirCaixa } from "@/server/caixa.service"
import { validarAccessToken } from "@/lib/auth"

/**
 * POST /api/caixa/abrir
 * Abre um novo turno de caixa.
 * Regras: somente um caixa aberto por vez. Apenas ADMINISTRADOR ou OPERADOR.
 *
 * Headers: Authorization: Bearer <access_token>
 * Body: { valorInicial: number, usuarioId: number }
 */
export async function POST(request: NextRequest) {
  try {
    // Valida autenticação
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = validarAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 })
    }

    // Apenas admin ou operador podem abrir caixa
    if (!["ADMINISTRADOR", "OPERADOR"].includes(payload.papel)) {
      return NextResponse.json(
        { error: "Permissão insuficiente" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { valorInicial, usuarioId } = body

    if (valorInicial === undefined || valorInicial === null) {
      return NextResponse.json(
        { error: "Valor inicial é obrigatório" },
        { status: 400 }
      )
    }

    if (!usuarioId) {
      return NextResponse.json(
        { error: "Usuário é obrigatório" },
        { status: 400 }
      )
    }

    const caixa = await abrirCaixa(Number(valorInicial), Number(usuarioId))

    return NextResponse.json(caixa, { status: 201 })
  } catch (error: any) {
    if (error.message.includes("Já existe um caixa aberto")) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Erro ao abrir caixa:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
