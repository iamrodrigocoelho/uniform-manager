"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { formatDate, formatDateTime } from "@/lib/utils";

type ColaboradorMe = {
  id: number;
  matricula: string;
  nome: string;
  cargo: string;
  empresa: string | null;
};

type ElegibilidadeItem = {
  tipoItemId: number;
  tipoItemNome: string;
  cargo: string;
  quantidadePermitida: number;
  periodoMeses: number;
  elegivel: boolean;
  proximaElegibilidade: string | null;
  tamanhos: string[];
};

type ItemPedidoForm = {
  tipoItemId: number;
  tipoItemNome: string;
  tamanho: string;
  quantidade: number;
  quantidadeMax: number;
  tamanhos: string[];
};

type Pedido = {
  id: number;
  tipo: string;
  status: string;
  observacao: string | null;
  createdAt: string;
  itens: {
    id: number;
    tipoItemNome: string;
    tamanho: string;
    quantidade: number;
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function ColaboradorPortalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"elegibilidade" | "solicitar" | "historico">("elegibilidade");
  const [me, setMe] = useState<ColaboradorMe | null>(null);
  const [elegibilidade, setElegibilidade] = useState<ElegibilidadeItem[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [itensSelecionados, setItensSelecionados] = useState<ItemPedidoForm[]>([]);
  const [tipoPedido, setTipoPedido] = useState<"gratuito" | "adicional">("gratuito");
  const [observacao, setObservacao] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/colaborador/me");
    if (res.status === 401) {
      router.push("/colaborador/login");
      return;
    }
    const data = await res.json();
    setMe(data);
  }, [router]);

  const loadElegibilidade = useCallback(async () => {
    const res = await fetch("/api/colaborador/elegibilidade");
    if (res.ok) {
      const data = await res.json();
      setElegibilidade(data);
    }
  }, []);

  const loadHistorico = useCallback(async () => {
    const res = await fetch("/api/colaborador/historico");
    if (res.ok) {
      const data = await res.json();
      setPedidos(data);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        await loadMe();
        await Promise.all([loadElegibilidade(), loadHistorico()]);
      } catch {
        setError("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadMe, loadElegibilidade, loadHistorico]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/colaborador/login");
  }

  function iniciarSolicitacao(item: ElegibilidadeItem) {
    const jaAdicionado = itensSelecionados.find((i) => i.tipoItemId === item.tipoItemId);
    if (!jaAdicionado) {
      setItensSelecionados((prev) => [
        ...prev,
        {
          tipoItemId: item.tipoItemId,
          tipoItemNome: item.tipoItemNome,
          tamanho: item.tamanhos[0] ?? "",
          quantidade: 1,
          quantidadeMax: item.quantidadePermitida,
          tamanhos: item.tamanhos,
        },
      ]);
    }
    setTab("solicitar");
  }

  function removerItem(tipoItemId: number) {
    setItensSelecionados((prev) => prev.filter((i) => i.tipoItemId !== tipoItemId));
  }

  function atualizarItem(tipoItemId: number, field: "tamanho" | "quantidade", value: string | number) {
    setItensSelecionados((prev) =>
      prev.map((i) =>
        i.tipoItemId === tipoItemId ? { ...i, [field]: value } : i
      )
    );
  }

  async function handleSubmitPedido(e: React.FormEvent) {
    e.preventDefault();
    if (itensSelecionados.length === 0) {
      setSubmitError("Adicione pelo menos um item ao pedido.");
      return;
    }
    setSubmitError("");
    setSubmitSuccess("");
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/colaborador/pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tipoPedido,
          observacao: observacao || null,
          itens: itensSelecionados.map((i) => ({
            tipoItemId: i.tipoItemId,
            tamanho: i.tamanho,
            quantidade: i.quantidade,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "Erro ao criar pedido.");
        return;
      }
      setSubmitSuccess("Pedido criado com sucesso!");
      setItensSelecionados([]);
      setObservacao("");
      await Promise.all([loadElegibilidade(), loadHistorico()]);
      setTimeout(() => setTab("historico"), 1500);
    } catch {
      setSubmitError("Erro de conexao. Tente novamente.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-venancio.png" alt="Venancio" width={120} height={32} className="h-8 w-auto" />
            <span className="text-sm text-gray-400 hidden sm:block">|</span>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">Uniformes</span>
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <span className="text-sm text-gray-600 hidden sm:block">
                {me.nome}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        {me && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{me.nome}</p>
              <p className="text-sm text-gray-500">{me.cargo} {me.empresa ? `— ${me.empresa}` : ""}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-400">Matricula</p>
              <p className="text-sm font-mono font-semibold text-gray-700">{me.matricula}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {([
            { key: "elegibilidade", label: "Minha Elegibilidade" },
            { key: "solicitar", label: "Solicitar Uniforme" },
            { key: "historico", label: "Meus Pedidos" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Elegibilidade */}
        {tab === "elegibilidade" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Minha Elegibilidade</h2>
            {elegibilidade.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
                Nenhuma regra de concessao definida para o seu cargo.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {elegibilidade.map((item) => (
                  <div
                    key={item.tipoItemId}
                    className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 ${
                      item.elegivel ? "border-green-200" : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.tipoItemNome}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.quantidadePermitida} peca(s) a cada {item.periodoMeses} meses
                        </p>
                      </div>
                      {item.elegivel ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                          Elegivel
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                          Indisponivel
                        </span>
                      )}
                    </div>
                    {!item.elegivel && item.proximaElegibilidade && (
                      <p className="text-xs text-gray-500">
                        Proxima elegibilidade: <span className="font-medium">{formatDate(item.proximaElegibilidade)}</span>
                      </p>
                    )}
                    {item.elegivel && (
                      <Button
                        size="sm"
                        onClick={() => iniciarSolicitacao(item)}
                        className="w-full"
                      >
                        Solicitar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Solicitar */}
        {tab === "solicitar" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Solicitar Uniforme</h2>
            <form onSubmit={handleSubmitPedido} className="flex flex-col gap-4">
              {submitError && <Alert type="error">{submitError}</Alert>}
              {submitSuccess && <Alert type="success">{submitSuccess}</Alert>}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Tipo de Pedido</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="gratuito"
                        checked={tipoPedido === "gratuito"}
                        onChange={() => setTipoPedido("gratuito")}
                        className="accent-red-600"
                      />
                      <span className="text-sm text-gray-700">Gratuito (conforme elegibilidade)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="adicional"
                        checked={tipoPedido === "adicional"}
                        onChange={() => setTipoPedido("adicional")}
                        className="accent-red-600"
                      />
                      <span className="text-sm text-gray-700">Adicional</span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Observacao</label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Informacoes adicionais (opcional)"
                    rows={2}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 bg-white placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Itens do Pedido</h3>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setTab("elegibilidade")}
                  >
                    + Adicionar da elegibilidade
                  </Button>
                </div>

                {itensSelecionados.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhum item selecionado. Volte em "Minha Elegibilidade" e clique em "Solicitar".
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {itensSelecionados.map((item) => (
                      <div key={item.tipoItemId} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-32">
                          <p className="text-xs text-gray-500 mb-1">Item</p>
                          <p className="text-sm font-semibold text-gray-900">{item.tipoItemNome}</p>
                        </div>
                        <div className="w-28">
                          <Select
                            label="Tamanho"
                            value={item.tamanho}
                            onChange={(e) => atualizarItem(item.tipoItemId, "tamanho", e.target.value)}
                          >
                            {item.tamanhos.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="w-24">
                          <label className="text-xs text-gray-500 block mb-1">Qtd (max {item.quantidadeMax})</label>
                          <input
                            type="number"
                            min={1}
                            max={item.quantidadeMax}
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(item.tipoItemId, "quantidade", parseInt(e.target.value) || 1)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerItem(item.tipoItemId)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" loading={submitLoading} size="lg" disabled={itensSelecionados.length === 0}>
                Enviar Pedido
              </Button>
            </form>
          </div>
        )}

        {/* Historico */}
        {tab === "historico" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Meus Pedidos</h2>
            {pedidos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
                Nenhum pedido encontrado.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pedidos.map((pedido) => (
                  <div key={pedido.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">Pedido #{pedido.id}</span>
                        <span className="ml-2 text-xs text-gray-400">{formatDateTime(pedido.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                          {pedido.tipo}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[pedido.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {STATUS_LABELS[pedido.status] ?? pedido.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {pedido.itens.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                          <span>{item.tipoItemNome}</span>
                          <span className="text-gray-400">Tam. {item.tamanho}</span>
                          <span className="text-gray-400">x{item.quantidade}</span>
                        </div>
                      ))}
                    </div>
                    {pedido.observacao && (
                      <p className="mt-3 text-xs text-gray-500 italic">{pedido.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
