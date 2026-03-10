import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { usuario, senha } = await req.json();

    if (!usuario || !senha) {
      return NextResponse.json({ error: "Usuario e senha sao obrigatorios." }, { status: 400 });
    }

    const admin = await prisma.admin.findUnique({
      where: { usuario: usuario.trim() },
    });

    if (!admin || !admin.ativo) {
      return NextResponse.json({ error: "Usuario ou senha invalidos." }, { status: 401 });
    }

    const valid = await bcrypt.compare(senha, admin.senhaHash);
    if (!valid) {
      return NextResponse.json({ error: "Usuario ou senha invalidos." }, { status: 401 });
    }

    await createSession({
      tipo: "admin",
      id: admin.id,
      usuario: admin.usuario,
      nome: admin.nome,
      perfil: admin.perfil,
    });

    return NextResponse.json({ ok: true, nome: admin.nome, perfil: admin.perfil });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
