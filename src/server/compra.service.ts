import db from "@/lib/db"

/**
 * CompraService — Regras de negócio de compras de fornecedores.
 * Baseado na engenharia reversa do PDVStore (CompraService).
 *
 * Regras:
 * - Pelo menos um item
 * - Quantidade > 0 e preço de custo >= 0
 * - Todos os produtos devem existir
 * - Transação única: grava compra → aumenta estoque → registra movimentação ENTRADA
 * - Atualiza precoCusto do produto se positivo
 * - Cancelamento devolve estoque (com Math.max(0, ...))
 */

/* ====================== Registro de compra ====================== */

export interface ItemCompraInput {
  produtoId: number
  quantidade: number
  precoCusto: number
}

export interface CompraInput {
  fornecedorId: number
  usuarioId: number
  numeroNota?: string
  itens: ItemCompraInput[]
}

export async function registrarCompra(data: CompraInput) {
  if (!data.itens || data.itens.length === 0) {
    throw new Error("A compra deve conter pelo menos um item")
  }

  for (const item of data.itens) {
    if (item.quantidade <= 0) {
      throw new Error("Quantidade dos itens deve ser maior que zero")
    }
    if (item.precoCusto < 0) {
      throw new Error("Preço de custo não pode ser negativo")
    }
  }

  // Verifica se todos os produtos existem
  for (const item of data.itens) {
    const produto = await db.produto.findUnique({ where: { id: item.produtoId } })
    if (!produto) {
      throw new Error(`Produto ID ${item.produtoId} não encontrado`)
    }
  }

  const valorTotal = data.itens.reduce(
    (sum, i) => sum + i.quantidade * i.precoCusto,
    0
  )

  return db.$transaction(async (tx) => {
    // Grava a compra
    const compra = await tx.compra.create({
      data: {
        fornecedorId: data.fornecedorId,
        usuarioId: data.usuarioId,
        numeroNota: data.numeroNota || null,
        valorTotal,
        status: "CONCLUIDA",
      },
    })

    // Para cada item: aumenta estoque, atualiza precoCusto, registra movimentação
    for (const item of data.itens) {
      const produto = await tx.produto.findUnique({ where: { id: item.produtoId } })

      await tx.produto.update({
        where: { id: item.produtoId },
        data: {
          estoque: { increment: item.quantidade },
          ...(item.precoCusto > 0 && { precoCusto: item.precoCusto }),
        },
      })

      await tx.movimentacaoEstoque.create({
        data: {
          produtoId: item.produtoId,
          tipo: "ENTRADA",
          quantidade: item.quantidade,
          precoUnitario: item.precoCusto,
          usuarioId: data.usuarioId,
          motivo: `Compra #${compra.id} - ${compra.numeroNota ?? "sem nota"}`,
        },
      })
    }

    return compra
  })
}

/* ====================== Consulta ====================== */

export async function obterCompra(id: number) {
  return db.compra.findUnique({
    where: { id },
    include: {
      fornecedor: { select: { id: true, nome: true, cnpj: true } },
      usuario: { select: { id: true, nome: true } },
      itens: {
        include: { produto: { select: { id: true, nome: true, codigoBarras: true } } },
      },
    },
  })
}

export async function listarCompras(inicio?: Date, fim?: Date) {
  return db.compra.findMany({
    where: {
      ...(inicio && { dataCompra: { gte: inicio } }),
      ...(fim && { dataCompra: { lte: fim } }),
    },
    include: {
      fornecedor: { select: { id: true, nome: true } },
      _count: { select: { itens: true } },
    },
    orderBy: { dataCompra: "desc" },
  })
}

/* ====================== Cancelamento de compra ====================== */

export async function cancelarCompra(id: number) {
  const compra = await db.compra.findUnique({
    where: { id },
    include: { itens: true },
  })

  if (!compra || compra.status === "CANCELADA") {
    return false
  }

  return db.$transaction(async (tx) => {
    for (const item of compra.itens) {
      const produto = await tx.produto.findUnique({ where: { id: item.produtoId } })
      if (produto) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: {
            estoque: Math.max(0, produto.estoque - item.quantidade),
          },
        }
      }
    }

    await tx.compra.update({
      where: { id },
      data: { status: "CANCELADA" },
    })

    return true
  })
}
