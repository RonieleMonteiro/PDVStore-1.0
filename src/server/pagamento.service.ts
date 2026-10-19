import db from "@/lib/db"

/**
 * PagamentoService — Estrutura de processamento de pagamentos.
 *
 * No PDVStore original, PagamentoIntegrator é um MOCK que sempre aprova.
 * Aqui deixamos a estrutura pronta para substituição por gateway real
 * (PagSeguro, Mercado Pago, Stripe, Cielo, etc.) sem alterar o fluxo de venda.
 */

/* ====================== Tipos ====================== */

export type FormaPagamento =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "FIADO"

export interface PagamentoResultado {
  aprovado: boolean
  transacaoId?: string
  mensagem?: string
}

/* ====================== Processamento ====================== */

/**
 * Processa um pagamento. No momento é um MOCK (sempre aprova),
 * compatível com o comportamento original do PDVStore.
 *
 * Para produção, substituir por chamada real ao gateway de pagamento.
 */
export async function processarPagamento(
  valor: number,
  formaPagamento: FormaPagamento
): Promise<PagamentoResultado> {
  // Simula latência de chamada bancária (opcional, remover em produção)
  // await new Promise(resolve => setTimeout(resolve, 200))

  if (valor < 0) {
    return { aprovado: false, mensagem: "Valor inválido" }
  }

  let transacaoId: string | undefined

  if (formaPagamento === "PIX") {
    transacaoId = crypto.randomUUID().replace(/-/g, "").toUpperCase()
  }

  // Aqui entraria a integração real com o gateway
  // Exemplo: pagseguro.processar({ valor, formaPagamento })

  return {
    aprovado: true,
    transacaoId,
    mensagem: "Pagamento aprovado",
  }
}

/* ====================== Conciliação ====================== */

/**
 * Registra a conciliação do pagamento na conta bancária da loja.
 * No PDVStore original, isso é feito por IntegrarContaBancaria (mock).
 */
export async function conciliarPagamento(
  vendaId: number,
  valor: number,
  formaPagamento: FormaPagamento
) {
  // Estrutura pronta para salvar em tabela de conciliação financeira
  // Por enquanto, apenas retorna sucesso (mock)
  return {
    vendaId,
    valor,
    formaPagamento,
    conciliado: true,
    data: new Date(),
  }
}
