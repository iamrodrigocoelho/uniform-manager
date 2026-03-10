import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const colaboradores = await prisma.colaborador.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true,
      matricula: true,
      cpf: true,
      nome: true,
      cargo: true,
      empresa: true,
      area: true,
      emailCorp: true,
      ativo: true,
    },
  });

  return NextResponse.json(colaboradores);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const { matricula, cpf, nome, cargo, empresa, area, emailCorp } = await req.json();

    if (!matricula || !cpf || !nome || !cargo) {
      return NextResponse.json({ error: "Matricula, CPF, nome e cargo sao obrigatorios." }, { status: 400 });
    }

    const cpfDigits = cpf.replace(/\D/g, "");

    const colaborador = await prisma.colaborador.create({
      data: {
        matricula: matricula.trim(),
        cpf: cpfDigits,
        nome: nome.trim(),
        cargo: cargo.trim(),
        empresa: empresa?.trim() || null,
        area: area?.trim() || null,
        emailCorp: emailCorp?.trim() || null,
      },
    });

    return NextResponse.json(colaborador, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Matricula ou CPF ja cadastrado." }, { status: 409 });
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
    const { id, matricula, cpf, nome, cargo, empresa, area, emailCorp, ativo } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID obrigatorio." }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (matricula !== undefined) data.matricula = matricula.trim();
    if (cpf !== undefined) data.cpf = cpf.replace(/\D/g, "");
    if (nome !== undefined) data.nome = nome.trim();
    if (cargo !== undefined) data.cargo = cargo.trim();
    if (empresa !== undefined) data.empresa = empresa?.trim() || null;
    if (area !== undefined) data.area = area?.trim() || null;
    if (emailCorp !== undefined) data.emailCorp = emailCorp?.trim() || null;
    if (ativo !== undefined) data.ativo = ativo;

    const colaborador = await prisma.colaborador.update({
      where: { id },
      data,
    });

    return NextResponse.json(colaborador);
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Matricula ou CPF ja cadastrado." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
