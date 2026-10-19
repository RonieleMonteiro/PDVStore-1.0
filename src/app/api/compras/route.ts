import { NextRequest, NextResponse } from "next/server"
import { registrarCompra, listarCompras } from "@/server/compra.service"
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
    const inicio = searchParams.get("inicio")
    const fim = searchParams.get("fim")

    const compras = await listarCompras(inicio ? new Date(inicio) : undefined, fim ? new Date(fim) : undefined)
    return NextResponse.json(compras)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

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

    if (!["ADMINISTRADOR"].includes(payload.papel)) {
      return NextResponse.json({ error: "Apenas administrador" }, { status: 403 })
    }

    const body = await request.json()
    const compra = await registrarCompra({
      fornecedorId: Number(body.fornecedorId),
      usuarioId: payload.userId,
      numeroNota: body.numeroNota,
      itens: body.itens.map((i: any) => ({
        produtoId: Number(i.produtoId),
        quantidade: Number(i.quantidade),
        precoCusto: Number(i.precoCusto),
      })),
    })

    return NextResponse.json(compra, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
