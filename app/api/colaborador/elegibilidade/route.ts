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
      const agora = new Date();
      const inicioPeriodo = addMonths(agora, -regra.periodoMeses);

      // Busca todos os pedidos entregues no período atual para este tipo de item
      const entregasNoPeriodo = await prisma.itemPedido.findMany({
        where: {
          tipoItemId: regra.tipoItemId,
          pedido: {
            colaboradorId: colaborador.id,
            tipo: "gratuito",
            status: "entregue",
            updatedAt: { gte: inicioPeriodo },
          },
        },
        include: { pedido: { select: { updatedAt: true } } },
      });

      // Soma total entregue no período
      const totalEntregue = entregasNoPeriodo.reduce((sum, i) => sum + i.quantidade, 0);
      const restante = regra.quantidade - totalEntregue;
      const elegivel = restante > 0;

      // Próxima elegibilidade = data da entrega mais antiga no período + periodoMeses
      let proximaElegibilidade: string | null = null;
      if (!elegivel && entregasNoPeriodo.length > 0) {
        const datasMaisAntigas = entregasNoPeriodo
          .map((i) => i.pedido.updatedAt)
          .sort((a, b) => a.getTime() - b.getTime());
        proximaElegibilidade = addMonths(datasMaisAntigas[0], regra.periodoMeses).toISOString();
      }

      return {
        tipoItemId: regra.tipoItemId,
        tipoItemNome: regra.tipoItem.nome,
        cargo: regra.cargo,
        quantidadePermitida: elegivel ? restante : regra.quantidade,
        periodoMeses: regra.periodoMeses,
        elegivel,
        proximaElegibilidade,
        tamanhos: regra.tipoItem.tamanhos,
      };
    })
  );

  return NextResponse.json(resultado);
}
