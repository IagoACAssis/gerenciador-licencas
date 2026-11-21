"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { href: "/", rotulo: "Início" },
  { href: "/produtos", rotulo: "Produtos" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/licencas", rotulo: "Licenças" },
  { href: "/excluidos", rotulo: "Excluídos" },
];

function abaAtual(caminho: string, href: string): boolean {
  return href === "/" ? caminho === "/" : caminho === href || caminho.startsWith(`${href}/`);
}

/** As abas da barra do topo, com a atual destacada. No celular, rolam na horizontal. */
export function Abas() {
  const caminho = usePathname();
  return (
    <nav aria-label="Painel" className="-mb-px flex gap-1 overflow-x-auto px-2 [scrollbar-width:none] md:px-6">
      {ABAS.map((aba) => {
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
            <span
              aria-hidden="true"
              className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-acento transition-transform duration-200 ${
                atual ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
