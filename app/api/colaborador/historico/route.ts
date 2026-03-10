import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "colaborador") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const pedidos = await prisma.pedido.findMany({
    where: { colaboradorId: session.id },
    include: {
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
    itens: p.itens.map((i) => ({
      id: i.id,
      tipoItemNome: i.tipoItem.nome,
      tamanho: i.tamanho,
      quantidade: i.quantidade,
    })),
  }));

  return NextResponse.json(result);
}
