import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const mockProduto = {
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const mockMovimentacao = { create: vi.fn() }
  return {
    default: {
      produto: mockProduto,
      movimentacaoEstoque: mockMovimentacao,
      $transaction: vi.fn(async (ops: any[]) => {
        // Executa cada operação do array (formato Prisma $transaction([ops]))
        const results = []
        for (const op of ops) {
          if (op.update) {
            const { where, data } = op.update
            results.push(await mockProduto.update({ where, data }))
          } else if (op.create) {
            results.push(await mockMovimentacao.create({ data: op.create.data }))
          }
        }
        return results
      }),
    },
    __esModule: true,
  }
})

import { baixarEstoque, adicionarEstoque } from "@/server/estoque.service"
import db from "@/lib/db"

const mockProduto = db.produto as any
const mockMovimentacao = db.movimentacaoEstoque as any

describe("EstoqueService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("baixarEstoque", () => {
    it("deve lançar erro se quantidade <= 0", async () => {
      await expect(
        baixarEstoque(1, 0, "teste")
      ).rejects.toThrow("Quantidade deve ser maior que zero")
    })

    it("deve retornar false se produto não existir", async () => {
      vi.mocked(mockProduto.findUnique).mockResolvedValue(null)

      const resultado = await baixarEstoque(999, 5, "teste")
      expect(resultado).toBe(false)
    })

    it("deve lançar erro se estoque insuficiente", async () => {
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto", estoque: 3, ativo: true,
      })

      await expect(
        baixarEstoque(1, 10, "venda")
      ).rejects.toThrow("Estoque insuficiente")
    })

    it("deve baixar estoque e registrar movimentação", async () => {
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto", estoque: 10, ativo: true,
      })
      vi.mocked(mockProduto.update).mockResolvedValue({ id: 1 })
      vi.mocked(mockMovimentacao.create).mockResolvedValue({ id: 1 })

      const resultado = await baixarEstoque(1, 4, "Venda #10", 1, 10)

      expect(mockProduto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estoque: { decrement: 4 } },
      })
      expect(mockMovimentacao.create).toHaveBeenCalledWith({
        data: {
          produtoId: 1,
          tipo: "SAIDA",
          quantidade: 4,
          usuarioId: 1,
          motivo: "Venda #10",
          referenciaVendaId: 10,
        },
      })
      expect(resultado).toBe(true)
    })
  })

  describe("adicionarEstoque", () => {
    it("deve lançar erro se quantidade <= 0", async () => {
      await expect(
        adicionarEstoque(1, 0, "entrada")
      ).rejects.toThrow("Quantidade deve ser maior que zero")
    })

    it("deve retornar false se produto não existir", async () => {
      vi.mocked(mockProduto.findUnique).mockResolvedValue(null)

      const resultado = await adicionarEstoque(999, 5, "entrada")
      expect(resultado).toBe(false)
    })

    it("deve adicionar estoque e registrar movimentação", async () => {
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto", estoque: 10, ativo: true,
      })
      vi.mocked(mockProduto.update).mockResolvedValue({ id: 1 })
      vi.mocked(mockMovimentacao.create).mockResolvedValue({ id: 1 })

      const resultado = await adicionarEstoque(1, 20, "Compra #5", 1)

      expect(mockProduto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estoque: { increment: 20 } },
      })
      expect(mockMovimentacao.create).toHaveBeenCalledWith({
        data: {
          produtoId: 1,
          tipo: "ENTRADA",
          quantidade: 20,
          usuarioId: 1,
          motivo: "Compra #5",
        },
      })
      expect(resultado).toBe(true)
    })
  })
})
