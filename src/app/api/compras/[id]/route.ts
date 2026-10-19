import { NextRequest, NextResponse } from "next/server"
import { obterCompra } from "@/server/compra.service"
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

    const compra = await obterCompra(Number(params.id))
    if (!compra) {
      return NextResponse.json({ error: "Compra não encontrada" }, { status: 404 })
    }
    return NextResponse.json(compra)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
