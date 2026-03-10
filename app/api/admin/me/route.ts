import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.id },
    select: { id: true, usuario: true, nome: true, perfil: true },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin nao encontrado." }, { status: 404 });
  }

  return NextResponse.json(admin);
}
