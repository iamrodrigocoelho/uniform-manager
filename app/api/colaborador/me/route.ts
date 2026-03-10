import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "colaborador") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: session.id },
    select: { id: true, matricula: true, nome: true, cargo: true, empresa: true, area: true, emailCorp: true },
  });

  if (!colaborador) {
    return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(colaborador);
}
