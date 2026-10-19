import db from "@/lib/db"

/**
 * EstoqueService — Regras de negócio de catálogo e controle de estoque.
 * Baseado na engenharia reversa do PDVStore (EstoqueService).
 *
 * Regras:
 * - Busca por nome ou código de barras (apenas produtos ativos)
 * - Estoque mínimo dispara alerta de reposição
 * - Baixa de estoque na venda; entrada na compra
 * - Ajuste manual com registro de movimentação
 */

/* ====================== Consulta de produtos ====================== */

export async function listarProdutos(apenasAtivos = true) {
  return db.produto.findMany({
    where: apenasAtivos ? { ativo: true } : {},
    orderBy: { nome: "asc" },
  })
}

export async function obterProduto(id: number) {
  return db.produto.findUnique({ where: { id } })
}

export async function obterProdutoPorCodigoBarras(codigoBarras: string) {
  return db.produto.findFirst({
    where: { codigoBarras, ativo: true },
  })
}

/**
 * Busca rápida para o PDV (digitação de código de barras ou nome parcial).
 * Debounce deve ser aplicado na camada frontend.
 */
export async function buscarProdutos(filtro: string) {
  const termo = filtro.trim()
  if (!termo) {
    return listarProdutos()
  }

  return db.produto.findMany({
    where: {
      ativo: true,
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { codigoBarras: { contains: termo, mode: "insensitive" } },
      ],
    },
    orderBy: { nome: "asc" },
    take: 50,
  })
}

/* ====================== CRUD de produtos ====================== */

export async function criarProduto(data: {
  nome: string
  codigoBarras?: string
  preco: number
  precoCusto?: number
  estoqueMinimo?: number
  categoria?: string
  descricao?: string
}) {
  if (!data.nome || !data.nome.trim()) {
    throw new Error("Nome do produto é obrigatório")
  }
  if (data.preco < 0) {
    throw new Error("Preço não pode ser negativo")
  }

  return db.produto.create({
    data: {
      nome: data.nome.trim(),
      codigoBarras: data.codigoBarras?.trim() || null,
      preco: data.preco,
      precoCusto: data.precoCusto ?? 0,
      estoque: 0,
      estoqueMinimo: data.estoqueMinimo ?? 0,
      categoria: data.categoria || null,
      descricao: data.descricao || null,
      ativo: true,
    },
  })
}

export async function atualizarProduto(id: number, data: {
  nome?: string
  preco?: number
  precoCusto?: number
  estoqueMinimo?: number
  categoria?: string
  descricao?: string
  ativo?: boolean
}) {
  const existente = await db.produto.findUnique({ where: { id } })
  if (!existente) {
    throw new Error("Produto não encontrado")
  }

  return db.produto.update({
    where: { id },
    data: {
      ...(data.nome !== undefined && { nome: data.nome.trim() }),
      ...(data.preco !== undefined && { preco: data.preco }),
      ...(data.precoCusto !== undefined && { precoCusto: data.precoCusto }),
      ...(data.estoqueMinimo !== undefined && { estoqueMinimo: data.estoqueMinimo }),
      ...(data.categoria !== undefined && { categoria: data.categoria }),
      ...(data.descricao !== undefined && { descricao: data.descricao }),
      ...(data.ativo !== undefined && { ativo: data.ativo }),
    },
  })
}

/* ====================== Movimentações de estoque ====================== */

export async function baixarEstoque(
  produtoId: number,
  quantidade: number,
  motivo: string,
  usuarioId?: number,
  referenciaVendaId?: number
) {
  if (quantidade <= 0) {
    throw new Error("Quantidade deve ser maior que zero")
  }

  const produto = await db.produto.findUnique({ where: { id: produtoId } })
  if (!produto) {
    return false
  }

  if (produto.estoque < quantidade) {
    throw new Error("Estoque insuficiente")
  }

  await db.$transaction([
    db.produto.update({
      where: { id: produtoId },
      data: { estoque: { decrement: quantidade } },
    }),
    db.movimentacaoEstoque.create({
      data: {
        produtoId,
        tipo: "SAIDA",
        quantidade,
        motivo,
        usuarioId,
        referenciaVendaId,
      },
    }),
  ])

  return true
}

export async function adicionarEstoque(
  produtoId: number,
  quantidade: number,
  motivo: string,
  usuarioId?: number
) {
  if (quantidade <= 0) {
    throw new Error("Quantidade deve ser maior que zero")
  }

  const produto = await db.produto.findUnique({ where: { id: produtoId } })
  if (!produto) {
    return false
  }

  await db.$transaction([
    db.produto.update({
      where: { id: produtoId },
      data: { estoque: { increment: quantidade } },
    }),
    db.movimentacaoEstoque.create({
      data: {
        produtoId,
        tipo: "ENTRADA",
        quantidade,
        motivo,
        usuarioId,
      },
    }),
  ])

  return true
}

/* ====================== Alertas e relatórios ====================== */

export async function obterAlertasEstoqueMinimo() {
  return db.produto.findMany({
    where: {
      ativo: true,
      estoque: { lte: db.produto.fields.estoqueMinimo },
    },
    orderBy: { nome: "asc" },
  })
}

export async function obterHistoricoMovimentacoes(inicio?: Date, fim?: Date) {
  return db.movimentacaoEstoque.findMany({
    where: {
      ...(inicio && { dataMovimentacao: { gte: inicio } }),
      ...(fim && { dataMovimentacao: { lte: fim } }),
    },
    include: {
      produto: { select: { id: true, nome: true, codigoBarras: true } },
      usuario: { select: { id: true, nome: true } },
    },
    orderBy: { dataMovimentacao: "desc" },
  })
}
