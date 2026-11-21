"use client";
import { createContext, useActionState, useContext, type ReactNode } from "react";
import { trocarChave, type EstadoTrocaDeChave } from "../acoes";
import { ChaveExibida } from "../chave-exibida";

const TrocaDeChave = createContext<{
  despachar: (formulario: FormData) => void;
  enviando: boolean;
  estado: EstadoTrocaDeChave;
} | null>(null);

/**
 * Envolve o detalhe da Licença. Depois da Troca de chave, troca o detalhe inteiro
 * pela Chave nova, mostrada uma única vez: o detalhe ainda é o do prefixo antigo,
 * que deixou de existir, e as ações dele não valem mais.
 */
export function AreaDaTrocaDeChave({ children }: { children: ReactNode }) {
  const [estado, despachar, enviando] = useActionState(trocarChave, {});
  if (estado.trocada) {
    return <ChaveExibida titulo="Chave trocada" chave={estado.trocada.chave} prefixo={estado.trocada.prefixo} />;
  }
  return <TrocaDeChave.Provider value={{ despachar, enviando, estado }}>{children}</TrocaDeChave.Provider>;
}

/** Troca de chave com confirmação. Precisa estar dentro de AreaDaTrocaDeChave. */
export function FormularioTrocaDeChave({ prefixo }: { prefixo: string }) {
  const troca = useContext(TrocaDeChave);
  if (!troca) throw new Error("FormularioTrocaDeChave precisa estar dentro de AreaDaTrocaDeChave.");
  return (
    <form action={troca.despachar} className="acao-licenca">
      <input type="hidden" name="prefixo" value={prefixo} />
      <fieldset disabled={troca.enviando}>
        <label className="confirmacao">
          <input name="confirmacao" type="checkbox" value="sim" required />
          Entendo que a Chave atual deixa de valer na hora e que a nova será mostrada uma única vez.
        </label>
        <button type="submit">Trocar chave</button>
        <small>As Ativações, a data de validade e o histórico continuam os mesmos.</small>
      </fieldset>
      {troca.estado.erro && <p className="erro" role="alert">{troca.estado.erro}</p>}
    </form>
  );
}
