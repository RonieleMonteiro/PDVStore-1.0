import db from "@/lib/db"

/**
 * RelatorioService — Relatórios gerenciais do dashboard.
 * Baseado na engenharia reversa do PDVStore (RelatorioService).
 *
 * Relatórios:
 * - Itens mais vendidos (ranking)
 * - Alertas de estoque mínimo
 * - Totais por forma de pagamento
 * - Vendas e movimentações por dia
 */

/* ====================== Itens mais vendidos ====================== */

export interface ItemMaisVendido {
  nomeProduto: string
  codigoBarras: string | null
  totalVendido: number
  valorTotalVendido: number
  estoqueAtual: number
  estoqueMinimo: number
  statusMinimo: "BAIXO" | "OK"
}

export async function gerarRelatorioItensMaisVendidos(
  inicio: Date,
  fim: Date,
  topN = 10
): Promise<ItemMaisVendido[]> {
  const itens = await db.itemVenda.groupBy({
    by: ["produtoId"],
    where: {
      venda: {
        status: "CONCLUIDA",
        dataVenda: { gte: inicio, lte: fim },
      },
    },
    _sum: { quantidade: true },
    orderBy: { _sum: { quantidade: "desc" } },
    take: topN,
  })

  const resultado: ItemMaisVendido[] = []

  for (const grupo of itens) {
    const produto = await db.produto.findUnique({
      where: { id: grupo.produtoId },
    })
    if (!produto) continue

    const vendasItens = await db.itemVenda.findMany({
      where: {
        produtoId: grupo.produtoId,
        venda: {
          status: "CONCLUIDA",
          dataVenda: { gte: inicio, lte: fim },
        },
      },
      select: { quantidade: true, precoUnitario: true },
    })

    const valorTotalVendido = vendasItens.reduce(
      (sum, i) => sum + i.quantidade * i.precoUnitario,
      0
    )

    resultado.push({
      nomeProduto: produto.nome,
      codigoBarras: produto.codigoBarras,
      totalVendido: grupo._sum.quantidade ?? 0,
      valorTotalVendido,
      estoqueAtual: produto.estoque,
      estoqueMinimo: produto.estoqueMinimo,
      statusMinimo: produto.estoque <= produto.estoqueMinimo ? "BAIXO" : "OK",
    })
  }

  return resultado.sort((a, b) => b.totalVendido - a.totalVendido).slice(0, topN)
}

/* ====================== Alertas de estoque mínimo ====================== */

export async function gerarRelatorioEstoqueMinimo() {
  return db.produto.findMany({
    where: {
      ativo: true,
      estoque: { lte: db.produto.fields.estoqueMinimo },
    },
    orderBy: { nome: "asc" },
  })
}

/* ====================== Vendas por forma de pagamento ====================== */

export interface PagamentoPorForma {
  formaPagamento: string
  quantidade: number
  total: number
}

export async function gerarRelatorioPagamentosPorForma(
  inicio: Date,
  fim: Date
): Promise<PagamentoPorForma[]> {
  const vendas = await db.venda.findMany({
    where: {
      dataVenda: { gte: inicio, lte: fim },
      status: "CONCLUIDA",
    },
    select: { formaPagamento: true, valorTotal: true },
  })

  const agrupado = new Map<string, { quantidade: number; total: number }>()

  for (const v of vendas) {
    const atual = agrupado.get(v.formaPagamento) || { quantidade: 0, total: 0 }
    atual.quantidade += 1
    atual.total += v.valorTotal
    agrupado.set(v.formaPagamento, atual)
  }

  return Array.from(agrupado.entries()).map(([formaPagamento, dados]) => ({
    formaPagamento,
    quantidade: dados.quantidade,
    total: dados.total,
  }))
}

/* ====================== Vendas por dia ====================== */

export interface VendaPorDia {
  dia: Date
  totalVendas: number
}

export async function gerarRelatorioVendasPorDia(
  inicio: Date,
  fim: Date
): Promise<VendaPorDia[]> {
  const vendas = await db.venda.findMany({
    where: {
      dataVenda: { gte: inicio, lte: fim },
      status: "CONCLUIDA",
    },
    select: { dataVenda: true, valorTotal: true },
  })

  const agrupado = new Map<string, number>()

  for (const v of vendas) {
    const dia = v.dataVenda.toISOString().split("T")[0]
    agrupado.set(dia, (agrupado.get(dia) ?? 0) + v.valorTotal)
  }

  return Array.from(agrupado.entries())
    .map(([dia, totalVendas]) => ({ dia: new Date(dia), totalVendas }))
    .sort((a, b) => a.dia.getTime() - b.dia.getTime())
}
