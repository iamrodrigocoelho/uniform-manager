import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const estoque = await prisma.estoque.findMany({
    include: { tipoItem: true },
    orderBy: [{ tipoItem: { nome: "asc" } }, { tamanho: "asc" }],
  });

  const result = estoque.map((e) => ({
    id: e.id,
    tipoItemId: e.tipoItemId,
    tipoItemNome: e.tipoItem.nome,
    tamanho: e.tamanho,
    quantidade: e.quantidade,
  }));

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { updates } = await req.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((u: { id: number; quantidade: number }) =>
        prisma.estoque.update({
          where: { id: u.id },
          data: { quantidade: u.quantidade },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
