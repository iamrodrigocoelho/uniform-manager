import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

// Expected columns (case insensitive): matricula, cpf, nome, cargo, empresa, area, emailcorp
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.tipo !== "admin") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo nao enviado." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let criados = 0;
    let atualizados = 0;
    let erros = 0;

    for (const row of rows) {
      // Normalize keys to lowercase
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase().trim()] = String(value).trim();
      }

      const matricula = normalized["matricula"] || normalized["mat"] || normalized["matrícula"];
      const cpf = (normalized["cpf"] || "").replace(/\D/g, "");
      const nome = normalized["nome"];
      const cargo = normalized["cargo"];
      const empresa = normalized["empresa"] || null;
      const area = normalized["area"] || normalized["área"] || null;
      const emailCorp = normalized["emailcorp"] || normalized["email"] || normalized["e-mail"] || null;

      if (!matricula || !cpf || !nome || !cargo) {
        erros++;
        continue;
      }

      try {
        const existing = await prisma.colaborador.findFirst({
          where: { OR: [{ matricula }, { cpf }] },
        });

        if (existing) {
          await prisma.colaborador.update({
            where: { id: existing.id },
            data: { matricula, cpf, nome, cargo, empresa: empresa || null, area: area || null, emailCorp: emailCorp || null },
          });
          atualizados++;
        } else {
          await prisma.colaborador.create({
            data: { matricula, cpf, nome, cargo, empresa: empresa || null, area: area || null, emailCorp: emailCorp || null },
          });
          criados++;
        }
      } catch {
        erros++;
      }
    }

    return NextResponse.json({ ok: true, criados, atualizados, erros });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao processar arquivo." }, { status: 500 });
  }
}
