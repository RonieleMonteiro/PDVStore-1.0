import { NextRequest, NextResponse } from "next/server"
import { obterCaixaAberto } from "@/server/caixa.service"
import { validarAccessToken } from "@/lib/auth"

/**
 * GET /api/caixa/aberto
 * Retorna o caixa aberto no momento, se houver.
 *
 * Headers: Authorization: Bearer <access_token>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const payload = validarAccessToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 })
    }

    const caixa = await obterCaixaAberto()

    if (!caixa) {
      return NextResponse.json({ aberto: false }, { status: 200 })
    }

    return NextResponse.json({
      aberto: true,
      caixaId: caixa.id,
      usuario: caixa.usuario,
      abertura: caixa.abertura,
      valorInicial: caixa.valorInicial,
      sangria: caixa.sangria,
      totalVendas: caixa._count?.vendas ?? 0,
    })
  } catch (error) {
    console.error("Erro ao consultar caixa aberto:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
