import { NextRequest, NextResponse } from "next/server"
import { buscarProdutos } from "@/server/estoque.service"
import { validarAccessToken } from "@/lib/auth"

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

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""

    const produtos = await buscarProdutos(q)
    return NextResponse.json(produtos)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
