import { Prisma, Papel } from "@prisma/client"
import db from "@/lib/db"
import { autenticarUsuario, gerarTokens, validarRefreshToken, obterUsuarioPorId } from "@/lib/auth"
import { PrismaClientKnownRequestError } from "@/lib/auth"

/**
 * UsuarioService — Regras de negócio de usuários, autenticação e permissões.
 * Baseado na engenharia reversa do PDVStore (UsuarioCaixa, UsuarioService).
 *
 * Regras de segurança:
 * - Senhas nunca em texto puro (BCrypt via auth.ts)
 * - Login não revela se falhou email ou senha
 * - Soft delete (ativo = false) em vez de exclusão física
 * - Apenas ADMINISTRADOR pode gerenciar usuários
 */

/* ====================== Autenticação ====================== */

export async function login(email: string, senha: string) {
  return autenticarUsuario(email, senha)
}

export async function refreshAccessToken(refreshToken: string) {
  const decoded = validarRefreshToken(refreshToken)
  if (!decoded) {
    return null
  }

  const usuario = await obterUsuarioPorId(decoded.userId)
  if (!usuario || !usuario.ativo) {
    return null
  }

  return gerarTokens({
    id: usuario.id,
    email: usuario.email,
    papel: usuario.papel,
  })
}

/* ====================== CRUD ====================== */

export async function listarUsuarios(apenasAtivos = true) {
  return db.usuario.findMany({
    where: apenasAtivos ? { ativo: true } : {},
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      ativo: true,
      criadoEm: true,
      atualizadoEm: true,
    },
    orderBy: { nome: "asc" },
  })
}

export async function obterUsuario(id: number) {
  return db.usuario.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      ativo: true,
      criadoEm: true,
    },
  })
}

export async function criarUsuario(data: {
  nome: string
  email: string
  senha: string
  papel?: Papel
}) {
  if (!data.nome || !data.nome.trim()) {
    throw new Error("Nome é obrigatório")
  }
  if (!data.email || !data.email.trim()) {
    throw new Error("Email é obrigatório")
  }
  if (!data.senha || data.senha.length < 6) {
    throw new Error("Senha deve ter pelo menos 6 caracteres")
  }

  // Verifica se email já existe
  const existente = await db.usuario.findUnique({ where: { email: data.email } })
  if (existente) {
    throw new Error("Email já cadastrado")
  }

  const bcrypt = await import("bcryptjs")
  const senhaHash = await bcrypt.hash(data.senha, 12)

  return db.usuario.create({
    data: {
      nome: data.nome.trim(),
      email: data.email.trim().toLowerCase(),
      senhaHash,
      papel: data.papel ?? Papel.OPERADOR,
      ativo: true,
    },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      ativo: true,
      criadoEm: true,
    },
  })
}

export async function atualizarUsuario(id: number, data: {
  nome?: string
  papel?: Papel
  ativo?: boolean
}) {
  const usuario = await db.usuario.findUnique({ where: { id } })
  if (!usuario) {
    throw new Error("Usuário não encontrado")
  }

  return db.usuario.update({
    where: { id },
    data: {
      ...(data.nome !== undefined && { nome: data.nome.trim() }),
      ...(data.papel !== undefined && { papel: data.papel }),
      ...(data.ativo !== undefined && { ativo: data.ativo }),
    },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      ativo: true,
      atualizadoEm: true,
    },
  })
}

export async function alterarSenha(id: number, senhaAtual: string, novaSenha: string) {
  const usuario = await db.usuario.findUnique({ where: { id } })
  if (!usuario) {
    return false
  }

  const bcrypt = await import("bcryptjs")
  const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash)
  if (!senhaValida) {
    return false
  }

  if (novaSenha.length < 6) {
    throw new Error("Nova senha deve ter pelo menos 6 caracteres")
  }

  const novaSenhaHash = await bcrypt.hash(novaSenha, 12)

  await db.usuario.update({
    where: { id },
    data: { senhaHash: novaSenhaHash },
  })

  return true
}

export async function desativarUsuario(id: number) {
  const usuario = await db.usuario.findUnique({ where: { id } })
  if (!usuario) {
    return false
  }

  await db.usuario.update({
    where: { id },
    data: { ativo: false },
  })

  return true
}

/* ====================== Permissões ====================== */

export async function ehAdministrador(id: number): Promise<boolean> {
  const usuario = await db.usuario.findUnique({
    where: { id },
    select: { papel: true },
  })
  return usuario?.papel === Papel.ADMINISTRADOR
}

export async function podeGerenciarUsuarios(id: number): Promise<boolean> {
  return ehAdministrador(id)
}

/**
 * Erro de entidade não encontrada do Prisma (útil para tratar 404 em controladores).
 */
export { PrismaClientKnownRequestError }
