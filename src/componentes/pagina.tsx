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
