import db from "@/lib/db"

/**
 * ClienteService — Regras de negócio de clientes e venda fiada.
 * Baseado na engenharia reversa do PDVStore (ClienteService).
 *
 * Regras:
 * - Nome obrigatório
 * - Soft delete (ativo) em vez de exclusão
 * - Receber fiado reduz SaldoDevedor com proteção Math.max(0, ...)
 * - Venda fiada aumenta SaldoDevedor (feita em VendaService)
 */

/* ====================== CRUD ====================== */

export async function listarClientes(apenasAtivos = true, filtro = "") {
  return db.cliente.findMany({
    where: {
      ...(apenasAtivos && { ativo: true }),
      ...(filtro && {
        OR: [
          { nome: { contains: filtro, mode: "insensitive" } },
          { cpfCnpj: { contains: filtro, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { nome: "asc" },
  })
}

export async function obterCliente(id: number) {
  return db.cliente.findUnique({ where: { id } })
}

export async function salvarCliente(data: {
  id?: number
  nome: string
  cpfCnpj?: string
  telefone?: string
  email?: string
  endereco?: string
  limiteCredito?: number
}) {
  if (!data.nome || !data.nome.trim()) {
    throw new Error("Nome do cliente é obrigatório")
  }

  if (data.id) {
    // Atualiza existente
    const existente = await db.cliente.findUnique({ where: { id: data.id } })
    if (!existente) {
      throw new Error("Cliente não encontrado")
    }

    return db.cliente.update({
      where: { id: data.id },
      data: {
        nome: data.nome.trim(),
        cpfCnpj: data.cpfCnpj || null,
        telefone: data.telefone || null,
        email: data.email || null,
        endereco: data.endereco || null,
        ...(data.limiteCredito !== undefined && { limiteCredito: data.limiteCredito }),
      },
    })
  }

  // Cadastro novo
  return db.cliente.create({
    data: {
      nome: data.nome.trim(),
      cpfCnpj: data.cpfCnpj || null,
      telefone: data.telefone || null,
      email: data.email || null,
      endereco: data.endereco || null,
      limiteCredito: data.limiteCredito ?? 0,
      saldoDevedor: 0,
      ativo: true,
    },
  })
}

export async function atualizarStatus(id: number, ativo: boolean) {
  const cliente = await db.cliente.findUnique({ where: { id } })
  if (!cliente) {
    return false
  }

  await db.cliente.update({ where: { id }, data: { ativo } })
  return true
}

/* ====================== Recebimento de fiado ====================== */

export async function receberFiado(clienteId: number, valor: number) {
  if (valor <= 0) {
    throw new Error("Valor deve ser maior que zero")
  }

  const cliente = await db.cliente.findUnique({ where: { id: clienteId } })
  if (!cliente) {
    return false
  }

  await db.cliente.update({
    where: { id: clienteId },
    data: {
      saldoDevedor: Math.max(0, cliente.saldoDevedor - valor),
    },
  })

  return true
}

/* ====================== Saldo devedor ====================== */

export async function obterSaldoDevedor(clienteId: number) {
  const cliente = await db.cliente.findUnique({
    where: { id: clienteId },
    select: { id: true, nome: true, saldoDevedor: true, limiteCredito: true },
  })
  return cliente
}
