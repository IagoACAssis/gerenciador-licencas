"use client";
import { useActionState } from "react";
import { entrarNoPainel } from "./acoes";

export function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(entrarNoPainel, {});
  return (
    <form className="entrada" action={acao}>
      <h1>Entrar</h1>
      <label>
        Usuário
        <input name="usuario" autoComplete="username" required />
      </label>
      <label>
        Senha
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
      <button type="submit" disabled={enviando}>Entrar</button>
    </form>
  );
}
