import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const tipos = await prisma.tipoItem.findMany({
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(tipos);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { nome, tamanhos } = await req.json();

    if (!nome || !tamanhos || !Array.isArray(tamanhos) || tamanhos.length === 0) {
      return NextResponse.json({ error: "Nome e tamanhos sao obrigatorios." }, { status: 400 });
    }

    const tipo = await prisma.tipoItem.create({
      data: { nome: nome.trim(), tamanhos },
    });

    // Create initial stock entries (0) for each size
    await prisma.estoque.createMany({
      data: tamanhos.map((t: string) => ({
        tipoItemId: tipo.id,
        tamanho: t,
        quantidade: 0,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(tipo, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Ja existe um tipo com este nome." }, { status: 409 });
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
    const { id, nome, tamanhos, ativo } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (nome !== undefined) data.nome = nome.trim();
    if (tamanhos !== undefined) data.tamanhos = tamanhos;
    if (ativo !== undefined) data.ativo = ativo;

    const tipo = await prisma.tipoItem.update({
      where: { id },
      data,
    });

    // If tamanhos changed, create missing stock entries
    if (tamanhos && Array.isArray(tamanhos)) {
      await prisma.estoque.createMany({
        data: tamanhos.map((t: string) => ({
          tipoItemId: id,
          tamanho: t,
          quantidade: 0,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(tipo);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
