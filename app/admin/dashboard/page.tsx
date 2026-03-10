"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatDateTime, formatDate } from "@/lib/utils";

type AdminMe = { id: number; usuario: string; nome: string; perfil: string };

type TipoItem = {
  id: number;
  nome: string;
  ativo: boolean;
  tamanhos: string[];
};

type EstoqueItem = {
  id: number;
  tipoItemId: number;
  tipoItemNome: string;
  tamanho: string;
  quantidade: number;
};

type Regra = {
  id: number;
  cargo: string;
  tipoItemId: number;
  tipoItemNome: string;
  quantidade: number;
  periodoMeses: number;
  ativo: boolean;
};

type Colaborador = {
  id: number;
  matricula: string;
  cpf: string;
  nome: string;
  cargo: string;
  empresa: string | null;
  area: string | null;
  emailCorp: string | null;
  ativo: boolean;
};

type ItemPedido = {
  id: number;
  tipoItemNome: string;
  tamanho: string;
  quantidade: number;
};

type Pedido = {
  id: number;
  tipo: string;
  status: string;
  observacao: string | null;
  createdAt: string;
  colaboradorNome: string;
  colaboradorMatricula: string;
  colaboradorCargo: string;
  itens: ItemPedido[];
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"estoque" | "tipos" | "regras" | "colaboradores" | "pedidos" | "historico">("pedidos");
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estoque
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [estoqueEdits, setEstoqueEdits] = useState<Record<number, number>>({});
  const [estoqueSaving, setEstoqueSaving] = useState(false);
  const [estoqueMsg, setEstoqueMsg] = useState("");

  // Tipos
  const [tipos, setTipos] = useState<TipoItem[]>([]);
  const [tipoForm, setTipoForm] = useState({ nome: "", tamanhos: "" });
  const [tipoEditId, setTipoEditId] = useState<number | null>(null);
  const [tiposMsg, setTiposMsg] = useState("");
  const [tiposLoading, setTiposLoading] = useState(false);

  // Regras
  const [regras, setRegras] = useState<Regra[]>([]);
  const [regraForm, setRegraForm] = useState({ cargo: "", tipoItemId: "", quantidade: "1", periodoMeses: "6" });
  const [regraEditId, setRegraEditId] = useState<number | null>(null);
  const [regrasMsg, setRegrasMsg] = useState("");
  const [regrasLoading, setRegrasLoading] = useState(false);

  // Colaboradores
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradorSearch, setColaboradorSearch] = useState("");
  const [colaboradorForm, setColaboradorForm] = useState({ matricula: "", cpf: "", nome: "", cargo: "", empresa: "", area: "", emailCorp: "" });
  const [colaboradorEditId, setColaboradorEditId] = useState<number | null>(null);
  const [colaboradoresMsg, setColaboradoresMsg] = useState("");
  const [colaboradoresLoading, setColaboradoresLoading] = useState(false);
  const [importando, setImportando] = useState(false);
  const [showColaboradorForm, setShowColaboradorForm] = useState(false);

  // Pedidos
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [pedidosLoading, setPedidosLoading] = useState(false);
  const [pedidosMsg, setPedidosMsg] = useState("");

  const loadMe = useCallback(async () => {
    const res = await fetch("/api/admin/me");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setMe(data);
  }, [router]);

  const loadEstoque = useCallback(async () => {
    const res = await fetch("/api/admin/estoque");
    if (res.ok) setEstoque(await res.json());
  }, []);

  const loadTipos = useCallback(async () => {
    const res = await fetch("/api/admin/tipos-item");
    if (res.ok) setTipos(await res.json());
  }, []);

  const loadRegras = useCallback(async () => {
    const res = await fetch("/api/admin/regras");
    if (res.ok) setRegras(await res.json());
  }, []);

  const loadColaboradores = useCallback(async () => {
    const res = await fetch("/api/admin/colaboradores");
    if (res.ok) setColaboradores(await res.json());
  }, []);

  const loadPedidos = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroStatus) params.set("status", filtroStatus);
    if (filtroTipo) params.set("tipo", filtroTipo);
    const res = await fetch(`/api/admin/pedidos?${params}`);
    if (res.ok) setPedidos(await res.json());
  }, [filtroStatus, filtroTipo]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        await loadMe();
        await Promise.all([loadEstoque(), loadTipos(), loadRegras(), loadColaboradores()]);
      } catch { setError("Erro ao carregar dados."); }
      finally { setLoading(false); }
    }
    init();
  }, [loadMe, loadEstoque, loadTipos, loadRegras, loadColaboradores]);

  useEffect(() => { loadPedidos(); }, [loadPedidos]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  // --- Estoque ---
  async function salvarEstoque() {
    setEstoqueSaving(true);
    setEstoqueMsg("");
    try {
      const updates = Object.entries(estoqueEdits).map(([id, quantidade]) => ({ id: parseInt(id), quantidade }));
      const res = await fetch("/api/admin/estoque", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        setEstoqueMsg("Estoque atualizado com sucesso!");
        setEstoqueEdits({});
        await loadEstoque();
      } else {
        const d = await res.json();
        setEstoqueMsg(d.error ?? "Erro ao salvar.");
      }
    } finally { setEstoqueSaving(false); }
  }

  // --- Tipos ---
  async function handleTipoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTiposLoading(true);
    setTiposMsg("");
    try {
      const tamanhos = tipoForm.tamanhos.split(",").map((t) => t.trim()).filter(Boolean);
      const body = { nome: tipoForm.nome, tamanhos };
      const res = tipoEditId
        ? await fetch("/api/admin/tipos-item", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tipoEditId, ...body }) })
        : await fetch("/api/admin/tipos-item", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setTiposMsg(data.error ?? "Erro."); return; }
      setTiposMsg(tipoEditId ? "Tipo atualizado!" : "Tipo criado!");
      setTipoForm({ nome: "", tamanhos: "" });
      setTipoEditId(null);
      await Promise.all([loadTipos(), loadEstoque()]);
    } finally { setTiposLoading(false); }
  }

  function editarTipo(tipo: TipoItem) {
    setTipoEditId(tipo.id);
    setTipoForm({ nome: tipo.nome, tamanhos: tipo.tamanhos.join(", ") });
  }

  async function desativarTipo(id: number, ativo: boolean) {
    await fetch("/api/admin/tipos-item", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo: !ativo }),
    });
    await loadTipos();
  }

  // --- Regras ---
  async function handleRegraSubmit(e: React.FormEvent) {
    e.preventDefault();
    setRegrasLoading(true);
    setRegrasMsg("");
    try {
      const body = {
        cargo: regraForm.cargo,
        tipoItemId: parseInt(regraForm.tipoItemId),
        quantidade: parseInt(regraForm.quantidade),
        periodoMeses: parseInt(regraForm.periodoMeses),
      };
      const res = regraEditId
        ? await fetch("/api/admin/regras", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: regraEditId, ...body }) })
        : await fetch("/api/admin/regras", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setRegrasMsg(data.error ?? "Erro."); return; }
      setRegrasMsg(regraEditId ? "Regra atualizada!" : "Regra criada!");
      setRegraForm({ cargo: "", tipoItemId: "", quantidade: "1", periodoMeses: "6" });
      setRegraEditId(null);
      await loadRegras();
    } finally { setRegrasLoading(false); }
  }

  async function excluirRegra(id: number) {
    if (!confirm("Excluir esta regra?")) return;
    await fetch("/api/admin/regras", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await loadRegras();
  }

  // --- Colaboradores ---
  async function handleColaboradorSubmit(e: React.FormEvent) {
    e.preventDefault();
    setColaboradoresLoading(true);
    setColaboradoresMsg("");
    try {
      const body = {
        matricula: colaboradorForm.matricula,
        cpf: colaboradorForm.cpf.replace(/\D/g, ""),
        nome: colaboradorForm.nome,
        cargo: colaboradorForm.cargo,
        empresa: colaboradorForm.empresa || null,
        area: colaboradorForm.area || null,
        emailCorp: colaboradorForm.emailCorp || null,
      };
      const res = colaboradorEditId
        ? await fetch("/api/admin/colaboradores", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: colaboradorEditId, ...body }) })
        : await fetch("/api/admin/colaboradores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setColaboradoresMsg(data.error ?? "Erro."); return; }
      setColaboradoresMsg(colaboradorEditId ? "Colaborador atualizado!" : "Colaborador criado!");
      setColaboradorForm({ matricula: "", cpf: "", nome: "", cargo: "", empresa: "", area: "", emailCorp: "" });
      setColaboradorEditId(null);
      setShowColaboradorForm(false);
      await loadColaboradores();
    } finally { setColaboradoresLoading(false); }
  }

  async function handleImportarColaboradores(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setColaboradoresMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/importar-colaboradores", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setColaboradoresMsg(data.error ?? "Erro na importacao."); return; }
      setColaboradoresMsg(`Importado: ${data.criados} criados, ${data.atualizados} atualizados, ${data.erros} erros.`);
      await loadColaboradores();
    } finally {
      setImportando(false);
      e.target.value = "";
    }
  }

  // --- Pedidos ---
  async function atualizarStatusPedido(id: number, status: string) {
    setPedidosLoading(true);
    setPedidosMsg("");
    try {
      const res = await fetch(`/api/admin/pedidos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) { setPedidosMsg(data.error ?? "Erro."); return; }
      setPedidosMsg("Status atualizado!");
      await loadPedidos();
    } finally { setPedidosLoading(false); }
  }

  const colaboradoresFiltrados = colaboradores.filter((c) =>
    !colaboradorSearch ||
    c.nome.toLowerCase().includes(colaboradorSearch.toLowerCase()) ||
    c.matricula.includes(colaboradorSearch) ||
    c.cargo.toLowerCase().includes(colaboradorSearch.toLowerCase())
  );

  const pedidosHistorico = pedidos.filter((p) => p.status === "entregue");
  const pedidosAtivos = pedidos.filter((p) => p.status !== "entregue" || filtroStatus === "entregue");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-venancio.png" alt="Venancio" width={120} height={32} className="h-8 w-auto" />
            <span className="text-sm text-gray-400 hidden sm:block">|</span>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">Admin / RH</span>
          </div>
          <div className="flex items-center gap-3">
            {me && <span className="text-sm text-gray-600 hidden sm:block">{me.nome} <span className="text-gray-400">({me.perfil})</span></span>}
            <Button variant="ghost" size="sm" onClick={handleLogout}>Sair</Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {error && <Alert type="error" className="mb-4">{error}</Alert>}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {([
            { key: "pedidos", label: "Pedidos" },
            { key: "estoque", label: "Estoque" },
            { key: "tipos", label: "Tipos de Item" },
            { key: "regras", label: "Regras" },
            { key: "colaboradores", label: "Colaboradores" },
            { key: "historico", label: "Historico" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 min-w-fit py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ESTOQUE */}
        {tab === "estoque" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Estoque</h2>
              {Object.keys(estoqueEdits).length > 0 && (
                <Button size="sm" loading={estoqueSaving} onClick={salvarEstoque}>
                  Salvar Alteracoes ({Object.keys(estoqueEdits).length})
                </Button>
              )}
            </div>
            {estoqueMsg && <Alert type={estoqueMsg.includes("sucesso") ? "success" : "error"} className="mb-4">{estoqueMsg}</Alert>}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tamanho</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {estoque.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.tipoItemNome}</td>
                      <td className="px-4 py-3 text-gray-600">{item.tamanho}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={estoqueEdits[item.id] ?? item.quantidade}
                          onChange={(e) => setEstoqueEdits((prev) => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                          className="w-20 text-right rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TIPOS */}
        {tab === "tipos" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Tipos de Item</h2>
            {tiposMsg && <Alert type={tiposMsg.includes("Erro") ? "error" : "success"} className="mb-4">{tiposMsg}</Alert>}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">{tipoEditId ? "Editar Tipo" : "Novo Tipo"}</h3>
              <form onSubmit={handleTipoSubmit} className="flex flex-col gap-4">
                <Input
                  label="Nome"
                  placeholder="Ex: Camiseta"
                  value={tipoForm.nome}
                  onChange={(e) => setTipoForm((p) => ({ ...p, nome: e.target.value }))}
                  required
                />
                <Input
                  label="Tamanhos (separados por virgula)"
                  placeholder="P, M, G, GG"
                  value={tipoForm.tamanhos}
                  onChange={(e) => setTipoForm((p) => ({ ...p, tamanhos: e.target.value }))}
                  hint="Ex: P, M, G, GG ou 36, 38, 40, 42"
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" loading={tiposLoading}>{tipoEditId ? "Atualizar" : "Criar Tipo"}</Button>
                  {tipoEditId && (
                    <Button type="button" variant="secondary" onClick={() => { setTipoEditId(null); setTipoForm({ nome: "", tamanhos: "" }); }}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-3">
              {tipos.map((tipo) => (
                <div key={tipo.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 ${tipo.ativo ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{tipo.nome}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Tamanhos: {tipo.tamanhos.join(", ")}</p>
                  </div>
                  {!tipo.ativo && <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">Inativo</span>}
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => editarTipo(tipo)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => desativarTipo(tipo.id, tipo.ativo)}>
                      {tipo.ativo ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGRAS */}
        {tab === "regras" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Regras de Concessao</h2>
            {regrasMsg && <Alert type={regrasMsg.includes("Erro") ? "error" : "success"} className="mb-4">{regrasMsg}</Alert>}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">{regraEditId ? "Editar Regra" : "Nova Regra"}</h3>
              <form onSubmit={handleRegraSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Cargo"
                    placeholder="Ex: Atendente"
                    value={regraForm.cargo}
                    onChange={(e) => setRegraForm((p) => ({ ...p, cargo: e.target.value }))}
                    required
                  />
                  <Select
                    label="Tipo de Item"
                    value={regraForm.tipoItemId}
                    onChange={(e) => setRegraForm((p) => ({ ...p, tipoItemId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    {tipos.filter((t) => t.ativo).map((t) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </Select>
                  <Input
                    label="Quantidade"
                    type="number"
                    min={1}
                    value={regraForm.quantidade}
                    onChange={(e) => setRegraForm((p) => ({ ...p, quantidade: e.target.value }))}
                    required
                  />
                  <Select
                    label="Periodo"
                    value={regraForm.periodoMeses}
                    onChange={(e) => setRegraForm((p) => ({ ...p, periodoMeses: e.target.value }))}
                    required
                  >
                    <option value="3">Trimestral (3 meses)</option>
                    <option value="6">Semestral (6 meses)</option>
                    <option value="12">Anual (12 meses)</option>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" loading={regrasLoading}>{regraEditId ? "Atualizar" : "Criar Regra"}</Button>
                  {regraEditId && (
                    <Button type="button" variant="secondary" onClick={() => { setRegraEditId(null); setRegraForm({ cargo: "", tipoItemId: "", quantidade: "1", periodoMeses: "6" }); }}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <div className="flex flex-col gap-3">
              {regras.map((regra) => (
                <div key={regra.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 ${regra.ativo ? "border-gray-100" : "border-gray-200 opacity-60"}`}>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{regra.cargo} — {regra.tipoItemNome}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {regra.quantidade} peca(s) a cada {regra.periodoMeses} meses
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setRegraEditId(regra.id);
                        setRegraForm({
                          cargo: regra.cargo,
                          tipoItemId: String(regra.tipoItemId),
                          quantidade: String(regra.quantidade),
                          periodoMeses: String(regra.periodoMeses),
                        });
                      }}
                    >
                      Editar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => excluirRegra(regra.id)}>Excluir</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COLABORADORES */}
        {tab === "colaboradores" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-gray-900">Colaboradores</h2>
              <div className="flex gap-2 flex-wrap">
                <label className="relative">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportarColaboradores} className="sr-only" />
                  <Button variant="secondary" size="sm" loading={importando} type="button" onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement).click()}>
                    Importar Planilha
                  </Button>
                </label>
                <Button size="sm" onClick={() => { setShowColaboradorForm(true); setColaboradorEditId(null); setColaboradorForm({ matricula: "", cpf: "", nome: "", cargo: "", empresa: "", area: "", emailCorp: "" }); }}>
                  + Novo
                </Button>
              </div>
            </div>

            {colaboradoresMsg && <Alert type={colaboradoresMsg.includes("Erro") ? "error" : "success"} className="mb-4">{colaboradoresMsg}</Alert>}

            {showColaboradorForm && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">{colaboradorEditId ? "Editar Colaborador" : "Novo Colaborador"}</h3>
                <form onSubmit={handleColaboradorSubmit} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Matricula" value={colaboradorForm.matricula} onChange={(e) => setColaboradorForm((p) => ({ ...p, matricula: e.target.value }))} required />
                    <Input label="CPF (somente numeros)" value={colaboradorForm.cpf} onChange={(e) => setColaboradorForm((p) => ({ ...p, cpf: e.target.value }))} required />
                    <Input label="Nome" value={colaboradorForm.nome} onChange={(e) => setColaboradorForm((p) => ({ ...p, nome: e.target.value }))} required className="sm:col-span-2" />
                    <Input label="Cargo" value={colaboradorForm.cargo} onChange={(e) => setColaboradorForm((p) => ({ ...p, cargo: e.target.value }))} required />
                    <Input label="Empresa" value={colaboradorForm.empresa} onChange={(e) => setColaboradorForm((p) => ({ ...p, empresa: e.target.value }))} />
                    <Input label="Area" value={colaboradorForm.area} onChange={(e) => setColaboradorForm((p) => ({ ...p, area: e.target.value }))} />
                    <Input label="E-mail Corporativo" value={colaboradorForm.emailCorp} onChange={(e) => setColaboradorForm((p) => ({ ...p, emailCorp: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" loading={colaboradoresLoading}>{colaboradorEditId ? "Atualizar" : "Criar"}</Button>
                    <Button type="button" variant="secondary" onClick={() => { setShowColaboradorForm(false); setColaboradorEditId(null); }}>Cancelar</Button>
                  </div>
                </form>
              </div>
            )}

            <Input
              placeholder="Buscar por nome, matricula ou cargo..."
              value={colaboradorSearch}
              onChange={(e) => setColaboradorSearch(e.target.value)}
              className="mb-4"
            />

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Matricula</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Cargo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Empresa</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {colaboradoresFiltrados.map((c) => (
                    <tr key={c.id} className={`hover:bg-gray-50 ${!c.ativo ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.nome}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{c.matricula}</td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{c.cargo}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{c.empresa ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setColaboradorEditId(c.id);
                            setColaboradorForm({
                              matricula: c.matricula,
                              cpf: c.cpf,
                              nome: c.nome,
                              cargo: c.cargo,
                              empresa: c.empresa ?? "",
                              area: c.area ?? "",
                              emailCorp: c.emailCorp ?? "",
                            });
                            setShowColaboradorForm(true);
                          }}
                        >
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {colaboradoresFiltrados.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhum colaborador encontrado.</p>
              )}
            </div>
          </div>
        )}

        {/* PEDIDOS */}
        {tab === "pedidos" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pedidos</h2>
            {pedidosMsg && <Alert type={pedidosMsg.includes("Erro") ? "error" : "success"} className="mb-4">{pedidosMsg}</Alert>}

            <div className="flex flex-wrap gap-3 mb-4">
              <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="w-40">
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </Select>
              <Select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="w-40">
                <option value="">Todos os tipos</option>
                <option value="gratuito">Gratuito</option>
                <option value="adicional">Adicional</option>
              </Select>
            </div>

            <div className="flex flex-col gap-4">
              {pedidosAtivos.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
                  Nenhum pedido encontrado.
                </div>
              ) : (
                pedidosAtivos.map((pedido) => (
                  <div key={pedido.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">Pedido #{pedido.id}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[pedido.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABELS[pedido.status] ?? pedido.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">{pedido.tipo}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {pedido.colaboradorNome} — {pedido.colaboradorCargo} <span className="text-gray-400">(mat. {pedido.colaboradorMatricula})</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(pedido.createdAt)}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {pedido.status === "pendente" && (
                          <>
                            <Button size="sm" variant="success" onClick={() => atualizarStatusPedido(pedido.id, "aprovado")} loading={pedidosLoading}>
                              Aprovar
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => atualizarStatusPedido(pedido.id, "cancelado")} loading={pedidosLoading}>
                              Cancelar
                            </Button>
                          </>
                        )}
                        {pedido.status === "aprovado" && (
                          <>
                            <Button size="sm" onClick={() => atualizarStatusPedido(pedido.id, "entregue")} loading={pedidosLoading}>
                              Marcar Entregue
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => atualizarStatusPedido(pedido.id, "cancelado")} loading={pedidosLoading}>
                              Cancelar
                            </Button>
                          </>
                        )}
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
                    {pedido.observacao && <p className="mt-2 text-xs text-gray-500 italic">{pedido.observacao}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* HISTORICO */}
        {tab === "historico" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Historico de Entregas</h2>
            <div className="flex flex-col gap-4">
              {pedidosHistorico.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
                  Nenhuma entrega registrada.
                </div>
              ) : (
                pedidosHistorico.map((pedido) => (
                  <div key={pedido.id} className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">Pedido #{pedido.id}</span>
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-100 text-green-800">Entregue</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">{pedido.tipo}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {pedido.colaboradorNome} — {pedido.colaboradorCargo}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(pedido.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {pedido.itens.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0"></span>
                          <span>{item.tipoItemNome}</span>
                          <span className="text-gray-400">Tam. {item.tamanho}</span>
                          <span className="text-gray-400">x{item.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
