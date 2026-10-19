import { NextRequest, NextResponse } from "next/server"
import { registrarVenda } from "@/server/venda.service"
import { validarAccessToken } from "@/lib/auth"

/**
 * POST /api/vendas
 * Registra uma venda completa (carrinho finalizado).
 * Regras: exige caixa aberto, valida estoque, processa pagamento, tudo em transação.
 *
 * Headers: Authorization: Bearer <access_token>
 * Body: { usuarioId, formaPagamento, desconto?, clienteId?, itens: [{produtoId, quantidade, precoUnitario}] }
 */
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

    // Apenas admin ou operador podem registrar vendas
    if (!["ADMINISTRADOR", "OPERADOR"].includes(payload.papel)) {
      return NextResponse.json(
        { error: "Permissão insuficiente" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { usuarioId, formaPagamento, desconto, clienteId, itens } = body

    if (!usuarioId) {
      return NextResponse.json({ error: "Usuário é obrigatório" }, { status: 400 })
    }
    if (!formaPagamento) {
      return NextResponse.json({ error: "Forma de pagamento é obrigatória" }, { status: 400 })
    }
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: "A venda deve conter pelo menos um item" }, { status: 400 })
    }

    const venda = await registrarVenda({
      usuarioId: Number(usuarioId),
      formaPagamento,
      desconto: desconto ?? 0,
      clienteId: clienteId ?? undefined,
      itens: itens.map((i: any) => ({
        produtoId: Number(i.produtoId),
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
      })),
    })

    return NextResponse.json(venda, { status: 201 })
  } catch (error: any) {
    if (error.message.includes("caixa aberto") || error.message.includes("Estoque insuficiente") || error.message.includes("Limite de crédito")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Erro ao registrar venda:", error)
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
