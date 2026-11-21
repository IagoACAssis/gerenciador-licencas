import type { Metadata } from "next";
import Link from "next/link";
import { cache, type ReactNode } from "react";
import { notFound } from "next/navigation";
import type { DetalheLicenca } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { Abas } from "@/componentes/abas";
import { BotaoCopiar } from "@/componentes/botao-copiar";
import { CLASSE_AJUDA, CLASSE_CAMPO, CLASSE_ROTULO } from "@/componentes/campos";
import { DialogoDeConfirmacao } from "@/componentes/dialogo-de-confirmacao";
import { SeloDeEstado } from "@/componentes/selo-de-estado";
import { descreverPrazo, formatarDataHora, formatarValidade, haQuantoTempo } from "../../formatacao";
import {
  alterarLimiteDeAtivacoes,
  removerAtivacao,
  revogarLicenca,
  suspenderLicenca,
  zerarContagemDeSubstituicoes,
} from "../acoes";
import { DialogoReativar, DialogoRenovar } from "../dialogos-de-ciclo-de-vida";
import { descreverEvento } from "../eventos";
import { excluirLicenca } from "../../excluidos/acoes";
import { AreaDaTrocaDeChave, BotaoTrocarChave } from "./troca-de-chave";

export const dynamic = "force-dynamic";

/** Uma consulta só por requisição, para o título e para a página. */
const obterLicenca = cache((prefixo: string) => nucleoDaInstancia().obterLicenca(decodeURIComponent(prefixo)));

export async function generateMetadata({ params }: { params: Promise<{ prefixo: string }> }): Promise<Metadata> {
  const licenca = await obterLicenca((await params).prefixo);
  return { title: licenca && `Licença ${licenca.prefixo}…` };
}

const DESCRICAO_DA_EXCLUSAO =
  "Para uma Licença emitida por engano, em qualquer estado. Ela sai das listas e a Validação passa a responder \"chave inválida\". A restauração, em Excluídos, a devolve como estava, com a mesma Chave de licença.";

export default async function DetalheDaLicenca({ params }: { params: Promise<{ prefixo: string }> }) {
  const { prefixo } = await params;
  const licenca = await obterLicenca(prefixo);
  if (!licenca) notFound();
  const agora = new Date();

  return (
    <AreaDaTrocaDeChave>
      <div className="grid gap-8">
        <Link href="/licencas" className="group inline-flex w-fit items-center gap-1 rounded-md text-sm text-suave hover:text-tinta">
          <span aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-x-0.5">←</span> Licenças
        </Link>

        <div className="flex animate-entrar flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm text-suave">Licença</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-3xl font-semibold tracking-tight sm:text-4xl">{licenca.prefixo}…</h1>
              <BotaoCopiar texto={licenca.prefixo} rotulo="Copiar prefixo" />
            </div>
            <div className="mt-3"><SeloDeEstado licenca={licenca} /></div>
          </div>
          {licenca.estado === "Revogada" ? (
            <p className="max-w-sm rounded-xl bg-elevada px-4 py-3 text-sm">
              A Revogação é definitiva: a Licença não pode mais ser alterada.
            </p>
          ) : (
            <AcoesDeCicloDeVida licenca={licenca} />
          )}
        </div>

        <FaixaDeFatos licenca={licenca} agora={agora} />

        <div className="animate-entrar [animation-delay:120ms]">
          <Abas
            rotulo="Seções da Licença"
            abas={[
              {
                id: "ativacoes",
                rotulo: `Ativações (${licenca.ativacoes.length})`,
                conteudo: <AbaAtivacoes licenca={licenca} agora={agora} />,
              },
              {
                id: "historico",
                rotulo: `Histórico (${licenca.historico.length})`,
                conteudo: <Historico licenca={licenca} agora={agora} />,
              },
              {
                id: "exclusao",
                rotulo: "Exclusão",
                conteudo: (
                  <div className="flex max-w-2xl flex-wrap items-center justify-between gap-4 rounded-xl border border-perigo/40 bg-perigo-suave/40 p-5">
                    <p className="max-w-md text-sm leading-relaxed">{DESCRICAO_DA_EXCLUSAO}</p>
                    <BotaoExcluir prefixo={licenca.prefixo} />
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    </AreaDaTrocaDeChave>
  );
}

function BotaoExcluir({ prefixo }: { prefixo: string }) {
  return (
    <DialogoDeConfirmacao
      rotulo="Excluir"
      estilo="perigoContorno"
      titulo="Excluir esta Licença?"
      descricao={DESCRICAO_DA_EXCLUSAO}
      confirmar="Excluir Licença"
      perigoso
      acao={excluirLicenca}
      campos={{ prefixo }}
    />
  );
}

/** As ações de ciclo de vida que valem para o estado atual. A Licença Revogada não chega aqui. */
function AcoesDeCicloDeVida({ licenca }: { licenca: DetalheLicenca }) {
  const campos = { prefixo: licenca.prefixo };
  return (
    <div className="flex flex-wrap gap-2">
      {licenca.validaAte && <DialogoRenovar prefixo={licenca.prefixo} validaAte={licenca.validaAte} />}
      <DialogoDeConfirmacao
        rotulo="Alterar limite de ativações"
        titulo="Alterar o Limite de ativações"
        descricao={`Hoje o limite é ${licenca.limiteAtivacoes}${licenca.limiteProprio === null ? ", o padrão do Produto" : ""}. Um limite menor não remove Ativações existentes.`}
        confirmar="Alterar limite"
        acao={alterarLimiteDeAtivacoes}
        campos={campos}
      >
        <label className={CLASSE_ROTULO}>
          Limite de ativações
          <input
            name="limiteAtivacoes"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={licenca.limiteProprio ?? ""}
            className={CLASSE_CAMPO}
          />
          <span className={CLASSE_AJUDA}>Vazio, segue o padrão do Produto.</span>
        </label>
      </DialogoDeConfirmacao>
      {licenca.estado === "Suspensa" ? (
        <DialogoReativar prefixo={licenca.prefixo} />
      ) : (
        <DialogoDeConfirmacao
          rotulo="Suspender"
          titulo={`Suspender a Licença ${licenca.prefixo}…?`}
          descricao="As Ativações são mantidas, mas a Validação passa a recusá-las até a reativação."
          confirmar="Suspender"
          acao={suspenderLicenca}
          campos={campos}
        />
      )}
      <BotaoTrocarChave prefixo={licenca.prefixo} />
      <DialogoDeConfirmacao
        rotulo="Revogar"
        estilo="perigoContorno"
        titulo={`Revogar a Licença ${licenca.prefixo}…?`}
        descricao="A Revogação é definitiva e não pode ser desfeita: a Validação passa a recusar todas as Ativações, e a Licença não pode mais ser alterada."
        confirmar="Revogar definitivamente"
        perigoso
        enviarConfirmacao
        acao={revogarLicenca}
        campos={campos}
      />
      <BotaoExcluir prefixo={licenca.prefixo} />
    </div>
  );
}

function FaixaDeFatos({ licenca, agora }: { licenca: DetalheLicenca; agora: Date }) {
  const fatos: { rotulo: string; valor: ReactNode; detalhe: ReactNode }[] = [
    {
      rotulo: "Cliente",
      valor: <Link href={`/clientes/${licenca.cliente.id}`} className="hover:text-acento">{licenca.cliente.nome}</Link>,
      detalhe: licenca.cliente.email,
    },
    {
      rotulo: "Produto",
      valor: (
        <Link href={`/produtos/${licenca.produto.identificador}`} className="hover:text-acento">{licenca.produto.nome}</Link>
      ),
      detalhe: <code className="font-mono">{licenca.produto.identificador}</code>,
    },
    {
      rotulo: "Data de validade",
      valor: formatarValidade(licenca.validaAte),
      detalhe: licenca.validaAte ? descreverPrazo(licenca.validaAte, agora) : "sem data de validade",
    },
    {
      rotulo: "Ativações",
      valor: `${licenca.ativacoes.length} de ${licenca.limiteAtivacoes}`,
      detalhe: licenca.limiteProprio === null ? "limite padrão do Produto" : "limite próprio",
    },
  ];
  // Uma coluna no celular, duas no meio, quatro no largo: as bordas separam as células em cada caso.
  const bordas = ["", "border-t sm:border-t-0 sm:border-l", "border-t lg:border-t-0 lg:border-l", "border-t sm:border-l lg:border-t-0"];
  return (
    <dl className="grid animate-entrar overflow-hidden rounded-xl border bg-superficie [animation-delay:60ms] sm:grid-cols-2 lg:grid-cols-4">
      {fatos.map((fato, i) => (
        <div key={fato.rotulo} className={`min-w-0 p-5 ${bordas[i]}`}>
          <dt className="text-xs text-suave">{fato.rotulo}</dt>
          <dd className="mt-1 truncate text-lg font-medium">{fato.valor}</dd>
          <dd className="truncate text-xs text-suave">{fato.detalhe}</dd>
        </div>
      ))}
    </dl>
  );
}

function Quando({ data, agora }: { data: Date; agora: Date }) {
  return (
    <time dateTime={data.toISOString()} title={formatarDataHora(data)}>
      {haQuantoTempo(data, agora)}
    </time>
  );
}

function AbaAtivacoes({ licenca, agora }: { licenca: DetalheLicenca; agora: Date }) {
  return (
    <div className="grid gap-8">
      {licenca.ativacoes.length === 0 ? (
        <p className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-suave">
          Nenhuma Ativação ainda. Ela é criada na primeira Validação num Dispositivo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-superficie">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-suave">
              <tr className="border-b">
                <th scope="col" className="px-4 py-2.5 font-medium">Dispositivo</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Ativada</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Última Validação</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borda">
              {licenca.ativacoes.map((ativacao) => (
                <tr key={ativacao.dispositivo} className="transition-colors duration-150 hover:bg-elevada/50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{ativacao.nomeDispositivo ?? "Sem nome"}</div>
                    <code className="font-mono text-xs break-all text-suave">{ativacao.dispositivo}</code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-suave"><Quando data={ativacao.ativadaEm} agora={agora} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-suave">
                    <Quando data={ativacao.ultimaValidacaoEm} agora={agora} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DialogoDeConfirmacao
                      rotulo="Remover"
                      estilo="fantasma"
                      titulo="Remover esta Ativação?"
                      descricao={`Libera a vaga de ${ativacao.nomeDispositivo ?? ativacao.dispositivo}. Remover uma Ativação não gasta a Cota de substituições.`}
                      confirmar="Remover Ativação"
                      perigoso
                      acao={removerAtivacao}
                      campos={{ prefixo: licenca.prefixo, dispositivo: ativacao.dispositivo }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CotaDeSubstituicoes licenca={licenca} />
      {licenca.substituicoes.length > 0 && <Substituicoes licenca={licenca} />}
    </div>
  );
}

/** Acima disto, a barra vira contínua: os segmentos ficariam finos demais. */
const SEGMENTOS_NO_MAXIMO = 20;

function CotaDeSubstituicoes({ licenca }: { licenca: DetalheLicenca }) {
  const { quantidade, dias } = licenca.cotaSubstituicoes;
  const usadas = licenca.substituicoesNoPeriodo;
  return (
    <section className="grid max-w-md gap-2 text-sm" aria-labelledby="cota-titulo">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 id="cota-titulo" className="font-medium">Cota de substituições</h2>
        <span className="text-suave tabular-nums">{usadas} de {quantidade} nos últimos {dias} dias</span>
      </div>
      {quantidade > 0 && quantidade <= SEGMENTOS_NO_MAXIMO && (
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: quantidade }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i < usadas ? "bg-acento" : "bg-elevada"}`}
            />
          ))}
        </div>
      )}
      {quantidade > SEGMENTOS_NO_MAXIMO && (
        <div className="h-1.5 overflow-hidden rounded-full bg-elevada" aria-hidden="true">
          <div className="h-full rounded-full bg-acento" style={{ width: `${Math.min(100, (usadas / quantidade) * 100)}%` }} />
        </div>
      )}
      <p className="text-xs leading-relaxed text-suave">
        Remover uma Ativação não gasta a Cota.
        {licenca.contagemSubstituicoesZeradaEm &&
          ` A contagem foi zerada em ${formatarDataHora(licenca.contagemSubstituicoesZeradaEm)}: as Substituições feitas até então não contam.`}
      </p>
      {usadas > 0 && (
        <div>
          <DialogoDeConfirmacao
            rotulo="Zerar contagem"
            estilo="fantasma"
            titulo="Zerar a contagem de Substituições de ativação?"
            descricao="As Substituições de ativação feitas até agora deixam de contar para a Cota de substituições. Elas continuam registradas."
            confirmar="Zerar contagem"
            acao={zerarContagemDeSubstituicoes}
            campos={{ prefixo: licenca.prefixo }}
          />
        </div>
      )}
    </section>
  );
}

function Substituicoes({ licenca }: { licenca: DetalheLicenca }) {
  return (
    <section className="grid gap-3" aria-labelledby="substituicoes-titulo">
      <h2 id="substituicoes-titulo" className="text-sm font-medium">Substituições de ativação feitas</h2>
      <div className="overflow-x-auto rounded-xl border bg-superficie">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-suave">
            <tr className="border-b">
              <th scope="col" className="px-4 py-2.5 font-medium">Feita em</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Dispositivo removido</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Dispositivo novo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">
            {licenca.substituicoes.map((substituicao, i) => (
              <tr key={i}>
                <td className="px-4 py-3 whitespace-nowrap">{formatarDataHora(substituicao.feitaEm)}</td>
                <td className="px-4 py-3"><code className="font-mono text-xs break-all">{substituicao.dispositivoRemovido}</code></td>
                <td className="px-4 py-3"><code className="font-mono text-xs break-all">{substituicao.dispositivoNovo}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** O histórico numa linha do tempo, do evento mais novo para o mais antigo. */
function Historico({ licenca, agora }: { licenca: DetalheLicenca; agora: Date }) {
  // O núcleo devolve do mais antigo para o mais novo.
  const eventos = [...licenca.historico].reverse();
  return (
    <ol className="relative grid max-w-2xl before:absolute before:top-3 before:bottom-3 before:left-[4px] before:w-px before:bg-borda">
      {eventos.map((evento, i) => {
        const { nome, detalhe } = descreverEvento(evento);
        return (
          <li key={i} className="flex gap-4 py-2.5">
            <span className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-acento ring-4 ring-fundo" aria-hidden="true" />
            <div className="text-sm">
              <span className="font-medium">{nome}</span>
              {detalhe && <span className="text-suave">: {detalhe}</span>}
              <span className="block text-xs text-suave">
                <Quando data={evento.ocorridoEm} agora={agora} /> · {formatarDataHora(evento.ocorridoEm)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
