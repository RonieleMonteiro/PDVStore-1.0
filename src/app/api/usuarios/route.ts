import { NextRequest, NextResponse } from "next/server"
import { listarUsuarios, criarUsuario, podeGerenciarUsuarios } from "@/server/usuario.service"
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

    const podeGerenciar = await podeGerenciarUsuarios(payload.userId)
    if (!podeGerenciar) {
      return NextResponse.json({ error: "Apenas administrador" }, { status: 403 })
    }

    const usuarios = await listarUsuarios()
    return NextResponse.json(usuarios)
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

    const podeGerenciar = await podeGerenciarUsuarios(payload.userId)
    if (!podeGerenciar) {
      return NextResponse.json({ error: "Apenas administrador" }, { status: 403 })
    }

    const body = await request.json()
    const usuario = await criarUsuario(body)
    return NextResponse.json(usuario, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 400 })
  }
}
