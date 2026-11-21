"use client";
import { useActionState, type ReactNode } from "react";

/** Resultado de uma ação que o núcleo pode recusar: só volta com a recusa; o sucesso redireciona. */
export interface EstadoRecusavel {
  erro?: string;
}

/** Formulário de uma ação que o núcleo pode recusar: envia os campos ocultos e mostra a recusa, se houver. */
export function FormularioRecusavel({ acao, campos, className, children }: {
  acao: (estado: EstadoRecusavel, formulario: FormData) => Promise<EstadoRecusavel>;
  campos: Record<string, string>;
  className?: string;
  children: ReactNode;
}) {
  const [estado, despachar, enviando] = useActionState(acao, {});
  return (
    <form action={despachar} className={className}>
      {Object.entries(campos).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}
      <fieldset disabled={enviando}>{children}</fieldset>
      {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
    </form>
  );
}
