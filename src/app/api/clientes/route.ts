import { NextRequest, NextResponse } from "next/server"
import { listarClientes, salvarCliente } from "@/server/cliente.service"
import { validarAccessToken } from "@/lib/auth"

/**
 * GET /api/clientes — Lista clientes (filtro opcional por nome/cpf)
 * POST /api/clientes — Cadastra ou atualiza cliente
 */
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
    const filtro = searchParams.get("filtro") || ""
    const apenasAtivos = searchParams.get("ativos") !== "false"

    const clientes = await listarClientes(apenasAtivos, filtro)
    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Erro ao listar clientes:", error)
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

    if (!["ADMINISTRADOR", "OPERADOR"].includes(payload.papel)) {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 })
    }

    const body = await request.json()
    const cliente = await salvarCliente(body)
    return NextResponse.json(cliente, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
