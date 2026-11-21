"use client";
import { useActionState } from "react";
import { classeBotao } from "@/componentes/botoes";
import { CLASSE_CAMPO, CLASSE_ROTULO } from "@/componentes/campos";
import { entrarNoPainel } from "./acoes";

const CAMPO = `w-full ${CLASSE_CAMPO}`;

export function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(entrarNoPainel, {});
  return (
    <form action={acao} className="grid gap-4">
      <label className={CLASSE_ROTULO}>
        Usuário
        <input name="usuario" autoComplete="username" required className={CAMPO} />
      </label>
      <label className={CLASSE_ROTULO}>
        Senha
        <input name="senha" type="password" autoComplete="current-password" required className={CAMPO} />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-perigo-suave px-3 py-2 text-sm text-perigo">{estado.erro}</p>
      )}
      <button type="submit" disabled={enviando} className={classeBotao("primario", "mt-1")}>
        Entrar
      </button>
    </form>
  );
}
