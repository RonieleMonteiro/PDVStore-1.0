import { NextRequest, NextResponse } from "next/server"
import { baixarEstoque, adicionarEstoque } from "@/server/estoque.service"
import { validarAccessToken } from "@/lib/auth"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (!["ADMINISTRADOR", "ESTOQUISTA"].includes(payload.papel)) {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 })
    }

    const body = await request.json()
    const { tipo, quantidade, motivo, referenciaVendaId } = body

    if (!tipo || !quantidade || quantidade <= 0) {
      return NextResponse.json({ error: "Tipo e quantidade são obrigatórios" }, { status: 400 })
    }

    const usuarioId = payload.userId

    if (tipo === "SAIDA") {
      await baixarEstoque(Number(params.id), quantidade, motivo || "Ajuste manual", usuarioId, referenciaVendaId)
    } else if (tipo === "ENTRADA") {
      await adicionarEstoque(Number(params.id), quantidade, motivo || "Ajuste manual", usuarioId)
    } else {
      return NextResponse.json({ error: "Tipo inválido (ENTRADA ou SAIDA)" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message.includes("Estoque insuficiente")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
