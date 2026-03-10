import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const regras = await prisma.regraConcessao.findMany({
    include: { tipoItem: true },
    orderBy: [{ cargo: "asc" }, { tipoItem: { nome: "asc" } }],
  });

  const result = regras.map((r) => ({
    id: r.id,
    cargo: r.cargo,
    tipoItemId: r.tipoItemId,
    tipoItemNome: r.tipoItem.nome,
    quantidade: r.quantidade,
    periodoMeses: r.periodoMeses,
    ativo: r.ativo,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { cargo, tipoItemId, quantidade, periodoMeses } = await req.json();

    if (!cargo || !tipoItemId || !quantidade || !periodoMeses) {
      return NextResponse.json({ error: "Todos os campos sao obrigatorios." }, { status: 400 });
    }

    const regra = await prisma.regraConcessao.create({
      data: {
        cargo: cargo.trim(),
        tipoItemId: Number(tipoItemId),
        quantidade: Number(quantidade),
        periodoMeses: Number(periodoMeses),
      },
      include: { tipoItem: true },
    });

    return NextResponse.json({
      id: regra.id,
      cargo: regra.cargo,
      tipoItemId: regra.tipoItemId,
      tipoItemNome: regra.tipoItem.nome,
      quantidade: regra.quantidade,
      periodoMeses: regra.periodoMeses,
      ativo: regra.ativo,
    }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ja existe uma regra para este cargo e tipo de item." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { id, cargo, tipoItemId, quantidade, periodoMeses, ativo } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (cargo !== undefined) data.cargo = cargo.trim();
    if (tipoItemId !== undefined) data.tipoItemId = Number(tipoItemId);
    if (quantidade !== undefined) data.quantidade = Number(quantidade);
    if (periodoMeses !== undefined) data.periodoMeses = Number(periodoMeses);
    if (ativo !== undefined) data.ativo = ativo;

    const regra = await prisma.regraConcessao.update({
      where: { id },
      data,
    });

    return NextResponse.json(regra);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    }

    await prisma.regraConcessao.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
