import { Prisma } from "@prisma/client"
import db from "@/lib/db"

/**
 * VendaService — Regras de negócio de vendas e carrinho.
 * Baseado na engenharia reversa do PDVStore (VendaService).
 *
 * Regras críticas de domínio (tudo dentro de UMA transação com rollback):
 * 0. Exige CAIXA ABERTO (senão lança erro)
 * 0.1. Venda FIADA exige cliente ativo e respeita LimiteCredito
 * 1. Valida estoque de cada produto antes de gravar
 * 2. Grava cabeçalho + itens
 * 3. BAIXA estoque e registra MovimentacaoEstoque tipo SAIDA
 * 4. Venda fiada AUMENTA SaldoDevedor do cliente
 * 5. Processa pagamento (estrutura pronta para gateway real)
 * 6. Commit apenas se tudo passar; qualquer falha faz rollback
 */

/* ====================== Tipos ====================== */

export interface ItemVendaInput {
  produtoId: number
  quantidade: number
  precoUnitario: number
}

export interface VendaInput {
  usuarioId: number
  formaPagamento: string // DINHEIRO | PIX | CARTAO_CREDITO | CARTAO_DEBITO | FIADO
  desconto?: number
  clienteId?: number // Obrigatório se FIADO
  itens: ItemVendaInput[]
}

/* ====================== Registro de venda (parte 1) ====================== */

export async function registrarVenda(data: VendaInput) {
  if (!data.itens || data.itens.length === 0) {
    throw new Error("A venda deve conter pelo menos um item")
  }

  if (!data.formaPagamento) {
    throw new Error("Selecione uma forma de pagamento")
  }

  // 0. Exige caixa aberto
  const caixa = await db.caixa.findFirst({ where: { status: "ABERTO" } })
  if (!caixa) {
    throw new Error("Nenhum caixa aberto. Abra o caixa antes de registrar vendas.")
  }

  // 0.1 Venda fiada exige cliente ativo e respeita limite de crédito
  const fiado = data.formaPagamento.toUpperCase() === "FIADO"
  if (fiado) {
    if (!data.clienteId) {
      throw new Error("Venda fiada exige um cliente selecionado")
    }

    const cliente = await db.cliente.findUnique({ where: { id: data.clienteId } })
    if (!cliente || !cliente.ativo) {
      throw new Error("Cliente informado não está ativo")
    }

    const totalItens = data.itens.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0)
    const totalComDesconto = Math.max(0, totalItens - (data.desconto ?? 0))
    if (cliente.saldoDevedor + totalComDesconto > cliente.limiteCredito) {
      throw new Error("Limite de crédito do cliente excedido")
    }
  }

  // Calcula ValorTotal
  const totalItens = data.itens.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0)
  const valorTotal = Math.max(0, totalItens - (data.desconto ?? 0))

  // Valida estoque de cada produto antes de gravar
  for (const item of data.itens) {
    const produto = await db.produto.findUnique({ where: { id: item.produtoId } })
    if (!produto || !produto.ativo) {
      throw new Error(`Produto ID ${item.produtoId} não encontrado ou inativo`)
    }
    if (produto.estoque < item.quantidade) {
      throw new Error(`Estoque insuficiente para ${produto.nome}`)
    }
  }

  // Transação única com rollback automático em caso de erro
  return db.$transaction(async (tx) => {
    // 2. Grava cabeçalho da venda
    const venda = await tx.venda.create({
      data: {
        usuarioId: data.usuarioId,
        caixaId: caixa.id,
        clienteId: data.clienteId ?? null,
        valorTotal,
        desconto: data.desconto ?? 0,
        formaPagamento: data.formaPagamento,
        status: "CONCLUIDA",
      },
    })

    // 3. Grava itens e baixa estoque
    for (const item of data.itens) {
      await tx.itemVenda.create({
        data: {
          vendaId: venda.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          subtotal: item.quantidade * item.precoUnitario,
        },
      })

      await tx.produto.update({
        where: { id: item.produtoId },
        data: { estoque: { decrement: item.quantidade } },
      })

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: item.produtoId,
          tipo: "SAIDA",
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          usuarioId: data.usuarioId,
          motivo: `Venda #${venda.id}`,
          referenciaVendaId: venda.id,
        },
      })
    }

    // 4. Venda fiada aumenta SaldoDevedor
    if (fiado && data.clienteId) {
      await tx.cliente.update({
        where: { id: data.clienteId },
        data: {
          saldoDevedor: {
            increment: valorTotal,
          },
        },
      })
    }

    // 5. Processamento de pagamento (estrutura pronta para gateway real)
    // Aqui entraria a integração com PagSeguro/Mercado Pago/Stripe
    if (data.formaPagamento.toUpperCase() === "PIX") {
      // Gerar PixTxId (mock — substituir por integração real)
      const pixTxId = crypto.randomUUID().replace(/-/g, "").toUpperCase()
      await tx.venda.update({
        where: { id: venda.id },
/* ====================== Cancelamento de venda ====================== */

export async function cancelarVenda(vendaId: number, motivo: string, usuarioId?: number) {
  const venda = await db.venda.findUnique({
    where: { id: vendaId },
    include: { itens: true },
  })

  if (!venda || venda.status === "CANCELADA") {
    return false
  }

  return db.$transaction(async (tx) => {
    // Devolve cada item ao estoque
    for (const item of venda.itens) {
      await tx.produto.update({
        where: { id: item.produtoId },
        data: { estoque: { increment: item.quantidade } },
      })

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: item.produtoId,
          tipo: "ENTRADA",
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          usuarioId,
          motivo: `Estorno - Venda #${venda.id}: ${motivo}`,
          referenciaVendaId: venda.id,
        },
      })
    }

    // Devolve saldo devedor se era fiada
    if (venda.clienteId && venda.formaPagamento.toUpperCase() === "FIADO") {
      await tx.cliente.update({
        where: { id: venda.clienteId },
        data: {
          saldoDevedor: {
            decrement: venda.valorTotal,
          },
        },
      })
    }

    // Marca venda como cancelada
    await tx.venda.update({
      where: { id: vendaId },
      data: { status: "CANCELADA" },
    })

    return true
  })
}

/* ====================== Consulta ====================== */

export async function obterVenda(id: number) {
  return db.venda.findUnique({
    where: { id },
    include: {
      itens: {
        include: { produto: { select: { id: true, nome: true, codigoBarras: true } } },
      },
      usuario: { select: { id: true, nome: true } },
      cliente: { select: { id: true, nome: true, cpfCnpj: true } },
      caixa: { select: { id: true, status: true } },
    },
  })
}

export async function listarVendas(filtro?: {
  inicio?: Date
  fim?: Date
  status?: string
  formaPagamento?: string
  caixaId?: number
  clienteId?: number
}) {
  return db.venda.findMany({
    where: {
      ...(filtro.inicio && { dataVenda: { gte: filtro.inicio } }),
      ...(filtro.fim && { dataVenda: { lte: filtro.fim } }),
      ...(filtro.status && { status: filtro.status }),
      ...(filtro.formaPagamento && { formaPagamento: filtro.formaPagamento }),
      ...(filtro.caixaId && { caixaId: filtro.caixaId }),
      ...(filtro.clienteId && { clienteId: filtro.clienteId }),
    },
    include: {
      itens: {
        include: { produto: { select: { id: true, nome: true } } },
      },
      usuario: { select: { id: true, nome: true } },
      cliente: { select: { id: true, nome: true } },
    },
    orderBy: { dataVenda: "desc" },
  })
}

        data: { pixTxId },
      })
    }

    return venda
  })
}

/* ====================== Relatórios rápidos ====================== */

export async function calcularTotalVendas(inicio: Date, fim: Date) {
  const resultado = await db.venda.aggregate({
    where: {
      dataVenda: { gte: inicio, lte: fim },
      status: "CONCLUIDA",
    },
    _sum: { valorTotal: true },
  })
  return resultado._sum.valorTotal ?? 0
}

export async function contarVendas(inicio: Date, fim: Date) {
  return db.venda.count({
    where: {
      dataVenda: { gte: inicio, lte: fim },
      status: "CONCLUIDA",
    },
  })
}

export async function relatorioVendasPorFormaPagamento(inicio: Date, fim: Date) {
  return db.venda.findMany({
    where: {
      dataVenda: { gte: inicio, lte: fim },
      status: "CONCLUIDA",
    },
    select: {
      id: true,
      formaPagamento: true,
      valorTotal: true,
      dataVenda: true,
    },
    orderBy: { dataVenda: "asc" },
  })
}
