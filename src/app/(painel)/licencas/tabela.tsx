import type { Licenca } from "@/nucleo";
import { Tabela, type Coluna } from "@/componentes/lista";
import { SeloDeEstado } from "@/componentes/selo-de-estado";
import { descreverPrazoDaLicenca, formatarValidade } from "../formatacao";

/** Licenças numa tabela: prefixo, Cliente, Produto, estado e prazo. Cada linha leva ao detalhe. */
export function TabelaLicencas({ licencas, semCliente = false }: { licencas: Licenca[]; semCliente?: boolean }) {
  const agora = new Date();
  const colunas: [Coluna<Licenca>, ...Coluna<Licenca>[]] = [
    { titulo: "Licença", celula: (l) => <span className="font-mono text-[13px] whitespace-nowrap">{l.prefixo}…</span> },
    ...(semCliente ? [] : [{ titulo: "Cliente", celula: (l: Licenca) => <span className="font-medium">{l.cliente.nome}</span> }]),
    { titulo: "Produto", celula: (l) => <span className="text-suave">{l.produto.nome}</span> },
    { titulo: "Estado", celula: (l) => <SeloDeEstado licenca={l} /> },
    {
      titulo: "Prazo",
      classe: "whitespace-nowrap",
      celula: (l) => (
        <>
          <span>{descreverPrazoDaLicenca(l, agora)}</span>
          {l.validaAte && <span className="block text-xs text-suave tabular-nums">{formatarValidade(l.validaAte)}</span>}
        </>
      ),
    },
  ];
  return (
    <Tabela
      colunas={colunas}
      itens={licencas}
      chave={(l) => l.prefixo}
      href={(l) => `/licencas/${l.prefixo}`}
      rotulo={(l) => `Licença ${l.prefixo}…, ${l.cliente.nome}, ${l.produto.nome}`}
    />
  );
}
