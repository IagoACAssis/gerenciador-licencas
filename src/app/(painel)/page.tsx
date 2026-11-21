import type { Metadata } from "next";
import Link from "next/link";
import type { Licenca, ResumoInstancia } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { LICENCAS_A_VENCER } from "@/componentes/areas-do-painel";
import { classeBotao } from "@/componentes/botoes";
import { CLASSE_LINHA_COM_ACOES, EstadoVazio, TabelaComAcoes } from "@/componentes/lista";
import { CabecalhoDaPagina } from "@/componentes/pagina";
import { COR_DO_TOM, SeloDeEstado, situacaoDaLicenca } from "@/componentes/selo-de-estado";
import { contar, descreverPrazoDaLicenca, formatarDataHora, haQuantoTempo } from "./formatacao";
import { DialogoReativar, DialogoRenovar } from "./licencas/dialogos-de-ciclo-de-vida";
import { descreverEvento } from "./licencas/eventos";

export const metadata: Metadata = { title: "Início" };

export const dynamic = "force-dynamic";

/** A página inicial: o resumo da Instância. */
export default async function Inicio() {
  const resumo = await nucleoDaInstancia().resumirInstancia();
  const agora = new Date();

  // Sem Produto não há Licença: a Instância nova começa por ele.
  if (resumo.contagens.produtos === 0) {
    return (
      <div className="grid gap-10">
        <CabecalhoDaPagina titulo={TITULO} descricao={DESCRICAO} />
        <section className="grid max-w-xl animate-entrar justify-items-start gap-3 rounded-xl border border-dashed p-8 [animation-delay:60ms]">
          <h2 className="text-lg font-semibold tracking-tight">Comece pelo primeiro Produto</h2>
          <p className="text-sm leading-relaxed text-suave">
            Nenhum Produto cadastrado ainda. Cadastre o primeiro Produto, depois os Clientes, e emita as Licenças deles.
          </p>
          <Link href="/produtos/novo" className={classeBotao("primario", "mt-2")}>Cadastrar Produto</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <CabecalhoDaPagina
        titulo={TITULO}
        descricao={DESCRICAO}
        acoes={
          <>
            <Link href="/clientes/novo" className={classeBotao("secundario")}>Cadastrar Cliente</Link>
            <Link href="/licencas/nova" className={classeBotao("primario")}>Emitir Licença</Link>
          </>
        }
      />
      <Contagens resumo={resumo} />
      <PedemAtencao licencas={resumo.pedemAtencao} agora={agora} />
      <div className="grid animate-entrar gap-8 [animation-delay:180ms] lg:grid-cols-2">
        <AtividadeRecente atividade={resumo.atividadeRecente} agora={agora} />
        <LicencasPorProduto porProduto={resumo.porProduto} />
      </div>
    </div>
  );
}

const TITULO = "Visão geral";
const DESCRICAO = "Licenças, Clientes e Produtos desta Instância.";

const CLASSE_CARTAO = "rounded-xl border bg-superficie p-5";

function Contagens({ resumo }: { resumo: ResumoInstancia }) {
  const { contagens } = resumo;
  return (
    <div className="grid animate-entrar gap-4 [animation-delay:60ms] sm:grid-cols-2 lg:grid-cols-4">
      <div className={`${CLASSE_CARTAO} sm:col-span-2`}>
        <div className="flex flex-wrap justify-between gap-2 text-sm text-suave">
          Licenças
          <Link href="/licencas" className="group rounded-md hover:text-tinta">
            Ver todas{" "}
            <span aria-hidden="true" className="inline-block transition-transform duration-150 group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <span className="text-5xl font-semibold tracking-tight tabular-nums">{contagens.licencas}</span>
          <span className="text-sm text-suave tabular-nums">
            {contar(contagens.licencasAtivas, "Ativa", "Ativas")}
          </span>
        </div>
        <BarraDeSituacoes porSituacao={resumo.porSituacao} />
      </div>
      <CartaoComAtalho rotulo="Produtos" valor={contagens.produtos} href="/produtos" />
      <CartaoComAtalho rotulo="Clientes" valor={contagens.clientes} href="/clientes" />
    </div>
  );
}

function CartaoComAtalho({ rotulo, valor, href }: { rotulo: string; valor: number; href: string }) {
  return (
    <Link
      href={href}
      className={`group ${CLASSE_CARTAO} transition duration-200 hover:-translate-y-0.5 hover:border-acento/50 hover:shadow-lg`}
    >
      <span className="flex justify-between text-sm text-suave">
        {rotulo}
        <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-1">→</span>
      </span>
      <span className="mt-2 block text-5xl font-semibold tracking-tight tabular-nums">{valor}</span>
    </Link>
  );
}

/**
 * As fatias da barra, cada uma com o tom que o selo dá a uma Licença dela: a decisão
 * de tom continua no SeloDeEstado.
 */
const SITUACOES = [
  { chave: "ativas", rotulo: "Em dia", exemplo: { estado: "Ativa", aVencer: false, emCarencia: false } },
  { chave: "pedemAtencao", rotulo: "Pedem atenção", exemplo: { estado: "Ativa", aVencer: true, emCarencia: false } },
  { chave: "expiradas", rotulo: "Expiradas", exemplo: { estado: "Expirada", aVencer: false, emCarencia: false } },
  { chave: "revogadas", rotulo: "Revogadas", exemplo: { estado: "Revogada", aVencer: false, emCarencia: false } },
] as const satisfies readonly {
  chave: keyof ResumoInstancia["porSituacao"];
  rotulo: string;
  exemplo: Parameters<typeof situacaoDaLicenca>[0];
}[];

function BarraDeSituacoes({ porSituacao }: { porSituacao: ResumoInstancia["porSituacao"] }) {
  const fatias = SITUACOES.map((situacao) => ({
    ...situacao,
    quantidade: porSituacao[situacao.chave],
    cor: COR_DO_TOM[situacaoDaLicenca(situacao.exemplo).tom],
  }));
  return (
    <div className="mt-4 grid gap-2">
      {/* A legenda abaixo diz o mesmo em texto. */}
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-elevada" aria-hidden="true">
        {fatias.map(
          (fatia) => fatia.quantidade > 0 && <span key={fatia.chave} className={fatia.cor} style={{ flex: fatia.quantidade }} />,
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
        {fatias.map((fatia) => (
          <li key={fatia.chave} className="inline-flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${fatia.cor}`} aria-hidden="true" />
            {fatia.rotulo} <span className="tabular-nums">{fatia.quantidade}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PedemAtencao({ licencas, agora }: { licencas: Licenca[]; agora: Date }) {
  return (
    <section className="animate-entrar [animation-delay:120ms]" aria-labelledby="atencao-titulo">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="atencao-titulo" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          Pede atenção
          {licencas.length > 0 && (
            <span className="rounded-full bg-alerta-suave px-2 text-xs font-medium text-alerta tabular-nums">{licencas.length}</span>
          )}
        </h2>
        <Link href={LICENCAS_A_VENCER} className="rounded-md text-sm text-acento hover:underline">
          Ver todas a vencer →
        </Link>
      </div>
      {licencas.length === 0 ? (
        <EstadoVazio titulo="Tudo em ordem" compacto>
          Nenhuma Licença a vencer, em Carência ou Suspensa.
        </EstadoVazio>
      ) : (
        <TabelaComAcoes colunas={["Licença", "Cliente", "Produto", "Estado", "Prazo"]} acao="Ação">
          {licencas.map((licenca) => (
            <tr key={licenca.prefixo} className={CLASSE_LINHA_COM_ACOES}>
              <td className="px-4 py-3 whitespace-nowrap">
                <Link href={`/licencas/${licenca.prefixo}`} className="rounded-md font-mono text-[13px] hover:text-acento">
                  {licenca.prefixo}…
                </Link>
              </td>
              <td className="px-4 py-3 font-medium">
                <Link href={`/clientes/${licenca.cliente.id}`} className="rounded-md hover:text-acento">
                  {licenca.cliente.nome}
                </Link>
              </td>
              <td className="px-4 py-3 text-suave">{licenca.produto.nome}</td>
              <td className="px-4 py-3"><SeloDeEstado licenca={licenca} /></td>
              <td className="px-4 py-3 whitespace-nowrap text-suave">
                {descreverPrazoDaLicenca(licenca, agora, { prazoDaSuspensa: true })}
              </td>
              <td className="px-4 py-3 text-right">
                {licenca.estado === "Suspensa" ? (
                  <DialogoReativar prefixo={licenca.prefixo} />
                ) : (
                  // Em Carência e a vencer sempre têm data de validade.
                  licenca.validaAte && (
                    <DialogoRenovar prefixo={licenca.prefixo} validaAte={licenca.validaAte} estilo="secundario" />
                  )
                )}
              </td>
            </tr>
          ))}
        </TabelaComAcoes>
      )}
    </section>
  );
}

function AtividadeRecente({ atividade, agora }: { atividade: ResumoInstancia["atividadeRecente"]; agora: Date }) {
  return (
    <section aria-labelledby="atividade-titulo">
      <h2 id="atividade-titulo" className="mb-3 text-lg font-semibold tracking-tight">Atividade recente</h2>
      {atividade.length === 0 ? (
        <EstadoVazio titulo="Nenhuma atividade ainda" compacto />
      ) : (
        <ol className="divide-y divide-borda overflow-hidden rounded-xl border bg-superficie">
          {atividade.map(({ evento, licenca }, i) => (
            <li key={i}>
              <Link
                href={`/licencas/${licenca.prefixo}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 focus-visible:-outline-offset-2 hover:bg-elevada/50"
              >
                <time
                  dateTime={evento.ocorridoEm.toISOString()}
                  title={formatarDataHora(evento.ocorridoEm)}
                  className="w-20 shrink-0 text-xs text-suave"
                >
                  {haQuantoTempo(evento.ocorridoEm, agora)}
                </time>
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{descreverEvento(evento).nome}</span>
                  <span className="text-suave"> · {licenca.cliente.nome}</span>
                </span>
                <code className="shrink-0 font-mono text-xs text-suave">{licenca.prefixo}…</code>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function LicencasPorProduto({ porProduto }: { porProduto: ResumoInstancia["porProduto"] }) {
  const maior = Math.max(1, ...porProduto.map((produto) => produto.licencas));
  return (
    <section aria-labelledby="por-produto-titulo">
      <h2 id="por-produto-titulo" className="mb-3 text-lg font-semibold tracking-tight">Licenças por Produto</h2>
      <ul className="grid gap-4 rounded-xl border bg-superficie p-5">
        {porProduto.map((produto) => (
          <li key={produto.identificador}>
            <Link href={`/produtos/${produto.identificador}`} className="group grid gap-1.5 rounded-md text-sm">
              <span className="flex justify-between gap-3">
                <span className="truncate group-hover:text-acento">{produto.nome}</span>
                <span className="text-suave tabular-nums">{produto.licencas}</span>
              </span>
              <span className="h-2 rounded-full bg-elevada" aria-hidden="true">
                <span
                  className="block h-2 rounded-full bg-acento transition-[width] duration-500"
                  style={{ width: `${(produto.licencas / maior) * 100}%` }}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
