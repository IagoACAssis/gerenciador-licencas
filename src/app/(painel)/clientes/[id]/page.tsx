import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { BotaoCopiar } from "@/componentes/botao-copiar";
import { classeBotao } from "@/componentes/botoes";
import { DialogoDeConfirmacao } from "@/componentes/dialogo-de-confirmacao";
import { EstadoVazio } from "@/componentes/lista";
import { FaixaDeFatos, LinkDeVolta } from "@/componentes/pagina";
import { formatarData } from "../../formatacao";
import { TabelaLicencas } from "../../licencas/tabela";
import { excluirCliente } from "../../excluidos/acoes";
import { obterClienteDaRota } from "../cliente-da-rota";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cliente = await obterClienteDaRota((await params).id);
  return { title: cliente?.nome };
}

const DESCRICAO_DA_EXCLUSAO =
  "Para um Cliente cadastrado por engano. Ele e as Licenças dele saem das listas e deixam de valer na Validação; o e-mail continua ocupado. Não é possível com Licença Ativa ou Suspensa. A restauração, em Excluídos, o devolve como estava.";

export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obterClienteDaRota(id);
  if (!cliente) notFound();
  const licencas = await nucleoDaInstancia().listarLicencas({ cliente: cliente.id });
  const emitir = `/licencas/nova?cliente=${cliente.id}`;

  return (
    <div className="grid gap-8">
      <LinkDeVolta href="/clientes">Clientes</LinkDeVolta>

      <div className="flex animate-entrar flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sm text-suave">Cliente</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight break-words sm:text-4xl">{cliente.nome}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm break-all text-suave">{cliente.email}</span>
            <BotaoCopiar texto={cliente.email} rotulo="Copiar e-mail" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={emitir} className={classeBotao("primario")}>Emitir Licença</Link>
          <Link href={`/clientes/${cliente.id}/editar`} className={classeBotao("secundario")}>Editar</Link>
          <DialogoDeConfirmacao
            rotulo="Excluir"
            estilo="perigoContorno"
            titulo="Excluir este Cliente?"
            descricao={DESCRICAO_DA_EXCLUSAO}
            confirmar="Excluir Cliente"
            perigoso
            acao={excluirCliente}
            campos={{ id: String(cliente.id) }}
          />
        </div>
      </div>

      <FaixaDeFatos
        colunas="sm:grid-cols-3"
        fatos={[
          { rotulo: "Licenças", valor: <span className="tabular-nums">{licencas.length}</span> },
          { rotulo: "Cadastrado em", valor: formatarData(cliente.criadoEm) },
          { rotulo: "Atualizado em", valor: formatarData(cliente.atualizadoEm) },
        ]}
      />

      <section className="grid animate-entrar gap-3 [animation-delay:120ms]" aria-labelledby="licencas-titulo">
        <h2 id="licencas-titulo" className="text-lg font-semibold tracking-tight">Licenças</h2>
        {licencas.length > 0 ? (
          <TabelaLicencas licencas={licencas} semCliente />
        ) : (
          <EstadoVazio titulo="Este Cliente ainda não tem Licenças" acao={<Link href={emitir} className={classeBotao("primario")}>Emitir Licença</Link>}>
            Emita uma Licença de um dos seus Produtos para ele. A Chave de licença aparece uma única vez, logo depois da Emissão.
          </EstadoVazio>
        )}
      </section>
    </div>
  );
}
