"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DollarSign, CreditCard, RefreshCw } from "lucide-react"

export default function CaixaPage() {
  const router = useRouter()
  const [caixaAberto, setCaixaAberto] = useState<any>(null)
  const [valorInicial, setValorInicial] = useState("")
  const [sangriaValor, setSangriaValor] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "sucesso" as "sucesso" | "erro" })

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (!user) {
      router.push("/login")
      return
    }
    consultarCaixa()
  }, [])

  async function consultarCaixa() {
    try {
      const res = await fetch("/api/caixa/aberto", {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCaixaAberto(data.aberto ? data : null)
      }
    } catch (error) {
      console.error("Erro ao consultar caixa:", error)
  async function abrirCaixa() {
    const user = localStorage.getItem("user")
    const usuarioId = user ? JSON.parse(user).id : null
    const valor = parseFloat(valorInicial)

    if (!valor || valor < 0) {
      setMensagem({ texto: "Valor inicial inválido", tipo: "erro" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/caixa/abrir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ valorInicial: valor, usuarioId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMensagem({ texto: data.error || "Erro ao abrir caixa", tipo: "erro" })
        setLoading(false)
        return
      }

      const data = await res.json()
      setCaixaAberto(data)
      setValorInicial("")
      setMensagem({ texto: "Caixa aberto com sucesso!", tipo: "sucesso" })
    } catch {
      setMensagem({ texto: "Erro ao conectar com o servidor", tipo: "erro" })
    } finally {
      setLoading(false)
    }
  }

  async function registrarSangria() {
    if (!caixaAberto) {
      setMensagem({ texto: "Nenhum caixa aberto", tipo: "erro" })
      return
    }

    const valor = parseFloat(sangriaValor)
    if (!valor || valor <= 0) {
      setMensagem({ texto: "Valor da sangria inválido", tipo: "erro" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/caixa/sangria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ caixaId: caixaAberto.caixaId, valor }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMensagem({ texto: data.error || "Erro ao registrar sangria", tipo: "erro" })
        setLoading(false)
        return
      }

      setSangriaValor("")
      setMensagem({ texto: "Sangria registrada com sucesso!", tipo: "sucesso" })
      consultarCaixa()
    } catch {
      setMensagem({ texto: "Erro ao conectar com o servidor", tipo: "erro" })
    } finally {
  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground">Fluxo de Caixa</h1>
        <button
          onClick={() => router.push("/pdv")}
          className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
        >
          Voltar ao PDV
        </button>
      </div>

      {mensagem.texto && (
        <div className={`mb-6 p-4 rounded-md text-sm ${
          mensagem.tipo === "sucesso"
            ? "bg-green-50 text-green-700 border border-green-100"
            : "bg-red-50 text-red-700 border border-red-100"
        }`}>
          {mensagem.texto}
        </div>
      )}

      {!caixaAberto ? (
        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Abertura de Caixa</h2>
          <p className="text-muted-foreground mb-6">Informe o valor inicial do caixa para iniciar o turno.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Valor Inicial (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorInicial}
                onChange={(e) => setValorInicial(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={abrirCaixa}
              disabled={loading}
              className="w-full py-3 px-4 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Abrir Caixa
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Valor Inicial</h3>
            <p className="text-2xl font-bold text-foreground mt-1">R$ {caixaAberto.valorInicial?.toFixed(2) ?? "0,00"}</p>
          </div>
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Total Vendas</h3>
            <p className="text-2xl font-bold text-foreground mt-1">R$ {(caixaAberto.totalVendas ?? 0).toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg shadow-sm p-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">Sangria</h3>
            <p className="text-2xl font-bold text-foreground mt-1">R$ {caixaAberto.sangria?.toFixed(2) ?? "0,00"}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-6">Caixa Aberto</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operador:</span>
              <span className="font-medium">{caixaAberto.usuario?.nome ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abertura:</span>
              <span className="font-medium">{new Date(caixaAberto.abertura).toLocaleString("pt-BR")}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={registrarSangria}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Registrar Sangria
            </button>
            <button
              onClick={fecharCaixa}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
            >
              Fechar Caixa
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-1">Valor da Sangria (R$)</label>
            <input
              type="number"
              step="0.01"
              value={sangriaValor}
              onChange={(e) => setSangriaValor(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  )
}

      setLoading(false)
    }
  }

  async function fecharCaixa() {
    if (!caixaAberto) {
      setMensagem({ texto: "Nenhum caixa aberto", tipo: "erro" })
      return
    }

    if (!confirm("Tem certeza que deseja fechar o caixa?")) return

    setLoading(true)
    try {
      const res = await fetch("/api/caixa/fechar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ caixaId: caixaAberto.caixaId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setMensagem({ texto: data.error || "Erro ao fechar caixa", tipo: "erro" })
        setLoading(false)
        return
      }

      setCaixaAberto(null)
      setMensagem({ texto: "Caixa fechado com sucesso!", tipo: "sucesso" })
    } catch {
      setMensagem({ texto: "Erro ao conectar com o servidor", tipo: "erro" })
    } finally {
      setLoading(false)
    }
  }

    }
  }
