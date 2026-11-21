// Padrão de lista do painel: tabela com linhas que levam ao detalhe, barra de filtros
// e lista vazia com orientação. Funciona no servidor e no cliente.
import Link from "next/link";
import type { ReactNode } from "react";
import { classeBotao } from "./botoes";

export interface Coluna<T> {
  titulo: string;
  celula: (item: T) => ReactNode;
  /** Classes da coluna, no cabeçalho e nas células (por exemplo, "hidden sm:table-cell" para sumir no celular). */
  classe?: string;
}

/**
 * Tabela em que cada linha leva ao detalhe do item. O conteúdo da primeira coluna é o
 * link (o que o teclado alcança e o leitor de tela anuncia), esticado por cima da linha
 * inteira: clicar em qualquer ponto dela abre o detalhe, e o foco contorna a linha toda.
 * Por isso as células não devem ter outros links ou botões.
 */
export function Tabela<T>({ colunas, itens, chave, href, rotulo }: {
  colunas: [Coluna<T>, ...Coluna<T>[]];
  itens: T[];
  chave: (item: T) => string | number;
  href: (item: T) => string;
  /** Nome do link para o leitor de tela, quando a primeira célula sozinha não diz o que é a linha. */
  rotulo?: (item: T) => string;
}) {
  const [principal, ...demais] = colunas;
  return (
    <div className="animate-entrar overflow-x-auto rounded-xl border bg-superficie [animation-delay:60ms]">
      <table className="w-full text-sm">
        <thead className="bg-elevada/60 text-left text-xs text-suave">
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna.titulo} scope="col" className={`px-4 py-2.5 font-medium whitespace-nowrap ${coluna.classe ?? ""}`}>
                {coluna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borda">
          {itens.map((item) => (
            <tr key={chave(item)} className="group relative transition-colors duration-150 hover:bg-elevada/60">
              <td className={`px-4 py-3 ${principal.classe ?? ""}`}>
                <Link
                  href={href(item)}
                  aria-label={rotulo?.(item)}
                  className="outline-none group-hover:text-acento after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-acento"
                >
                  {principal.celula(item)}
                </Link>
              </td>
              {demais.map((coluna) => (
                <td key={coluna.titulo} className={`px-4 py-3 ${coluna.classe ?? ""}`}>{coluna.celula(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * No lugar de uma tabela vazia: diz o que aconteceu e o que fazer. Serve para a lista
 * sem nenhum item ("Nenhum Cliente ainda") e para o filtro sem resultado.
 */
export function EstadoVazio({ titulo, children, acao }: { titulo: string; children?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="grid animate-entrar justify-items-center gap-2 rounded-xl border border-dashed bg-superficie px-6 py-12 text-center [animation-delay:60ms]">
      <p className="text-base font-medium">{titulo}</p>
      {children && <p className="max-w-md text-sm leading-relaxed text-suave">{children}</p>}
      {acao && <div className="mt-3 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  );
}

/**
 * Filtros de uma lista: um formulário GET que põe os filtros na URL, como hoje. Os
 * controles vêm em `children`, com CLASSE_CAMPO; cada um precisa de rótulo (aria-label).
 */
export function BarraDeFiltros({ rotulo, botao = "Filtrar", children }: {
  rotulo: string;
  /** Texto do botão que envia: "Filtrar", ou "Buscar" numa busca. */
  botao?: string;
  children: ReactNode;
}) {
  return (
    <form role="search" aria-label={rotulo} className="flex animate-entrar flex-wrap items-center gap-2 [animation-delay:30ms]">
      {children}
      <button type="submit" className={classeBotao("secundario", "py-2")}>{botao}</button>
    </form>
  );
}
