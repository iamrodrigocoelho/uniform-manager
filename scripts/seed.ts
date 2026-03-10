import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/uniform_manager";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Iniciando seed...");

  // Tipos de item
  console.log("Criando tipos de item...");

  const camiseta = await prisma.tipoItem.upsert({
    where: { nome: "Camiseta" },
    update: {},
    create: { nome: "Camiseta", tamanhos: ["P", "M", "G", "GG"] },
  });

  const jaleco = await prisma.tipoItem.upsert({
    where: { nome: "Jaleco" },
    update: {},
    create: { nome: "Jaleco", tamanhos: ["P", "M", "G", "GG", "GGG"] },
  });

  const calca = await prisma.tipoItem.upsert({
    where: { nome: "Calca" },
    update: {},
    create: { nome: "Calca", tamanhos: ["36", "38", "40", "42", "44", "46", "48"] },
  });

  // Estoque inicial: 10 unidades de cada combinacao
  console.log("Criando estoque inicial...");

  for (const tamanho of camiseta.tamanhos) {
    await prisma.estoque.upsert({
      where: { tipoItemId_tamanho: { tipoItemId: camiseta.id, tamanho } },
      update: {},
      create: { tipoItemId: camiseta.id, tamanho, quantidade: 10 },
    });
  }

  for (const tamanho of jaleco.tamanhos) {
    await prisma.estoque.upsert({
      where: { tipoItemId_tamanho: { tipoItemId: jaleco.id, tamanho } },
      update: {},
      create: { tipoItemId: jaleco.id, tamanho, quantidade: 10 },
    });
  }

  for (const tamanho of calca.tamanhos) {
    await prisma.estoque.upsert({
      where: { tipoItemId_tamanho: { tipoItemId: calca.id, tamanho } },
      update: {},
      create: { tipoItemId: calca.id, tamanho, quantidade: 10 },
    });
  }

  // Regras de concessao
  console.log("Criando regras de concessao...");

  await prisma.regraConcessao.upsert({
    where: { cargo_tipoItemId: { cargo: "Atendente", tipoItemId: camiseta.id } },
    update: {},
    create: { cargo: "Atendente", tipoItemId: camiseta.id, quantidade: 2, periodoMeses: 6 },
  });

  await prisma.regraConcessao.upsert({
    where: { cargo_tipoItemId: { cargo: "Atendente", tipoItemId: calca.id } },
    update: {},
    create: { cargo: "Atendente", tipoItemId: calca.id, quantidade: 1, periodoMeses: 6 },
  });

  await prisma.regraConcessao.upsert({
    where: { cargo_tipoItemId: { cargo: "Farmaceutico", tipoItemId: jaleco.id } },
    update: {},
    create: { cargo: "Farmaceutico", tipoItemId: jaleco.id, quantidade: 2, periodoMeses: 6 },
  });

  await prisma.regraConcessao.upsert({
    where: { cargo_tipoItemId: { cargo: "Farmaceutico", tipoItemId: calca.id } },
    update: {},
    create: { cargo: "Farmaceutico", tipoItemId: calca.id, quantidade: 1, periodoMeses: 6 },
  });

  // Admin padrao
  console.log("Criando admin padrao...");

  const senhaHash = await bcrypt.hash("admin@uniforme2024", 10);
  await prisma.admin.upsert({
    where: { usuario: "admin" },
    update: {},
    create: {
      usuario: "admin",
      senhaHash,
      nome: "Administrador",
      perfil: "admin",
    },
  });

  // Colaboradores de exemplo
  console.log("Criando colaboradores de exemplo...");

  await prisma.colaborador.upsert({
    where: { matricula: "00001" },
    update: {},
    create: {
      matricula: "00001",
      cpf: "12345678901",
      nome: "Joao Silva",
      cargo: "Atendente",
      empresa: "Venancio",
    },
  });

  await prisma.colaborador.upsert({
    where: { matricula: "00002" },
    update: {},
    create: {
      matricula: "00002",
      cpf: "98765432100",
      nome: "Maria Santos",
      cargo: "Farmaceutico",
      empresa: "Venancio",
    },
  });

  console.log("Seed concluido com sucesso!");
  console.log("");
  console.log("Credenciais padrao:");
  console.log("  Admin: usuario=admin, senha=admin@uniforme2024");
  console.log("  Colaborador 1: matricula=00001, cpf=12345678901 (Joao Silva - Atendente)");
  console.log("  Colaborador 2: matricula=00002, cpf=98765432100 (Maria Santos - Farmaceutico)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
