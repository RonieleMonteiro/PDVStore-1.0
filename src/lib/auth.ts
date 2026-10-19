import { sign, verify, type SignOptions, type VerifyOptions } from "jsonwebtoken"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import db from "./db"

/**
 * Configuração de JWT para autenticação stateless do PDV Web.
 *
 * - Access token: curto prazo (15 min por padrão), carrega id e papel do usuário.
 * - Refresh token: longo prazo (7 dias por padrão), usado para renovar o access token.
 */
const JWT_SECRET = process.env.JWT_SECRET
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET não definida no ambiente. Veja .env.example")
}
if (!JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET não definida no ambiente. Veja .env.example")
}

export type JwtPayload = {
  userId: number
  email: string
  papel: string
}

export type TokenPair = {
  accessToken: string
  refreshToken: string
  accessExpiresIn: string
  refreshExpiresIn: string
}

/**
 * Gera um par de tokens (access + refresh) para um usuário autenticado.
 */
export function gerarTokens(usuario: {
  id: number
  email: string
  papel: string
}): TokenPair {
  const payload: JwtPayload = {
    userId: usuario.id,
    email: usuario.email,
    papel: usuario.papel,
  }

  const accessOptions: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN as string) || "15m",
  }

  const refreshOptions: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN as string) || "7d",
  }

  const accessToken = sign(payload, JWT_SECRET, accessOptions)
  const refreshToken = sign({ userId: usuario.id }, JWT_REFRESH_SECRET, refreshOptions)

  return {
    accessToken,
    refreshToken,
    accessExpiresIn: accessOptions.expiresIn as string,
    refreshExpiresIn: refreshOptions.expiresIn as string,
  }
}

/**
 * Valida e decodifica um access token JWT.
 * Retorna null se o token for inválido ou expirado.
 */
export function validarAccessToken(token: string): JwtPayload | null {
  try {
    return verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Valida e decodifica um refresh token JWT.
 * Retorna apenas o userId se válido.
 */
export function validarRefreshToken(token: string): { userId: number } | null {
  try {
    const decoded = verify(token, JWT_REFRESH_SECRET) as { userId: number }
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

/**
 * Autentica um usuário por email + senha.
 * Compara a senha informada com o hash BCrypt armazenado.
 * Retorna o usuário (sem senha) + tokens, ou null se falhar.
 *
 * Nunca revela se o email existe ou se a senha está incorreta (boa prática de segurança).
 */
export async function autenticarUsuario(email: string, senha: string) {
  const usuario = await db.usuario.findUnique({
    where: { email },
    select: {
      id: true,
      nome: true,
      email: true,
      senhaHash: true,
      papel: true,
      ativo: true,
    },
  })

  if (!usuario || !usuario.ativo) {
    return null
  }

  const bcrypt = await import("bcryptjs")
  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash)
  if (!senhaValida) {
    return null
  }

  const { senhaHash: _, ...usuarioSemSenha } = usuario
  const tokens = gerarTokens({
    id: usuario.id,
    email: usuario.email,
    papel: usuario.papel,
  })

  return { usuario: usuarioSemSenha, tokens }
}

/**
 * Busca um usuário pelo ID, retornando apenas dados públicos (sem senha).
 */
export async function obterUsuarioPorId(userId: number) {
  return db.usuario.findUnique({
    where: { id: userId },
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

/**
 * Middleware helper: verifica se o usuário possui o papel exigido.
 * Retorna true se o papel do usuário estiver na lista de papeis permitidos.
 */
export function temPapel(papelUsuario: string, papeisPermitidos: string[]): boolean {
  return papeisPermitidos.includes(papelUsuario)
}

/**
 * Erro de entidade não encontrada do Prisma (útil para tratar 404 em serviços).
 */
export { PrismaClientKnownRequestError }
