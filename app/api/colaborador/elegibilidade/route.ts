import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addMonths } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  if (!session || session.tipo !== "colaborador") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: session.id },
  });

  if (!colaborador) {
    return NextResponse.json({ error: "Colaborador nao encontrado." }, { status: 404 });
  }

  const regras = await prisma.regraConcessao.findMany({
    where: { cargo: colaborador.cargo, ativo: true },
    include: { tipoItem: true },
  });

  const resultado = await Promise.all(
    regras.map(async (regra) => {
      // Find the last "entregue" gratuito order containing this tipoItemId
      const ultimaEntrega = await prisma.pedido.findFirst({
        where: {
          colaboradorId: colaborador.id,
          tipo: "gratuito",
          status: "entregue",
          itens: {
            some: { tipoItemId: regra.tipoItemId },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      let elegivel = true;
      let proximaElegibilidade: string | null = null;

      if (ultimaEntrega) {
        const dataProxima = addMonths(ultimaEntrega.updatedAt, regra.periodoMeses);
        const agora = new Date();
        if (dataProxima > agora) {
          elegivel = false;
          proximaElegibilidade = dataProxima.toISOString();
        }
      }

      return {
        tipoItemId: regra.tipoItemId,
        tipoItemNome: regra.tipoItem.nome,
        cargo: regra.cargo,
        quantidadePermitida: regra.quantidade,
        periodoMeses: regra.periodoMeses,
        elegivel,
        proximaElegibilidade,
        tamanhos: regra.tipoItem.tamanhos,
      };
    })
  );

  return NextResponse.json(resultado);
}
