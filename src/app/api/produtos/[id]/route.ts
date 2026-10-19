import { NextRequest, NextResponse } from "next/server"
import { obterProduto, atualizarProduto } from "@/server/estoque.service"
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

    const produto = await obterProduto(Number(params.id))
    if (!produto) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }
    return NextResponse.json(produto)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const produto = await atualizarProduto(Number(params.id), body)
    return NextResponse.json(produto)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
