import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as readline from "readline";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/uniform_manager";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log("=== Criar Admin ===");
  const usuario = await question("Usuario: ");
  const senha = await question("Senha: ");
  const nome = await question("Nome completo: ");
  const perfil = await question("Perfil (admin/rh) [admin]: ") || "admin";

  if (!usuario || !senha || !nome) {
    console.error("Todos os campos sao obrigatorios.");
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    const admin = await prisma.admin.create({
      data: { usuario: usuario.trim(), senhaHash, nome: nome.trim(), perfil },
    });
    console.log(`Admin criado com sucesso! ID: ${admin.id}`);
  } catch (err: any) {
    if (err?.code === "P2002") {
      console.error("Ja existe um admin com este usuario.");
    } else {
      console.error("Erro:", err);
    }
    process.exit(1);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { rl.close(); await prisma.$disconnect(); await pool.end(); });
