import { NextRequest, NextResponse } from "next/server"
import { obterVenda, listarVendas } from "@/server/venda.service"
import { validarAccessToken } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const venda = await obterVenda(Number(params.id))
    if (!venda) {
      return NextResponse.json({ error: "Venda não encontrada" }, { status: 404 })
    }
    return NextResponse.json(venda)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
