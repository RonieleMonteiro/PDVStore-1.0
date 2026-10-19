import db from "@/lib/db"

/**
 * FornecedorService — CRUD de fornecedores.
 * Baseado na engenharia reversa do PDVStore.
 */

/* ====================== CRUD ====================== */

export async function listarFornecedores(apenasAtivos = true) {
  return db.fornecedor.findMany({
    where: apenasAtivos ? { ativo: true } : {},
    orderBy: { nome: "asc" },
  })
}

export async function obterFornecedor(id: number) {
  return db.fornecedor.findUnique({ where: { id } })
}

export async function salvarFornecedor(data: {
  id?: number
  nome: string
  cnpj?: string
  telefone?: string
  email?: string
}) {
  if (!data.nome || !data.nome.trim()) {
    throw new Error("Nome do fornecedor é obrigatório")
  }

  if (data.id) {
    const existente = await db.fornecedor.findUnique({ where: { id: data.id } })
    if (!existente) {
      throw new Error("Fornecedor não encontrado")
    }

    return db.fornecedor.update({
      where: { id: data.id },
      data: {
        nome: data.nome.trim(),
        cnpj: data.cnpj || null,
        telefone: data.telefone || null,
        email: data.email || null,
      },
    })
  }

  return db.fornecedor.create({
    data: {
      nome: data.nome.trim(),
      cnpj: data.cnpj || null,
      telefone: data.telefone || null,
      email: data.email || null,
      ativo: true,
    },
  })
}

export async function atualizarStatus(id: number, ativo: boolean) {
  const fornecedor = await db.fornecedor.findUnique({ where: { id } })
  if (!fornecedor) {
    return false
  }

  await db.fornecedor.update({ where: { id }, data: { ativo } })
  return true
}
