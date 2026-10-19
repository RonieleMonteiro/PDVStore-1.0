import { NextRequest, NextResponse } from "next/server"
import { cancelarVenda } from "@/server/venda.service"
import { validarAccessToken } from "@/lib/auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const { motivo } = body

    const ok = await cancelarVenda(Number(params.id), motivo || "Cancelamento via PDV", payload.userId)
    if (!ok) {
      return NextResponse.json({ error: "Venda não encontrada ou já cancelada" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
