import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "colaborador") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { tipo, observacao, itens } = await req.json();

    if (!tipo || !["gratuito", "adicional"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo de pedido invalido." }, { status: 400 });
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: "Adicione pelo menos um item." }, { status: 400 });
    }

    // Validate each item
    for (const item of itens) {
      if (!item.tipoItemId || !item.tamanho || !item.quantidade || item.quantidade < 1) {
        return NextResponse.json({ error: "Dados de item invalidos." }, { status: 400 });
      }

      // Check stock
      const estoque = await prisma.estoque.findUnique({
        where: { tipoItemId_tamanho: { tipoItemId: item.tipoItemId, tamanho: item.tamanho } },
      });

      if (!estoque || estoque.quantidade < item.quantidade) {
        const tipoItem = await prisma.tipoItem.findUnique({ where: { id: item.tipoItemId } });
        return NextResponse.json(
          { error: `Estoque insuficiente para ${tipoItem?.nome ?? "item"} tamanho ${item.tamanho}.` },
          { status: 400 }
        );
      }
    }

    // Create order in transaction
    const pedido = await prisma.$transaction(async (tx) => {
      const novoPedido = await tx.pedido.create({
        data: {
          colaboradorId: session.id,
          tipo,
          observacao: observacao ?? null,
          itens: {
            create: itens.map((item: { tipoItemId: number; tamanho: string; quantidade: number }) => ({
              tipoItemId: item.tipoItemId,
              tamanho: item.tamanho,
              quantidade: item.quantidade,
            })),
          },
        },
        include: { itens: true },
      });

      return novoPedido;
    });

    return NextResponse.json({ ok: true, pedidoId: pedido.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
