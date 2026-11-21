import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Produto } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { Abas } from "@/componentes/abas";
import { BotaoCopiar } from "@/componentes/botao-copiar";
import { classeBotao } from "@/componentes/botoes";
import { DialogoDeConfirmacao } from "@/componentes/dialogo-de-confirmacao";
import { FaixaDeFatos, LinkDeVolta, type Fato } from "@/componentes/pagina";
import { contar, formatarData } from "../../formatacao";
import { excluirProduto } from "../../excluidos/acoes";
import { editarProduto } from "../acoes";
import { FormularioProduto } from "../formulario-produto";

export const dynamic = "force-dynamic";

/** Uma consulta só por requisição, para o título e para a página. */
const obterProduto = cache((identificador: string) => nucleoDaInstancia().obterProduto(identificador));

export async function generateMetadata({ params }: { params: Promise<{ identificador: string }> }): Promise<Metadata> {
  const produto = await obterProduto((await params).identificador);
  // Item inexistente: o título vem do not-found.tsx, como a página.
  if (!produto) notFound();
  return { title: produto.nome };
}

const DESCRICAO_DA_EXCLUSAO =
  "Para um Produto cadastrado por engano. Ele e as Licenças dele saem das listas, e a Validação com o identificador dele passa a responder 404. Não é possível com Licença Ativa ou Suspensa. A restauração, em Excluídos, o devolve como estava.";

export default async function DetalheProduto({ params }: { params: Promise<{ identificador: string }> }) {
  const { identificador } = await params;
  const produto = await obterProduto(identificador);
  if (!produto) notFound();

  return (
    <div className="grid gap-8">
      <LinkDeVolta href="/produtos">Produtos</LinkDeVolta>

      <div className="flex animate-entrar flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-suave">Produto</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{produto.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="font-mono text-sm break-all text-suave">{produto.identificador}</code>
            <BotaoCopiar texto={produto.identificador} rotulo="Copiar identificador" />
          </div>
          {produto.descricao && <p className="mt-3 max-w-2xl text-sm leading-relaxed whitespace-pre-line">{produto.descricao}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/licencas/nova?produto=${produto.identificador}`} className={classeBotao("primario")}>Emitir Licença</Link>
          <DialogoDeConfirmacao
            rotulo="Excluir"
            estilo="perigoContorno"
            titulo="Excluir este Produto?"
            descricao={DESCRICAO_DA_EXCLUSAO}
            confirmar="Excluir Produto"
            perigoso
            acao={excluirProduto}
            campos={{ identificador: produto.identificador }}
          />
        </div>
      </div>

      <FatosDoProduto produto={produto} />

      <div className="animate-entrar [animation-delay:120ms]">
        <Abas
          rotulo="Seções do Produto"
          abas={[
            { id: "embutir", rotulo: "Para embutir no Produto", conteudo: <ParaEmbutir produto={produto} /> },
            { id: "edicao", rotulo: "Editar", conteudo: <EdicaoDoProduto produto={produto} /> },
          ]}
        />
      </div>
    </div>
  );
}

function FatosDoProduto({ produto }: { produto: Produto }) {
  const { regras } = produto;
  const fatos: Fato[] = [
    {
      rotulo: "Licenças",
      valor: (
        <Link href={`/licencas?produto=${produto.identificador}`} className="tabular-nums hover:text-acento">
          {produto.licencas}
        </Link>
      ),
      detalhe: `cadastrado em ${formatarData(produto.cadastradoEm)}`,
    },
    {
      rotulo: "Janela de aviso",
      valor: contar(regras.janelaAvisoDias, "dia", "dias"),
      detalhe: "antes da data de validade",
    },
    {
      rotulo: "Carência",
      valor: contar(regras.carenciaDias, "dia", "dias"),
      detalhe: "depois da data de validade",
    },
    {
      rotulo: "Limite de ativações padrão",
      valor: regras.limiteAtivacoesPadrao,
      detalhe: "para Licença sem limite próprio",
    },
    {
      rotulo: "Cota de substituições",
      valor: contar(regras.cotaSubstituicoes.quantidade, "substituição", "substituições"),
      detalhe: `nos últimos ${contar(regras.cotaSubstituicoes.dias, "dia", "dias")}`,
    },
    {
      rotulo: "Tolerância offline",
      valor: contar(regras.toleranciaOfflineDias, "dia", "dias"),
      detalhe: "sem nova Validação",
    },
  ];
  return <FaixaDeFatos fatos={fatos} colunas="sm:grid-cols-2 lg:grid-cols-3" />;
}

/** O que o Produto embute: o identificador público e a chave pública. A chave privada nunca sai do núcleo. */
function ParaEmbutir({ produto }: { produto: Produto }) {
  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-sm leading-relaxed text-suave">
        O Produto envia o identificador público na Validação e confere a Resposta assinada com a chave pública.
      </p>
      <section className="grid gap-2" aria-labelledby="identificador-titulo">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="identificador-titulo" className="text-sm font-medium">Identificador público</h2>
          <BotaoCopiar texto={produto.identificador} rotulo="Copiar identificador" />
        </div>
        <code className="block rounded-xl bg-elevada px-4 py-3 font-mono text-sm break-all select-all">{produto.identificador}</code>
      </section>
      <section className="grid gap-2" aria-labelledby="chave-publica-titulo">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="chave-publica-titulo" className="text-sm font-medium">Chave pública (Ed25519, PEM)</h2>
          <BotaoCopiar texto={produto.chavePublica} rotulo="Copiar chave pública" />
        </div>
        <pre className="overflow-x-auto rounded-xl bg-elevada px-4 py-3 font-mono text-[13px] leading-relaxed select-all">{produto.chavePublica}</pre>
      </section>
    </div>
  );
}

function EdicaoDoProduto({ produto }: { produto: Produto }) {
  const { regras } = produto;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-suave">Mudanças nas regras valem na hora para todas as Licenças do Produto.</p>
      <FormularioProduto
        acao={editarProduto.bind(null, produto.identificador)}
        rotuloBotao="Salvar"
        valoresIniciais={{
          nome: produto.nome,
          descricao: produto.descricao,
          janelaAvisoDias: String(regras.janelaAvisoDias),
          carenciaDias: String(regras.carenciaDias),
          limiteAtivacoesPadrao: String(regras.limiteAtivacoesPadrao),
          cotaSubstituicoesQuantidade: String(regras.cotaSubstituicoes.quantidade),
          cotaSubstituicoesDias: String(regras.cotaSubstituicoes.dias),
          toleranciaOfflineDias: String(regras.toleranciaOfflineDias),
        }}
      />
    </div>
  );
}
