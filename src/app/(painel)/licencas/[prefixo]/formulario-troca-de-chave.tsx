"use client";
import { useActionState } from "react";
import { trocarChave } from "../acoes";
import { ChaveExibida } from "../chave-exibida";

/** Troca de chave com confirmação; depois dela, mostra a Chave nova uma única vez. */
export function FormularioTrocaDeChave({ prefixo }: { prefixo: string }) {
  const [estado, despachar, enviando] = useActionState(trocarChave, {});
  if (estado.trocada) {
    return <ChaveExibida titulo="Chave trocada" chave={estado.trocada.chave} prefixo={estado.trocada.prefixo} />;
  }
  return (
    <form action={despachar} className="acao-licenca">
      <input type="hidden" name="prefixo" value={prefixo} />
      <fieldset disabled={enviando}>
        <label className="confirmacao">
          <input name="confirmacao" type="checkbox" value="sim" required />
          Entendo que a Chave atual deixa de valer na hora e que a nova será mostrada uma única vez.
        </label>
        <button type="submit">Trocar chave</button>
        <small>As Ativações, a data de validade e o histórico continuam os mesmos.</small>
      </fieldset>
      {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
    </form>
  );
}
