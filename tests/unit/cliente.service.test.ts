import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const mockCliente = {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  }
  return {
    default: {
      cliente: mockCliente,
    },
    __esModule: true,
  }
})

import { receberFiado, salvarCliente, atualizarStatus } from "@/server/cliente.service"
import db from "@/lib/db"

const mockCliente = db.cliente as any

describe("ClienteService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("salvarCliente", () => {
    it("deve lançar erro se nome estiver vazio", async () => {
      await expect(
        salvarCliente({ nome: "" })
      ).rejects.toThrow("Nome do cliente é obrigatório")
    })

    it("deve criar cliente com saldo devedor 0", async () => {
      vi.mocked(mockCliente.create).mockResolvedValue({
        id: 1, nome: "João", saldoDevedor: 0, ativo: true,
      })

      const resultado = await salvarCliente({
        nome: "João Silva",
        cpfCnpj: "123.456.789-00",
        limiteCredito: 200,
      })

      expect(mockCliente.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          nome: "João Silva",
          saldoDevedor: 0,
          limiteCredito: 200,
          ativo: true,
        }),
      })
      expect(resultado.saldoDevedor).toBe(0)
    })
  })

  describe("receberFiado", () => {
    it("deve lançar erro se valor <= 0", async () => {
      await expect(
        receberFiado(1, 0)
      ).rejects.toThrow("Valor deve ser maior que zero")
    })

    it("deve retornar false se cliente não existir", async () => {
      vi.mocked(mockCliente.findUnique).mockResolvedValue(null)

      const resultado = await receberFiado(999, 50)
      expect(resultado).toBe(false)
    })

    it("deve reduzir saldo devedor com proteção contra negativo", async () => {
      vi.mocked(mockCliente.findUnique).mockResolvedValue({
        id: 1, nome: "João", saldoDevedor: 30, limiteCredito: 200,
      })
      vi.mocked(mockCliente.update).mockResolvedValue({ id: 1 })

      await receberFiado(1, 50)

      expect(mockCliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          saldoDevedor: Math.max(0, 30 - 50),
        },
      })
    })

    it("deve reduzir saldo devedor normalmente", async () => {
      vi.mocked(mockCliente.findUnique).mockResolvedValue({
        id: 1, nome: "João", saldoDevedor: 100, limiteCredito: 200,
      })
      vi.mocked(mockCliente.update).mockResolvedValue({ id: 1 })

      const resultado = await receberFiado(1, 40)

      expect(mockCliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          saldoDevedor: Math.max(0, 100 - 40),
        },
      })
      expect(resultado).toBe(true)
    })
  })

  describe("atualizarStatus", () => {
    it("deve retornar false se cliente não existir", async () => {
      vi.mocked(mockCliente.findUnique).mockResolvedValue(null)

      const resultado = await atualizarStatus(999, false)
      expect(resultado).toBe(false)
    })

    it("deve atualizar status do cliente", async () => {
      vi.mocked(mockCliente.findUnique).mockResolvedValue({ id: 1, ativo: true })
      vi.mocked(mockCliente.update).mockResolvedValue({ id: 1, ativo: false })

      const resultado = await atualizarStatus(1, false)

      expect(mockCliente.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ativo: false },
      })
      expect(resultado).toBe(true)
    })
  })
})
