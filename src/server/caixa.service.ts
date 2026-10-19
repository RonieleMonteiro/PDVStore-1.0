import db from "@/lib/db"

/**
 * CaixaService — Regras de negócio de fluxo de caixa.
 * Baseado na engenharia reversa do PDVStore (CaixaService).
 *
 * Regras de domínio:
 * - SOMENTE UM caixa aberto por vez
 * - Vendas só com caixa aberto
 * - Fechamento: ValorFinal = ValorInicial + VendasConcluidas - Sangria
 * - Sangria acumulativa durante o turno
 */

/* ====================== Abertura ====================== */

export async function abrirCaixa(valorInicial: number, usuarioId: number) {
  const existente = await obterCaixaAberto()
  if (existente) {
    throw new Error("Já existe um caixa aberto. Feche o caixa atual antes de abrir outro.")
  }

  if (valorInicial < 0) {
    throw new Error("Valor inicial não pode ser negativo")
  }

  return db.caixa.create({
    data: {
      usuarioId,
      valorInicial,
      status: "ABERTO",
    },
    include: {
      usuario: {
        select: { id: true, nome: true, papel: true },
      },
    },
  })
}

/* ====================== Consulta ====================== */

export async function obterCaixaAberto() {
  return db.caixa.findFirst({
    where: { status: "ABERTO" },
    include: {
      usuario: {
        select: { id: true, nome: true, papel: true },
      },
      _count: {
        select: { vendas: true },
      },
    },
  })
}

export async function obterCaixa(id: number) {
  return db.caixa.findUnique({
    where: { id },
    include: {
      usuario: {
        select: { id: true, nome: true, papel: true },
      },
      vendas: {
        where: { status: "CONCLUIDA" },
        select: { id: true, valorTotal: true, formaPagamento: true, dataVenda: true },
      },
    },
  })
}

export async function listarCaixas() {
  return db.caixa.findMany({
    include: {
      usuario: {
        select: { id: true, nome: true },
      },
      _count: {
        select: { vendas: true },
      },
    },
    orderBy: { abertura: "desc" },
  })
}

/* ====================== Sangria ====================== */

export async function registrarSangria(caixaId: number, valor: number) {
  if (valor <= 0) {
    throw new Error("Valor da sangria deve ser maior que zero")
  }

  const caixa = await db.caixa.findUnique({ where: { id: caixaId } })
  if (!caixa || caixa.status !== "ABERTO") {
    return false
  }

  await db.caixa.update({
    where: { id: caixaId },
    data: {
      sangria: {
        increment: valor,
      },
      valorFinal: caixa.valorFinal ?? caixa.valorInicial,
    },
  })

  return true
}

/* ====================== Fechamento ====================== */

export async function fecharCaixa(caixaId: number) {
  const caixa = await db.caixa.findUnique({ where: { id: caixaId } })

  if (!caixa || caixa.status !== "ABERTO") {
    return false
  }

  // Soma das vendas CONCLUÍDAS deste caixa
  const totalVendas = await db.venda.aggregate({
    where: {
      caixaId,
      status: "CONCLUIDA",
    },
    _sum: { valorTotal: true },
  })

  const sangria = caixa.sangria ?? 0
  const valorFinal = caixa.valorInicial + (totalVendas._sum.valorTotal ?? 0) - sangria

  return db.caixa.update({
    where: { id: caixaId },
    data: {
      valorFinal,
      fechamento: new Date(),
      status: "FECHADO",
    },
    include: {
      usuario: {
        select: { id: true, nome: true },
      },
    },
  })
}

/**
 * Resumo financeiro de um caixa aberto (para exibição no PDV).
 */
export async function resumoCaixaAberto() {
  const caixa = await obterCaixaAberto()
  if (!caixa) {
    return null
  }

  const totalVendas = await db.venda.aggregate({
    where: { caixaId: caixa.id, status: "CONCLUIDA" },
    _sum: { valorTotal: true },
  })

  return {
    caixaId: caixa.id,
    usuario: caixa.usuario.nome,
    abertura: caixa.abertura,
    valorInicial: caixa.valorInicial,
    sangria: caixa.sangria ?? 0,
    totalVendas: totalVendas._sum.valorTotal ?? 0,
    valorEstimado: caixa.valorInicial + (totalVendas._sum.valorTotal ?? 0) - (caixa.sangria ?? 0),
  }
}
