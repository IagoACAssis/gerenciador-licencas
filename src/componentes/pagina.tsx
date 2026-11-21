import Link from "next/link";
import type { ReactNode } from "react";

/** Link de volta para a página de cima ("← Licenças"), no alto das páginas de detalhe e de formulário. */
export function LinkDeVolta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex w-fit items-center gap-1 rounded-md text-sm text-suave hover:text-tinta">
      <span aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-x-0.5">←</span> {children}
    </Link>
  );
}

/** Título da página, com uma linha de descrição e, à direita, as ações principais (por exemplo, "Emitir Licença"). */
export function CabecalhoDaPagina({ titulo, descricao, acoes }: { titulo: string; descricao?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="flex animate-entrar flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
        {descricao && <p className="mt-1 text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export interface Fato {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
}

/**
 * A faixa de fatos de uma página de detalhe (Licença, Produto, Cliente): o essencial em
 * células lado a lado, uma embaixo da outra no celular. `colunas` diz quantas por linha a
 * partir do celular (por exemplo, "sm:grid-cols-2 lg:grid-cols-4"); escolha uma divisão
 * que feche as linhas, porque o fio entre as células é o fundo da faixa aparecendo.
 */
export function FaixaDeFatos({ fatos, colunas }: { fatos: Fato[]; colunas: string }) {
  return (
    <dl className={`grid animate-entrar gap-px overflow-hidden rounded-xl border bg-borda [animation-delay:60ms] ${colunas}`}>
      {fatos.map((fato) => (
        <div key={fato.rotulo} className="min-w-0 bg-superficie p-5">
          <dt className="text-xs text-suave">{fato.rotulo}</dt>
          <dd className="mt-1 truncate text-lg font-medium">{fato.valor}</dd>
          {fato.detalhe && <dd className="truncate text-xs text-suave">{fato.detalhe}</dd>}
        </div>
      ))}
    </dl>
  );
}
