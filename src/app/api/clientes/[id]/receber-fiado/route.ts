import { NextRequest, NextResponse } from "next/server"
import { receberFiado } from "@/server/cliente.service"
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
    const { valor } = body
    if (!valor || valor <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    const ok = await receberFiado(Number(params.id), valor)
    if (!ok) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
