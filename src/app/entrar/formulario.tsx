"use client";
import { useActionState } from "react";
import { classeBotao } from "@/componentes/botoes";
import { entrarNoPainel } from "./acoes";

const CAMPO =
  "w-full rounded-lg bg-superficie px-3 py-2 text-base ring-1 ring-borda transition-shadow duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento";

export function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(entrarNoPainel, {});
  return (
    <form action={acao} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">
        Usuário
        <input name="usuario" autoComplete="username" required className={CAMPO} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Senha
        <input name="senha" type="password" autoComplete="current-password" required className={CAMPO} />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-perigo-suave px-3 py-2 text-sm text-perigo">{estado.erro}</p>
      )}
      <button type="submit" disabled={enviando} className={classeBotao("primario", "mt-1 py-2")}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
