import { NextRequest, NextResponse } from "next/server"
import { registrarSangria } from "@/server/caixa.service"
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
    const { caixaId, valor } = body
    if (!caixaId || !valor || valor <= 0) {
      return NextResponse.json({ error: "Caixa e valor são obrigatórios" }, { status: 400 })
    }

    const ok = await registrarSangria(Number(caixaId), Number(valor))
    if (!ok) {
      return NextResponse.json({ error: "Caixa não encontrado ou fechado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
