"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { escolherTema, EVENTO_TEMA, lerEscolhaDeTema, type EscolhaDeTema } from "./tema";

function acompanharEscolha(avisar: () => void) {
  window.addEventListener(EVENTO_TEMA, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO_TEMA, avisar);
    window.removeEventListener("storage", avisar);
  };
}

const traco = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const OPCOES: { valor: EscolhaDeTema; rotulo: string; icone: ReactNode }[] = [
  {
    valor: "claro",
    rotulo: "Claro",
    icone: (
      <>
        <circle cx="12" cy="12" r="4" {...traco} />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" {...traco} />
      </>
    ),
  },
  {
    valor: "escuro",
    rotulo: "Escuro",
    icone: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" {...traco} />,
  },
  {
    valor: "sistema",
    rotulo: "Sistema",
    icone: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" {...traco} />
        <path d="M8 20h8M12 16v4" {...traco} />
      </>
    ),
  },
];

/**
 * Claro, Escuro ou Sistema, como um grupo de opções nativo: as setas trocam a
 * escolha e o leitor de tela anuncia o grupo. A escolha fica no navegador.
 */
export function SeletorDeTema() {
  // No servidor não há escolha guardada: "sistema" até hidratar, sem aviso de hidratação.
  const escolha = useSyncExternalStore(acompanharEscolha, lerEscolhaDeTema, () => "sistema" as const);
  return (
    <fieldset role="radiogroup" aria-label="Tema" className="inline-flex rounded-lg bg-elevada p-0.5">
      {OPCOES.map((opcao) => (
        <label
          key={opcao.valor}
          title={opcao.rotulo}
          className="relative grid size-7 cursor-pointer place-items-center rounded-md text-suave transition-colors duration-150 hover:text-tinta has-checked:bg-superficie has-checked:text-tinta has-checked:shadow-sm has-checked:ring-1 has-checked:ring-borda has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-acento"
        >
          <input
            type="radio"
            name="tema"
            value={opcao.valor}
            aria-label={opcao.rotulo}
            checked={escolha === opcao.valor}
            onChange={() => escolherTema(opcao.valor)}
            className="sr-only"
          />
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">{opcao.icone}</svg>
        </label>
      ))}
    </fieldset>
  );
}
