import type { SVGProps } from "react";

/**
 * O símbolo do Licença AI: uma grega em espiral escalonada, de geometria marajoara.
 * É a única fonte do desenho: o cabeçalho, a tela de entrada e o favicon (app/icon.tsx)
 * usam este componente. A cor vem de currentColor.
 */
export function Simbolo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4 20V4h16v16H9V9h6v6h-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="square" />
    </svg>
  );
}

const TAMANHOS = {
  normal: { selo: "size-7 rounded-md", simbolo: "size-4", nome: "text-[15px]" },
  grande: { selo: "size-12 rounded-xl", simbolo: "size-7", nome: "text-xl" },
};

/** O símbolo num selo da cor de acento, com o nome e, se pedido, a descrição do produto. */
export function Marca({ tamanho = "normal", descricao = false }: { tamanho?: keyof typeof TAMANHOS; descricao?: boolean }) {
  const t = TAMANHOS[tamanho];
  return (
    <span className="flex items-center gap-2.5">
      <span className={`grid shrink-0 place-items-center bg-acento text-sobre-acento ${t.selo}`}>
        <Simbolo className={t.simbolo} />
      </span>
      <span className="leading-tight">
        <span className={`block font-semibold tracking-tight ${t.nome}`}>Licença AI</span>
        {descricao && <span className="block text-sm text-suave">gerenciador de licenças auto-hospedado</span>}
      </span>
    </span>
  );
}
