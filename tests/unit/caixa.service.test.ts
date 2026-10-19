import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => {
  const mockCaixa = {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  }
  const mockVenda = {
    aggregate: vi.fn(),
  }
  return {
    default: {
      caixa: mockCaixa,
      venda: mockVenda,
      $transaction: vi.fn(async (cb: any) => cb(mockCaixa)),
    },
    __esModule: true,
  }
})

import { abrirCaixa, obterCaixaAberto, fecharCaixa, registrarSangria } from "@/server/caixa.service"
import db from "@/lib/db"

const mockCaixa = db.caixa as any
const mockVenda = db.venda as any

describe("CaixaService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("abrirCaixa", () => {
    it("deve lançar erro se já houver caixa aberto", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue({ id: 1, status: "ABERTO" })

      await expect(
        abrirCaixa(100, 1)
      ).rejects.toThrow("Já existe um caixa aberto")
    })

    it("deve lançar erro se valor inicial for negativo", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue(null)

      await expect(
        abrirCaixa(-10, 1)
      ).rejects.toThrow("Valor inicial não pode ser negativo")
    })

    it("deve abrir caixa com sucesso", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue(null)
      vi.mocked(mockCaixa.create).mockResolvedValue({
        id: 1, usuarioId: 1, valorInicial: 100, status: "ABERTO",
      })

      const resultado = await abrirCaixa(100, 1)

      expect(mockCaixa.create).toHaveBeenCalledWith({
        data: { usuarioId: 1, valorInicial: 100, status: "ABERTO" },
        include: expect.any(Object),
      })
      expect(resultado.valorInicial).toBe(100)
    })
  })

  describe("obterCaixaAberto", () => {
    it("deve retornar null se não houver caixa aberto", async () => {
      vi.mocked(mockCaixa.findFirst).mockResolvedValue(null)

      const resultado = await obterCaixaAberto()
      expect(resultado).toBeNull()
    })

    it("deve retornar o caixa aberto", async () => {
      const caixaAberto = { id: 1, status: "ABERTO" }
      vi.mocked(mockCaixa.findFirst).mockResolvedValue(caixaAberto)

      const resultado = await obterCaixaAberto()
      expect(resultado).toEqual(caixaAberto)
    })
  })

  describe("fecharCaixa", () => {
    it("deve retornar false se caixa não existir ou não estiver aberto", async () => {
      vi.mocked(mockCaixa.findUnique).mockResolvedValue(null)

      const resultado = await fecharCaixa(999)
      expect(resultado).toBe(false)
    })

    it("deve calcular valor final corretamente", async () => {
      vi.mocked(mockCaixa.findUnique).mockResolvedValue({
        id: 1, status: "ABERTO", valorInicial: 100, sangria: 20,
      })
      vi.mocked(mockVenda.aggregate).mockResolvedValue({
        _sum: { valorTotal: 500 },
      })
      vi.mocked(mockCaixa.update).mockResolvedValue({ id: 1, status: "FECHADO", valorFinal: 580 })

      const resultado = await fecharCaixa(1)

      expect(mockCaixa.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          valorFinal: 580,
          fechamento: expect.any(Date),
          status: "FECHADO",
        },
        include: expect.any(Object),
      })
      expect(resultado.valorFinal).toBe(580)
    })
  })

  describe("registrarSangria", () => {
    it("deve lançar erro se valor <= 0", async () => {
      await expect(
        registrarSangria(1, 0)
      ).rejects.toThrow("Valor da sangria deve ser maior que zero")
    })

    it("deve retornar false se caixa não estiver aberto", async () => {
      vi.mocked(mockCaixa.findUnique).mockResolvedValue({
        id: 1, status: "FECHADO",
      })

      const resultado = await registrarSangria(1, 50)
      expect(resultado).toBe(false)
    })

    it("deve acumular sangria", async () => {
      vi.mocked(mockCaixa.findUnique).mockResolvedValue({
        id: 1, status: "ABERTO", sangria: 30, valorInicial: 100, valorFinal: null,
      })
      vi.mocked(mockCaixa.update).mockResolvedValue({ id: 1 })

      const resultado = await registrarSangria(1, 20)

      expect(mockCaixa.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          sangria: { increment: 20 },
          valorFinal: 100,
        },
      })
      expect(resultado).toBe(true)
    })
  })
})
