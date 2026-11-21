import type { Metadata } from "next";
import type { ReactNode } from "react";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { DialogoDeConfirmacao } from "@/componentes/dialogo-de-confirmacao";
import { CLASSE_LINHA_COM_ACOES, EstadoVazio, TabelaComAcoes } from "@/componentes/lista";
import { CabecalhoDaPagina } from "@/componentes/pagina";
import { formatarDataHora } from "../formatacao";
import { restaurarCliente, restaurarLicenca, restaurarProduto } from "./acoes";

export const metadata: Metadata = { title: "Excluídos" };

export const dynamic = "force-dynamic";

export default async function Excluidos() {
  const { produtos, clientes, licencas } = await nucleoDaInstancia().listarExcluidos();
  const vazio = produtos.length + clientes.length + licencas.length === 0;
  return (
    <div className="grid gap-8">
      <CabecalhoDaPagina titulo="Excluídos" descricao="Nada aqui foi apagado. A restauração devolve o item como estava." />
      {vazio ? (
        <EstadoVazio titulo="Nada excluído">
          O que for excluído em Produtos, Clientes ou Licenças aparece aqui, pronto para ser restaurado.
        </EstadoVazio>
      ) : (
        <>
          {produtos.length > 0 && (
            <Secao id="produtos" titulo="Produtos" quantidade={produtos.length} colunas={["Nome", "Identificador público"]} tituloDaData="Excluído em">
              {produtos.map((produto) => (
                <Linha
                  key={produto.identificador}
                  excluidoEm={produto.excluidoEm}
                  acao={
                    <DialogoDeConfirmacao
                      rotulo="Restaurar"
                      titulo="Restaurar este Produto?"
                      descricao={`${produto.nome} volta às listas com as Licenças dele que não foram excluídas uma a uma, e a Validação volta a reconhecer o identificador.`}
                      confirmar="Restaurar Produto"
                      acao={restaurarProduto}
                      campos={{ identificador: produto.identificador }}
                    />
                  }
                >
                  <td className="px-4 py-3 font-medium">{produto.nome}</td>
                  <td className="px-4 py-3">
                    <code className="font-mono text-[13px] break-all text-suave">{produto.identificador}</code>
                  </td>
                </Linha>
              ))}
            </Secao>
          )}
          {clientes.length > 0 && (
            <Secao id="clientes" titulo="Clientes" quantidade={clientes.length} colunas={["Nome", "E-mail"]} tituloDaData="Excluído em">
              {clientes.map((cliente) => (
                <Linha
                  key={cliente.id}
                  excluidoEm={cliente.excluidoEm}
                  acao={
                    <DialogoDeConfirmacao
                      rotulo="Restaurar"
                      titulo="Restaurar este Cliente?"
                      descricao={`${cliente.nome} volta às listas com as Licenças dele que não foram excluídas uma a uma.`}
                      confirmar="Restaurar Cliente"
                      acao={restaurarCliente}
                      campos={{ id: String(cliente.id) }}
                    />
                  }
                >
                  <td className="px-4 py-3 font-medium">{cliente.nome}</td>
                  <td className="px-4 py-3 break-all text-suave">{cliente.email}</td>
                </Linha>
              ))}
            </Secao>
          )}
          {licencas.length > 0 && (
            <Secao id="licencas" titulo="Licenças" quantidade={licencas.length} colunas={["Licença", "Cliente", "Produto"]} tituloDaData="Excluída em">
              {licencas.map((licenca) => (
                <Linha
                  key={licenca.prefixo}
                  excluidoEm={licenca.excluidaEm}
                  acao={
                    <DialogoDeConfirmacao
                      rotulo="Restaurar"
                      titulo="Restaurar esta Licença?"
                      descricao={`A Licença ${licenca.prefixo}… de ${licenca.cliente} volta como estava: estado, data de validade, Ativações, histórico e Chave de licença.`}
                      confirmar="Restaurar Licença"
                      acao={restaurarLicenca}
                      campos={{ prefixo: licenca.prefixo }}
                    />
                  }
                >
                  <td className="px-4 py-3 font-mono text-[13px] whitespace-nowrap">{licenca.prefixo}…</td>
                  <td className="px-4 py-3 font-medium">{licenca.cliente}</td>
                  <td className="px-4 py-3 text-suave">{licenca.produto}</td>
                </Linha>
              ))}
            </Secao>
          )}
        </>
      )}
    </div>
  );
}

/** Uma tabela de excluídos (Produtos, Clientes ou Licenças), com a data da Exclusão e a restauração no fim. */
function Secao({ id, titulo, quantidade, colunas, tituloDaData, children }: {
  id: string;
  titulo: string;
  quantidade: number;
  /** Os títulos das colunas do item; a da data ("Excluído em") e a da ação vêm depois, como em `Linha`. */
  colunas: string[];
  tituloDaData: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-entrar [animation-delay:60ms]" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
        {titulo}
        <span className="rounded-full bg-elevada px-2 text-xs font-medium text-suave tabular-nums">{quantidade}</span>
      </h2>
      <TabelaComAcoes colunas={[...colunas, tituloDaData]} acao="Ação">{children}</TabelaComAcoes>
    </section>
  );
}

/** Uma linha de excluído: as células do item (`children`), a data da Exclusão e a ação de restaurar. */
function Linha({ excluidoEm, acao, children }: { excluidoEm: Date; acao: ReactNode; children: ReactNode }) {
  return (
    <tr className={CLASSE_LINHA_COM_ACOES}>
      {children}
      <td className="px-4 py-3 whitespace-nowrap text-suave">
        <time dateTime={excluidoEm.toISOString()}>{formatarDataHora(excluidoEm)}</time>
      </td>
      <td className="px-4 py-3 text-right">{acao}</td>
    </tr>
  );
}
