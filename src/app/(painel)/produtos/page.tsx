import type { Metadata } from "next";
import Link from "next/link";
import type { Produto } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { classeBotao } from "@/componentes/botoes";
import { EstadoVazio, Tabela } from "@/componentes/lista";
import { CabecalhoDaPagina } from "@/componentes/pagina";
import { contar } from "../formatacao";

export const metadata: Metadata = { title: "Produtos" };

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const produtos = await nucleoDaInstancia().listarProdutos();
  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina
        titulo="Produtos"
        descricao="Cada Produto tem as próprias regras e o próprio par de chaves de assinatura."
        acoes={<Link href="/produtos/novo" className={classeBotao("primario")}>Cadastrar Produto</Link>}
      />
      {produtos.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum Produto ainda"
          acao={<Link href="/produtos/novo" className={classeBotao("primario")}>Cadastrar Produto</Link>}
        >
          Cadastre o primeiro Produto. A Instância gera o identificador público e a chave pública que você embute nele.
        </EstadoVazio>
      ) : (
        <Tabela<Produto>
          colunas={[
            { titulo: "Nome", celula: (p) => <span className="font-medium">{p.nome}</span> },
            {
              titulo: "Identificador público",
              classe: "hidden sm:table-cell",
              celula: (p) => <code className="font-mono text-[13px] text-suave">{p.identificador}</code>,
            },
            { titulo: "Licenças", classe: "text-right tabular-nums", celula: (p) => p.licencas },
          ]}
          itens={produtos}
          chave={(p) => p.identificador}
          href={(p) => `/produtos/${p.identificador}`}
          rotulo={(p) => `${p.nome}, ${contar(p.licencas, "Licença", "Licenças")}`}
        />
      )}
    </div>
  );
}
