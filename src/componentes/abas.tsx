"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * O sublinhado da aba atual, que cresce do centro quando ela passa a ser a atual. Fica num
 * `<span>` dentro da aba (com `relative`); quem usa diz a largura com `inset-x-*`. Também
 * serve à navegação do topo do painel.
 */
export function classeDoSublinhado(atual: boolean): string {
  return `absolute bottom-0 h-0.5 rounded-full bg-acento transition-transform duration-200 ${atual ? "scale-x-100" : "scale-x-0"}`;
}

export interface Aba {
  /** Identifica a aba dentro do grupo; vira parte do id do elemento. */
  id: string;
  rotulo: ReactNode;
  conteudo: ReactNode;
}

/**
 * Abas acessíveis (tablist, tab e tabpanel): setas, Home e End trocam de aba, e só a
 * aba atual entra na ordem do Tab. Os painéis ficam todos montados, só escondidos, para
 * não perder o que estiver aberto num deles (um diálogo, por exemplo).
 */
export function Abas({ abas, rotulo }: { abas: Aba[]; rotulo: string }) {
  const [atual, setAtual] = useState(0);
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const base = useId();
  const idDaAba = (aba: Aba) => `${base}-aba-${aba.id}`;
  const idDoPainel = (aba: Aba) => `${base}-painel-${aba.id}`;

  function navegar(evento: KeyboardEvent, indice: number) {
    const ultima = abas.length - 1;
    const destino = {
      ArrowRight: indice === ultima ? 0 : indice + 1,
      ArrowLeft: indice === 0 ? ultima : indice - 1,
      Home: 0,
      End: ultima,
    }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    setAtual(destino);
    botoes.current[destino]?.focus();
  }

  return (
    <div>
      <div role="tablist" aria-label={rotulo} className="flex gap-6 overflow-x-auto border-b [scrollbar-width:none]">
        {abas.map((aba, indice) => {
          const selecionada = indice === atual;
          return (
            <button
              key={aba.id}
              ref={(botao) => {
                botoes.current[indice] = botao;
              }}
              type="button"
              role="tab"
              id={idDaAba(aba)}
              aria-selected={selecionada}
              aria-controls={idDoPainel(aba)}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => setAtual(indice)}
              onKeyDown={(evento) => navegar(evento, indice)}
              className={`relative shrink-0 py-3 text-sm whitespace-nowrap transition-colors duration-150 focus-visible:-outline-offset-2 ${
                selecionada ? "font-medium text-tinta" : "text-suave hover:text-tinta"
              }`}
            >
              {aba.rotulo}
              <span aria-hidden="true" className={`inset-x-0 ${classeDoSublinhado(selecionada)}`} />
            </button>
          );
        })}
      </div>
      {abas.map((aba, indice) => (
        <div
          key={aba.id}
          role="tabpanel"
          id={idDoPainel(aba)}
          aria-labelledby={idDaAba(aba)}
          tabIndex={0}
          hidden={indice !== atual}
          className="animate-entrar pt-6 focus-visible:outline-offset-4"
        >
          {aba.conteudo}
        </div>
      ))}
    </div>
  );
}
