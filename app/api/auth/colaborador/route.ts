import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { matricula, cpf } = await req.json();

    if (!matricula || !cpf) {
      return NextResponse.json({ error: "Matricula e CPF sao obrigatorios." }, { status: 400 });
    }

    const cpfDigits = cpf.replace(/\D/g, "");

    const colaborador = await prisma.colaborador.findFirst({
      where: {
        matricula: matricula.trim(),
        cpf: cpfDigits,
        ativo: true,
      },
    });

    if (!colaborador) {
      return NextResponse.json({ error: "Matricula ou CPF invalidos." }, { status: 401 });
    }

    await createSession({
      tipo: "colaborador",
      id: colaborador.id,
      matricula: colaborador.matricula,
      nome: colaborador.nome,
      cargo: colaborador.cargo,
    });

    return NextResponse.json({ ok: true, nome: colaborador.nome });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
