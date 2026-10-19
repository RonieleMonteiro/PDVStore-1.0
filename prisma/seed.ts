import { PrismaClient, Papel } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...")

  /* =========================================================================
   1. USUÁRIOS
   ========================================================================= */
  const senhaAdmin = await bcrypt.hash("admin123", 12)
  const senhaOperador = await bcrypt.hash("caixa123", 12)
  const senhaEstoquista = await bcrypt.hash("estoque123", 12)

  const admin = await db.usuario.upsert({
    where: { email: "admin@pdv.com" },
    update: {},
    create: {
      nome: "Administrador",
      email: "admin@pdv.com",
      senhaHash: senhaAdmin,
      papel: Papel.ADMINISTRADOR,
      ativo: true,
    },
  })

  const operador = await db.usuario.upsert({
    where: { email: "caixa@pdv.com" },
    update: {},
    create: {
      nome: "Operador Caixa",
      email: "caixa@pdv.com",
      senhaHash: senhaOperador,
      papel: Papel.OPERADOR,
      ativo: true,
    },
  })

  const estoquista = await db.usuario.upsert({
    where: { email: "estoque@pdv.com" },
  console.log(`👥 Usuários criados: Admin (${admin.email}), Operador (${operador.email}), Estoquista (${estoquista.email})`)

  /* =========================================================================
   2. FORNECEDORES
   ========================================================================= */
  const fornecedor1 = await db.fornecedor.upsert({
    where: { cnpj: "11.222.333/0001-44" },
    update: {},
    create: {
      nome: "Distribuidora Alimentos LTDA",
      cnpj: "11.222.333/0001-44",
      telefone: "(11) 3333-4444",
      email: "vendas@distribuidora.com.br",
      ativo: true,
    },
  })

  const fornecedor2 = await db.fornecedor.upsert({
    where: { cnpj: "55.666.777/0001-88" },
    update: {},
    create: {
      nome: "Bebidas São Paulo",
      cnpj: "55.666.777/0001-88",
      telefone: "(11) 5555-6666",
      email: "contato@bebidassp.com.br",
      ativo: true,
    },
  })
  console.log(`🏭 Fornecedores criados: ${fornecedor1.nome}, ${fornecedor2.nome}`)

  /* =========================================================================
   3. PRODUTOS
   ========================================================================= */
  const produtos = [
    {
      nome: "Refrigerante Cola 2L",
      codigoBarras: "7891234567890",
      preco: 8.99,
      precoCusto: 5.50,
      estoque: 50,
      estoqueMinimo: 10,
      categoria: "Bebidas",
      descricao: "Refrigerante de cola garrafa 2 litros",
      ativo: true,
    },
    {
      nome: "Água Mineral 500ml",
      codigoBarras: "7891234567891",
      preco: 2.50,
      precoCusto: 1.20,
      estoque: 100,
      estoqueMinimo: 20,
      categoria: "Bebidas",
      descricao: "Água mineral sem gás 500ml",
      ativo: true,
    },
    {
      nome: "Cerveja Pilsen 600ml",
      codigoBarras: "7891234567892",
      preco: 4.99,
      precoCusto: 3.00,
      estoque: 60,
      estoqueMinimo: 15,
      categoria: "Bebidas",
      descricao: "Cerveja pilsen garrafa 600ml",
      ativo: true,
    },
    {
      nome: "Arroz Tipo 1 5kg",
      codigoBarras: "7891234567893",
      preco: 22.90,
      precoCusto: 16.50,
      estoque: 30,
      estoqueMinimo: 5,
      categoria: "Mercearia",
      descricao: "Arroz tipo 1 embalagem 5kg",
      ativo: true,
    },
    {
      nome: "Feijão Carioca 1kg",
      codigoBarras: "7891234567894",
      preco: 7.50,
      precoCusto: 5.00,
  console.log(`📦 Produtos criados: ${produtos.length}`)

  /* =========================================================================
   4. CLIENTES
   ========================================================================= */
  const clienteFiado = await db.cliente.upsert({
    where: { cpfCnpj: "123.456.789-00" },
    update: {},
    create: {
      nome: "João Silva Santos",
      cpfCnpj: "123.456.789-00",
      telefone: "(11) 99999-1111",
      email: "joao@email.com",
      endereco: "Rua das Flores, 123 - Centro",
      limiteCredito: 200.0,
      saldoDevedor: 0,
      ativo: true,
    },
  })

  console.log(`👤 Cliente fiado criado: ${clienteFiado.nome} (Limite: R$ ${clienteFiado.limiteCredito})`)

  /* =========================================================================
   5. CAIXA FECHADO INICIAL (para vendas legadas, se necessário)
   ========================================================================= */
  await db.caixa.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      usuarioId: admin.id,
      abertura: new Date("2026-01-01T00:00:00Z"),
      fechamento: new Date("2026-01-01T23:59:59Z"),
      valorInicial: 0,
      valorFinal: 0,
      sangria: 0,
      status: "FECHADO",
    },
  })

  console.log("🏦 Caixa inicial fechado criado (ID: 1)")

  console.log("✅ Seed concluído com sucesso!")
  console.log("")
  console.log("🔑 Credenciais de acesso:")
  console.log("   Admin:    admin@pdv.com / admin123")
  console.log("   Operador: caixa@pdv.com / caixa123")
  console.log("   Estoque:  estoque@pdv.com / estoque123")
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

      estoque: 40,
      estoqueMinimo: 8,
      categoria: "Mercearia",
      descricao: "Feijão carioca embalagem 1kg",
      ativo: true,
    },
    {
      nome: "Sabão em Pó 2kg",
      codigoBarras: "7891234567895",
      preco: 18.90,
      precoCusto: 12.00,
      estoque: 25,
      estoqueMinimo: 5,
      categoria: "Limpeza",
      descricao: "Sabão em pó embalagem 2kg",
      ativo: true,
    },
    {
      nome: "Detergente 500ml",
      codigoBarras: "7891234567896",
      preco: 3.20,
      precoCusto: 1.80,
      estoque: 80,
      estoqueMinimo: 15,
      categoria: "Limpeza",
      descricao: "Detergente neutro 500ml",
      ativo: true,
    },
    {
      nome: "Pão Francês",
      codigoBarras: null,
      preco: 0.65,
      precoCusto: 0.35,
      estoque: 200,
      estoqueMinimo: 50,
      categoria: "Padaria",
      descricao: "Pão francês unidade",
      ativo: true,
    },
    {
      nome: "Leite Integral 1L",
      codigoBarras: "7891234567897",
      preco: 5.80,
      precoCusto: 4.20,
      estoque: 45,
      estoqueMinimo: 10,
      categoria: "Laticínios",
      descricao: "Leite integral embalagem 1 litro",
      ativo: true,
    },
    {
      nome: "Queijo Mussarela 200g",
      codigoBarras: "7891234567898",
      preco: 12.90,
      precoCusto: 9.00,
      estoque: 35,
      estoqueMinimo: 5,
      categoria: "Laticínios",
      descricao: "Queijo mussarela fatiado 200g",
      ativo: true,
    },
  ]

  for (const p of produtos) {
    const codigo = p.codigoBarras ?? `sem-codigo-${p.nome.toLowerCase().replace(/\s+/g, "-")}`
    await db.produto.upsert({
      where: { codigoBarras: codigo },
      update: {},
      create: { ...p, codigoBarras: codigo },
    })
  }

  console.log(`📦 Produtos criados: ${produtos.length}`)


  console.log(`🏭 Fornecedores criados: ${fornecedor1.nome}, ${fornecedor2.nome}`)

    update: {},
    create: {
      nome: "Estoquista",
      email: "estoque@pdv.com",
      senhaHash: senhaEstoquista,
      papel: Papel.ESTOQUISTA,
      ativo: true,
    },
  })

  console.log(`👥 Usuários criados: Admin (${admin.email}), Operador (${operador.email}), Estoquista (${estoquista.email})`)
}
