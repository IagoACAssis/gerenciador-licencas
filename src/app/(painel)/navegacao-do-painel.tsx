"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { classeDoSublinhado } from "@/componentes/abas";
import { AREAS_DO_PAINEL } from "@/componentes/areas-do-painel";

function abaAtual(caminho: string, href: string): boolean {
  return href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
}

/** As abas da barra do topo, com a atual destacada. No celular, rolam na horizontal. */
export function NavegacaoDoPainel() {
  const caminho = usePathname();
  return (
    <nav aria-label="Painel" className="-mb-px flex gap-1 overflow-x-auto px-2 [scrollbar-width:none] md:px-6">
      {AREAS_DO_PAINEL.map((aba) => {
        const atual = abaAtual(caminho, aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={atual ? "page" : undefined}
            className={`relative shrink-0 rounded-md px-3 py-3 text-sm whitespace-nowrap transition-colors duration-150 focus-visible:-outline-offset-2 ${
              atual ? "font-medium text-tinta" : "text-suave hover:text-tinta"
            }`}
          >
            {aba.rotulo}
            <span aria-hidden="true" className={`inset-x-3 ${classeDoSublinhado(atual)}`} />
          </Link>
        );
      })}
    </nav>
  );
}
