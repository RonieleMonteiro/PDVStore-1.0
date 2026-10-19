import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const mockVenda = {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const mockItemVenda = { create: vi.fn() }
  const mockProduto = {
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const mockCaixa = { findFirst: vi.fn() }
  const mockCliente = { findUnique: vi.fn(), update: vi.fn() }
  const mockMovimentacao = { create: vi.fn() }
  return {
    default: {
      $transaction: vi.fn(async (cb: any) => cb({
        venda: mockVenda,
        itemVenda: mockItemVenda,
        produto: mockProduto,
        cliente: mockCliente,
        movimentacaoEstoque: mockMovimentacao,
      })),
      venda: mockVenda,
      itemVenda: mockItemVenda,
      produto: mockProduto,
      caixa: mockCaixa,
      cliente: mockCliente,
      movimentacaoEstoque: mockMovimentacao,
    },
    __esModule: true,
  }
})

import { registrarVenda, cancelarVenda } from "@/server/venda.service"
import db from "@/lib/db"

const mockVenda = db.venda as any
const mockItemVenda = db.itemVenda as any
const mockProduto = db.produto as any
const mockCaixa = db.caixa as any
const mockCliente = db.cliente as any
const mockMovimentacao = db.movimentacaoEstoque as any

describe("VendaService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("registrarVenda", () => {
    const usuarioId = 1
    const formaPagamento = "DINHEIRO"
    const itens = [
      { produtoId: 1, quantidade: 2, precoUnitario: 10.0 },
    ]

    it("deve lançar erro se não houver itens", async () => {
      await expect(
        registrarVenda({ usuarioId, formaPagamento, itens: [] })
      ).rejects.toThrow("A venda deve conter pelo menos um item")
    })

    it("deve lançar erro se não houver forma de pagamento", async () => {
      await expect(
        registrarVenda({ usuarioId, formaPagamento: "", itens })
      ).rejects.toThrow("Selecione uma forma de pagamento")
    })

    it("deve lançar erro se não houver caixa aberto", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue(null)

      await expect(
        registrarVenda({ usuarioId, formaPagamento, itens })
      ).rejects.toThrow("Nenhum caixa aberto")
    })

    it("deve lançar erro se estoque insuficiente", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue({ id: 1, status: "ABERTO" })
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto Teste", estoque: 1, ativo: true,
      })

      await expect(
        registrarVenda({ usuarioId, formaPagamento, itens: [{ produtoId: 1, quantidade: 10, precoUnitario: 10.0 }] })
      ).rejects.toThrow("Estoque insuficiente")
    })

    it("deve registrar venda com sucesso", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue({ id: 1, status: "ABERTO" })
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto Teste", estoque: 10, ativo: true,
      })
      vi.mocked(mockVenda.create).mockResolvedValue({
        id: 100, usuarioId, caixaId: 1, valorTotal: 20, desconto: 0, formaPagamento, status: "CONCLUIDA",
      })

      const resultado = await registrarVenda({ usuarioId, formaPagamento, itens })

      expect(mockVenda.create).toHaveBeenCalledTimes(1)
      expect(mockProduto.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estoque: { decrement: 2 } },
      })
      expect(mockMovimentacao.create).toHaveBeenCalledWith({
        data: {
          produtoId: 1,
          tipo: "SAIDA",
          quantidade: 2,
          precoUnitario: 10,
          usuarioId,
          motivo: "Venda #100",
          referenciaVendaId: 100,
        },
      })
      expect(resultado.id).toBe(100)
    })

    it("deve respeitar limite de crédito em venda fiada", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue({ id: 1, status: "ABERTO" })
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto Teste", estoque: 10, ativo: true,
      })
      vi.mocked(mockCliente.findUnique).mockResolvedValue({
        id: 5, ativo: true, saldoDevedor: 150, limiteCredito: 200,
      })
      vi.mocked(mockVenda.create).mockResolvedValue({ id: 101 })

      await registrarVenda({
        usuarioId, formaPagamento: "FIADO", clienteId: 5, itens,
      })

      expect(mockCliente.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { saldoDevedor: { increment: 20 } },
      })
    })

    it("deve rejeitar venda fiada acima do limite de crédito", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue({ id: 1, status: "ABERTO" })
      vi.mocked(mockProduto.findUnique).mockResolvedValue({
        id: 1, nome: "Produto Teste", estoque: 10, ativo: true,
      })
      vi.mocked(mockCliente.findUnique).mockResolvedValue({
        id: 5, ativo: true, saldoDevedor: 190, limiteCredito: 200,
      })

      await expect(
        registrarVenda({ usuarioId, formaPagamento: "FIADO", clienteId: 5, itens })
      ).rejects.toThrow("Limite de crédito do cliente excedido")
    })
  })

  describe("cancelarVenda", () => {
    it("deve ser uma função que retorna Promise<boolean>", async () => {
      vi.mocked(mockVenda.findUnique).mockResolvedValue(null)

      expect(typeof cancelarVenda).toBe("function")
      const resultado = await cancelarVenda(999, "teste")
      expect(resultado).toBe(false)
    })
  })
})
