import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;
    const pedidoId = parseInt(id);
    const { status } = await req.json();

    if (!status || !["aprovado", "entregue", "cancelado"].includes(status)) {
      return NextResponse.json({ error: "Status invalido." }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true },
    });

    if (!pedido) {
      return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
    }

    // When marking as delivered, decrement stock
    if (status === "entregue" && pedido.status !== "entregue") {
      await prisma.$transaction(async (tx) => {
        for (const item of pedido.itens) {
          const estoque = await tx.estoque.findUnique({
            where: { tipoItemId_tamanho: { tipoItemId: item.tipoItemId, tamanho: item.tamanho } },
          });

          if (!estoque || estoque.quantidade < item.quantidade) {
            throw new Error(`Estoque insuficiente para tamanho ${item.tamanho}.`);
          }

          await tx.estoque.update({
            where: { id: estoque.id },
            data: { quantidade: estoque.quantidade - item.quantidade },
          });
        }

        await tx.pedido.update({
          where: { id: pedidoId },
          data: { status },
        });
      });
    } else {
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: { status },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    if (err?.message?.includes("Estoque")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
