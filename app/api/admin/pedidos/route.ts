import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const tipo = searchParams.get("tipo");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (tipo) where.tipo = tipo;

  const pedidos = await prisma.pedido.findMany({
    where,
    include: {
      colaborador: true,
      itens: {
        include: { tipoItem: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = pedidos.map((p) => ({
    id: p.id,
    tipo: p.tipo,
    status: p.status,
    observacao: p.observacao,
    createdAt: p.createdAt,
    colaboradorNome: p.colaborador.nome,
    colaboradorMatricula: p.colaborador.matricula,
    colaboradorCargo: p.colaborador.cargo,
    itens: p.itens.map((i) => ({
      id: i.id,
      tipoItemNome: i.tipoItem.nome,
      tamanho: i.tamanho,
      quantidade: i.quantidade,
    })),
  }));

  return NextResponse.json(result);
}
