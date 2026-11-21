import Link from "next/link";
import { notFound } from "next/navigation";
import type { EventoLicenca } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { formatarData, formatarDataHora } from "../../formatacao";
import {
  alterarLimiteDeAtivacoes,
  reativarLicenca,
  removerAtivacao,
  renovarLicenca,
  revogarLicenca,
  suspenderLicenca,
  zerarContagemDeSubstituicoes,
} from "../acoes";
import { Estado } from "../tabela";
import { FormularioAcao } from "./formulario-acao";
import { FormularioTrocaDeChave } from "./formulario-troca-de-chave";

export const dynamic = "force-dynamic";

function descreverLimite(limite: number | null): string {
  return limite === null ? "padrão do Produto" : String(limite);
}

function descreverEvento(evento: EventoLicenca): string {
  switch (evento.tipo) {
    case "ativacao_removida": {
      const nome = evento.nomeDispositivo ? ` (${evento.nomeDispositivo})` : "";
      return `Ativação removida pelo Administrador: ${evento.dispositivo}${nome}.`;
    }
    case "contagem_substituicoes_zerada":
      return "Contagem de Substituições de ativação zerada.";
    case "renovacao":
      return `Renovação: data de validade de ${formatarData(evento.validaAteAnterior)} para ${formatarData(evento.validaAte)}.`;
    case "limite_alterado":
      return `Limite de ativações alterado de ${descreverLimite(evento.limiteAnterior)} para ${descreverLimite(evento.limiteAtivacoes)}.`;
    case "suspensao":
      return "Suspensão.";
    case "reativacao":
      return "Reativação.";
    case "revogacao":
      return "Revogação.";
    case "troca_de_chave":
      return `Troca de chave: a Chave que começava com ${evento.prefixoAnterior} deixou de valer.`;
    case "emissao": {
      const validade = evento.validaAte ? `válida até ${formatarData(evento.validaAte)}` : "perpétua";
      return `Emissão: ${validade}, Limite de ativações ${descreverLimite(evento.limiteAtivacoes)}.`;
    }
  }
}

export default async function DetalheLicenca({ params }: { params: Promise<{ prefixo: string }> }) {
  const { prefixo } = await params;
  const licenca = await nucleoDaInstancia().obterLicenca(decodeURIComponent(prefixo));
  if (!licenca) notFound();

  return (
    <>
      <p><Link href="/licencas">← Licenças</Link></p>
      <h1>Licença <code>{licenca.prefixo}…</code></h1>
      <section className="cartao">
        <dl>
          <dt>Estado</dt>
          <dd><Estado licenca={licenca} /></dd>
          <dt>Produto</dt>
          <dd><Link href={`/produtos/${licenca.produto.identificador}`}>{licenca.produto.nome}</Link></dd>
          <dt>Cliente</dt>
          <dd><Link href={`/clientes/${licenca.cliente.id}`}>{licenca.cliente.nome}</Link> ({licenca.cliente.email})</dd>
          <dt>Data de validade</dt>
          <dd>{licenca.validaAte ? formatarData(licenca.validaAte) : "Perpétua"}</dd>
          <dt>Limite de ativações</dt>
          <dd>{licenca.limiteAtivacoes}{licenca.limiteProprio === null && " (padrão do Produto)"}</dd>
          <dt>Emitida em</dt>
          <dd>{formatarDataHora(licenca.emitidaEm)}</dd>
        </dl>
      </section>
      <h2>Ciclo de vida</h2>
      <section className="cartao ciclo-de-vida">
        {licenca.estado === "Revogada" ? (
          <p>Licença Revogada: a Revogação é definitiva e a Licença não pode mais ser alterada.</p>
        ) : (
          <>
            {licenca.validaAte && (
              <FormularioAcao acao={renovarLicenca} prefixo={licenca.prefixo}>
                <label>
                  Nova data de validade
                  <input name="validaAte" type="date" required />
                </label>
                <button type="submit">Renovar</button>
                <small>Muda só a data de validade; a Chave de licença e as Ativações continuam as mesmas.</small>
              </FormularioAcao>
            )}
            <FormularioAcao acao={alterarLimiteDeAtivacoes} prefixo={licenca.prefixo}>
              <label>
                Limite de ativações
                <input
                  name="limiteAtivacoes"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  defaultValue={licenca.limiteProprio ?? ""}
                />
              </label>
              <button type="submit">Alterar limite</button>
              <small>Vazio, segue o padrão do Produto. Um limite menor não remove Ativações existentes.</small>
            </FormularioAcao>
            {licenca.estado === "Suspensa" ? (
              <FormularioAcao acao={reativarLicenca} prefixo={licenca.prefixo}>
                <button type="submit">Reativar</button>
                <small>As Ativações voltam a valer.</small>
              </FormularioAcao>
            ) : (
              <FormularioAcao acao={suspenderLicenca} prefixo={licenca.prefixo}>
                <button type="submit">Suspender</button>
                <small>As Ativações são mantidas, mas a Validação passa a recusá-las até a reativação.</small>
              </FormularioAcao>
            )}
            <FormularioAcao acao={revogarLicenca} prefixo={licenca.prefixo}>
              <label className="confirmacao">
                <input name="confirmacao" type="checkbox" value="sim" required />
                Entendo que a Revogação é definitiva e não pode ser desfeita.
              </label>
              <button type="submit">Revogar</button>
            </FormularioAcao>
            <FormularioTrocaDeChave prefixo={licenca.prefixo} />
          </>
        )}
      </section>
      <h2>Ativações ({licenca.ativacoes.length} de {licenca.limiteAtivacoes})</h2>
      {licenca.ativacoes.length === 0 ? (
        <p>Nenhuma Ativação ainda. Ela é criada na primeira Validação num Dispositivo.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th>Nome</th>
              <th>Ativada em</th>
              <th>Última Validação</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {licenca.ativacoes.map((ativacao) => (
              <tr key={ativacao.dispositivo}>
                <td><code>{ativacao.dispositivo}</code></td>
                <td>{ativacao.nomeDispositivo ?? "—"}</td>
                <td>{formatarDataHora(ativacao.ativadaEm)}</td>
                <td>{formatarDataHora(ativacao.ultimaValidacaoEm)}</td>
                <td>
                  <form action={removerAtivacao}>
                    <input type="hidden" name="prefixo" value={licenca.prefixo} />
                    <input type="hidden" name="dispositivo" value={ativacao.dispositivo} />
                    <button type="submit">Remover</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Substituições de ativação</h2>
      <p>
        {licenca.substituicoesNoPeriodo} de {licenca.cotaSubstituicoes.quantidade} da Cota de substituições
        nos últimos {licenca.cotaSubstituicoes.dias} dias
        {licenca.contagemSubstituicoesZeradaEm &&
          `, sem contar as feitas até a contagem ser zerada em ${formatarDataHora(licenca.contagemSubstituicoesZeradaEm)}`}
        . Remover uma Ativação não gasta a Cota.
      </p>
      <form action={zerarContagemDeSubstituicoes}>
        <input type="hidden" name="prefixo" value={licenca.prefixo} />
        <button type="submit" disabled={licenca.substituicoesNoPeriodo === 0}>Zerar contagem</button>
      </form>
      {licenca.substituicoes.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Feita em</th>
              <th>Dispositivo removido</th>
              <th>Dispositivo novo</th>
            </tr>
          </thead>
          <tbody>
            {licenca.substituicoes.map((substituicao, i) => (
              <tr key={i}>
                <td>{formatarDataHora(substituicao.feitaEm)}</td>
                <td><code>{substituicao.dispositivoRemovido}</code></td>
                <td><code>{substituicao.dispositivoNovo}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Histórico</h2>
      <ol className="historico">
        {licenca.historico.map((evento, i) => (
          <li key={i}>
            <time dateTime={evento.ocorridoEm.toISOString()}>{formatarDataHora(evento.ocorridoEm)}</time>
            {" — "}
            {descreverEvento(evento)}
          </li>
        ))}
      </ol>
    </>
  );
}
