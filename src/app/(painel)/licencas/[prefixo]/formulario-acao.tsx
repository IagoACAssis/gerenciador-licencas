"use client";
import type { ReactNode } from "react";
import type { EstadoAcaoNaLicenca } from "../acoes";
import { FormularioRecusavel } from "../../formulario-recusavel";

/** Formulário de uma ação de ciclo de vida: envia o prefixo e mostra a recusa do núcleo, se houver. */
export function FormularioAcao({ acao, prefixo, children }: {
  acao: (estado: EstadoAcaoNaLicenca, formulario: FormData) => Promise<EstadoAcaoNaLicenca>;
  prefixo: string;
  children: ReactNode;
}) {
  return <FormularioRecusavel acao={acao} campos={{ prefixo }} className="acao">{children}</FormularioRecusavel>;
}
