import { NextRequest, NextResponse } from "next/server"
import { fecharCaixa } from "@/server/caixa.service"
import { validarAccessToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
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

    if (!["ADMINISTRADOR", "OPERADOR"].includes(payload.papel)) {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 })
    }

    const body = await request.json()
    const { caixaId } = body
    if (!caixaId) {
      return NextResponse.json({ error: "ID do caixa é obrigatório" }, { status: 400 })
    }

    const ok = await fecharCaixa(Number(caixaId))
    if (!ok) {
      return NextResponse.json({ error: "Caixa não encontrado ou já fechado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
