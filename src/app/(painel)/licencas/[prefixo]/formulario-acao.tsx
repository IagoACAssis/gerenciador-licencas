"use client";
import { useActionState, type ReactNode } from "react";
import type { EstadoAcaoNaLicenca } from "../acoes";

/** Formulário de uma ação de ciclo de vida: envia o prefixo e mostra a recusa do núcleo, se houver. */
export function FormularioAcao({ acao, prefixo, children }: {
  acao: (estado: EstadoAcaoNaLicenca, formulario: FormData) => Promise<EstadoAcaoNaLicenca>;
  prefixo: string;
  children: ReactNode;
}) {
  const [estado, despachar, enviando] = useActionState(acao, {});
  return (
    <form action={despachar} className="acao-licenca">
      <input type="hidden" name="prefixo" value={prefixo} />
      <fieldset disabled={enviando}>{children}</fieldset>
      {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
    </form>
  );
}
