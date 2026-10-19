import { NextRequest, NextResponse } from "next/server"
import { relatorioVendasPorFormaPagamento } from "@/server/venda.service"
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

    if (!inicio || !fim) {
      return NextResponse.json({ error: "Parâmetros início e fim são obrigatórios" }, { status: 400 })
    }

    const vendas = await relatorioVendasPorFormaPagamento(new Date(inicio), new Date(fim))

    const agrupado: Record<string, { quantidade: number; total: number }> = {}
    for (const v of vendas) {
      if (!agrupado[v.formaPagamento]) {
        agrupado[v.formaPagamento] = { quantidade: 0, total: 0 }
      }
      agrupado[v.formaPagamento].quantidade += 1
      agrupado[v.formaPagamento].total += v.valorTotal
    }

    return NextResponse.json(agrupado)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
