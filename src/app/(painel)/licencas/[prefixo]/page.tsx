import Link from "next/link";
import { notFound } from "next/navigation";
import type { EventoLicenca } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { formatarData, formatarDataHora } from "../../formatacao";
import { Estado } from "../tabela";

export const dynamic = "force-dynamic";

function descreverEvento(evento: EventoLicenca): string {
  const validade = evento.validaAte ? `válida até ${formatarData(evento.validaAte)}` : "perpétua";
  const limite = evento.limiteAtivacoes === null
    ? "Limite de ativações padrão do Produto"
    : `Limite de ativações ${evento.limiteAtivacoes}`;
  return `Emissão: ${validade}, ${limite}.`;
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
            </tr>
          </thead>
          <tbody>
            {licenca.ativacoes.map((ativacao) => (
              <tr key={ativacao.dispositivo}>
                <td><code>{ativacao.dispositivo}</code></td>
                <td>{ativacao.nomeDispositivo ?? "—"}</td>
                <td>{formatarDataHora(ativacao.ativadaEm)}</td>
                <td>{formatarDataHora(ativacao.ultimaValidacaoEm)}</td>
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
