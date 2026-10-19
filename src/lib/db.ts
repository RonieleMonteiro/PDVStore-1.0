import { PrismaClient } from "@prisma/client"

/**
 * Prisma Client singleton.
 *
 * Em desenvolvimento com Next.js (dev), o hot reload pode reiniciar o servidor
 * múltiplas vezes, criando várias instâncias do Prisma Client e esgotando o
 * pool de conexões do banco. Este padrão garante uma única instância por processo.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const db =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV === "development") {
  global.prisma = db
}

export default db
