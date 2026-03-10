"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { formatCPF } from "@/lib/utils";

export default function ColaboradorLoginPage() {
  const router = useRouter();
  const [matricula, setMatricula] = useState("");
  const [cpfDigits, setCpfDigits] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarCpf, setMostrarCpf] = useState(false);

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setCpfDigits(digits);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/colaborador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, cpf: cpfDigits }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao fazer login.");
        return;
      }
      router.push("/colaborador/portal");
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-5 flex justify-center mb-3 w-full">
            <Image
              src="/logo-venancio.png"
              alt="Venancio"
              width={180}
              height={48}
              priority
              className="h-12 w-auto"
            />
          </div>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-200 mb-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Portal do Colaborador</h1>
          <p className="text-gray-500 text-sm mt-1">Informe seus dados funcionais</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <Alert type="error">{error}</Alert>}

            <Input
              label="Matricula Funcional"
              placeholder="Ex: 00001"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              required
              autoFocus
              autoComplete="off"
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">CPF <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={mostrarCpf ? "text" : "password"}
                  placeholder="000.000.000-00"
                  value={mostrarCpf ? formatCPF(cpfDigits) : cpfDigits}
                  onChange={handleCpfChange}
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 pr-20 text-sm text-gray-900 bg-white placeholder:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setMostrarCpf((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-red-600 hover:text-red-800 transition-colors pointer-events-auto"
                >
                  {mostrarCpf ? "Ocultar" : "Exibir"}
                </button>
              </div>
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
