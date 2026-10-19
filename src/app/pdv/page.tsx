"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Barcode,
  ShoppingCart,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Keyboard,
  Menu,
  X,
} from "lucide-react"

interface Produto {
  id: number
  nome: string
  codigoBarras: string | null
  preco: number
  estoque: number
}

interface ItemCarrinho {
  produtoId: number
  nome: string
  quantidade: number
  precoUnitario: number
  subtotal: number
}

export default function PDVPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [busca, setBusca] = useState("")
  const [resultadosBusca, setResultadosBusca] = useState<Produto[]>([])
  const [formaPagamento, setFormaPagamento] = useState<"DINHEIRO" | "PIX" | "CARTAO_CREDITO" | "CARTAO_DEBITO" | "FIADO">("DINHEIRO")
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [desconto, setDesconto] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "sucesso" as "sucesso" | "erro" })

  async function carregarProdutos() {
    try {
      const res = await fetch("/api/produtos?ativos=true", {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        setProdutos(data)
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error)
    }
  }

  async function buscarProduto() {
    if (!busca.trim()) {
      setResultadosBusca([])
      return
    }

    try {
      const res = await fetch(`/api/produtos/busca?q=${encodeURIComponent(busca)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      })
      if (res.ok) {
        const data = await res.json()
        setResultadosBusca(data)
      }
    } catch (error) {
      console.error("Erro na busca:", error)
    }
  }

  useEffect(() => {
    const user = localStorage.getItem("user")
    if (user) {
      setUsuario(JSON.parse(user))
    }
  function adicionarAoCarrinho(produto: Produto) {
    const existente = carrinho.find((i) => i.produtoId === produto.id)
    if (existente) {
      if (existente.quantidade >= produto.estoque) {
        setMensagem({ texto: "Estoque insuficiente", tipo: "erro" })
        return
      }
      setCarrinho(
        carrinho.map((i) =>
          i.produtoId === produto.id
            ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.precoUnitario }
            : i
        )
      )
    } else {
      setCarrinho([
        ...carrinho,
        {
          produtoId: produto.id,
          nome: produto.nome,
          quantidade: 1,
          precoUnitario: produto.preco,
          subtotal: produto.preco,
        },
      ])
    }
    setBusca("")
    setResultadosBusca([])
    setMensagem({ texto: `${produto.nome} adicionado`, tipo: "sucesso" })
  }

  function removerDoCarrinho(produtoId: number) {
    setCarrinho(carrinho.filter((i) => i.produtoId !== produtoId))
  }

  function alterarQuantidade(produtoId: number, delta: number) {
    const item = carrinho.find((i) => i.produtoId === produtoId)
    if (!item) return

    const produto = produtos.find((p) => p.id === produtoId)
    const novaQtd = item.quantidade + delta

    if (novaQtd <= 0) {
      removerDoCarrinho(produtoId)
      return
    }

    if (produto && novaQtd > produto.estoque) {
      setMensagem({ texto: "Estoque insuficiente", tipo: "erro" })
      return
    }

    setCarrinho(
      carrinho.map((i) =>
        i.produtoId === produtoId
          ? { ...i, quantidade: novaQtd, subtotal: novaQtd * i.precoUnitario }
          : i
      )
    )
  }

  const subtotal = carrinho.reduce((sum, i) => sum + i.subtotal, 0)
  const total = Math.max(0, subtotal - desconto)

  async function finalizarVenda() {
    if (carrinho.length === 0) {
      setMensagem({ texto: "Carrinho vazio", tipo: "erro" })
      return
    }

    const user = localStorage.getItem("user")
    const usuarioId = user ? JSON.parse(user).id : null

    setLoading(true)

    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          usuarioId,
          formaPagamento,
          desconto,
          clienteId,
          itens: carrinho.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
  const atalhos = [
    { tecla: "F1", ação: "Código de barras" },
    { tecla: "F2", ação: "Dinheiro" },
    { tecla: "F3", ação: "PIX" },
    { tecla: "F4", ação: "Cartão Crédito" },
    { tecla: "F5", ação: "Finalizar venda" },
    { tecla: "Esc", ação: "Limpar carrinho" },
  ]

  if (!usuario) {
    router.push("/login")
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex w-64 bg-secondary flex-col border-r border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">PDV</h2>
          <p className="text-sm text-muted-foreground">Operador: {usuario.nome}</p>
          <p className="text-xs text-muted-foreground mt-1">{usuario.papel}</p>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Atalhos de teclado</h3>
          <div className="space-y-2">
            {atalhos.map((a) => (
              <div key={a.tecla} className="flex items-center justify-between text-sm">
                <span className="font-mono bg-muted px-2 py-1 rounded text-primary font-bold">{a.tecla}</span>
                <span className="text-muted-foreground">{a.ação}</span>
              </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 border-b border-border bg-background flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Carrinho de Vendas</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Forma: {formaPagamento}</span>
          </div>
        </div>

        <div className="flex-1 flex p-6 gap-6 overflow-hidden">
          <div className="w-96 flex flex-col gap-4">
            <div className="relative">
              <Barcode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                id="input-codigo-barras"
                type="text"
                placeholder="Digite código de barras ou nome..."
                autoFocus
                className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  buscarProduto()
                }}
              />
            </div>

            {resultadosBusca.length > 0 && (
              <div className="bg-card border border-border rounded-md shadow-sm max-h-64 overflow-y-auto">
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">Resultados</h3>
                <ul>
                  {resultadosBusca.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => adicionarAoCarrinho(p)}
                      className="px-3 py-2 cursor-pointer hover:bg-accent transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex justify-between">
                        <span className="text-sm text-foreground">{p.nome}</span>
                        <span className="text-xs text-muted-foreground">R$ {p.preco.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{p.codigoBarras}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground">Pressione F1 para focar neste campo</div>
          </div>

          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="flex-1 overflow-y-auto border border-border rounded-md bg-card">
              {carrinho.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 opacity-50 mb-2" />
                  <p>Carrinho vazio</p>
                  <p className="text-xs">Use F1 para buscar produtos</p>
                </div>
              ) : (
                <div className="p-4">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="pb-2">Produto</th>
                        <th className="pb-2 text-right">Preço</th>
                        <th className="pb-2 text-center">Qtd</th>
                        <th className="pb-2 text-right">Subtotal</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrinho.map((item) => (
                        <tr key={item.produtoId} className="border-b border-border/50">
                          <td className="py-3 text-foreground">{item.nome}</td>
                          <td className="py-3 text-right text-foreground">R$ {item.precoUnitario.toFixed(2)}</td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => alterarQuantidade(item.produtoId, -1)} className="p-1 hover:bg-accent rounded">−</button>
                              <span className="w-4 text-center">{item.quantidade}</span>
                              <button onClick={() => alterarQuantidade(item.produtoId, 1)} className="p-1 hover:bg-accent rounded">+</button>
                            </div>
                          </td>
                          <td className="py-3 text-right text-foreground">R$ {item.subtotal.toFixed(2)}</td>
                          <td className="py-3">
                            <button onClick={() => removerDoCarrinho(item.produtoId)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                              <X className="h-4 w-4" />
                            </button>
            <div className="bg-card border border-border rounded-md shadow-sm p-6">
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Desconto (R$)</label>
                  <input
                    type="number"
                    value={desconto}
                    onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-input rounded-md text-sm"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-border pt-4">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Forma de pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "FIADO"].map((fp) => (
                      <button
                        key={fp}
                        onClick={() => setFormaPagamento(fp as any)}
                        className={`px-3 py-2 rounded-md text-sm border text-center ${formaPagamento === fp ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"}`}
                      >
                        {fp}
                      </button>
                    ))}
                  </div>
                </div>

                {formaPagamento === "FIADO" && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">ID do Cliente (fiado)</label>
                    <input
                      type="number"
                      value={clienteId || ""}
                      onChange={(e) => setClienteId(parseInt(e.target.value) || null)}
                      className="w-full px-2 py-1 border border-input rounded-md text-sm"
                    />
                  </div>
                )}

                {mensagem.texto && (
                  <div className={`p-3 rounded-md text-sm ${mensagem.tipo === "sucesso" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                    {mensagem.texto}
                  </div>
                )}

                <button
                  onClick={finalizarVenda}
                  disabled={loading || carrinho.length === 0}
                  className="w-full py-3 px-4 rounded-md bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/80 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Finalizar Venda (F5)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            ))}
          </div>
        </div>
        <div className="p-4 border-t border-border">
          <button
            onClick={() => {
              localStorage.removeItem("access_token")
              localStorage.removeItem("refresh_token")
              localStorage.removeItem("user")
              router.push("/login")
            }}
            className="w-full text-sm text-destructive hover:bg-destructive/10 rounded px-3 py-2"
          >
            Sair
          </button>
        </div>
      </div>

            precoUnitario: i.precoUnitario,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMensagem({ texto: data.error || "Erro ao finalizar venda", tipo: "erro" })
        setLoading(false)
        return
      }

      setMensagem({ texto: `Venda #${data.id} finalizada com sucesso!`, tipo: "sucesso" })
      limparCarrinho()
    } catch {
      setMensagem({ texto: "Erro ao conectar com o servidor", tipo: "erro" })
    } finally {
      setLoading(false)
    }
  }

  function limparCarrinho() {
    setCarrinho([])
    setDesconto(0)
    setClienteId(null)
    setMensagem({ texto: "", tipo: "sucesso" })
  }

    carregarProdutos()

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault()
        document.getElementById("input-codigo-barras")?.focus()
      }
      if (e.key === "F2") setFormaPagamento("DINHEIRO")
      if (e.key === "F3") setFormaPagamento("PIX")
      if (e.key === "F4") setFormaPagamento("CARTAO_CREDITO")
      if (e.key === "F5") finalizarVenda()
      if (e.key === "Escape") limparCarrinho()
    }

    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [])
