import type { Metadata } from "next";
import type { ReactNode } from "react";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { DialogoDeConfirmacao } from "@/componentes/dialogo-de-confirmacao";
import { EstadoVazio } from "@/componentes/lista";
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
            <Secao id="produtos" titulo="Produtos" quantidade={produtos.length} colunas={["Nome", "Identificador público", "Excluído em"]}>
              {produtos.map((produto) => (
                <Linha
                  key={produto.identificador}
                  excluidoEm={produto.excluidoEm}
                  restaurar={
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
            <Secao id="clientes" titulo="Clientes" quantidade={clientes.length} colunas={["Nome", "E-mail", "Excluído em"]}>
              {clientes.map((cliente) => (
                <Linha
                  key={cliente.id}
                  excluidoEm={cliente.excluidoEm}
                  restaurar={
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
            <Secao id="licencas" titulo="Licenças" quantidade={licencas.length} colunas={["Licença", "Cliente", "Produto", "Excluída em"]}>
              {licencas.map((licenca) => (
                <Linha
                  key={licenca.prefixo}
                  excluidoEm={licenca.excluidaEm}
                  restaurar={
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
function Secao({ id, titulo, quantidade, colunas, children }: {
  id: string;
  titulo: string;
  quantidade: number;
  colunas: string[];
  children: ReactNode;
}) {
  return (
    <section className="animate-entrar [animation-delay:60ms]" aria-labelledby={`${id}-titulo`}>
      <h2 id={`${id}-titulo`} className="mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight">
        {titulo}
        <span className="rounded-full bg-elevada px-2 text-xs font-medium text-suave tabular-nums">{quantidade}</span>
      </h2>
      <div className="overflow-x-auto rounded-xl border bg-superficie">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-suave">
            <tr className="border-b">
              {colunas.map((coluna) => (
                <th key={coluna} scope="col" className="px-4 py-2.5 font-medium whitespace-nowrap">{coluna}</th>
              ))}
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">Ação</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borda">{children}</tbody>
        </table>
      </div>
    </section>
  );
}

/** Uma linha de excluído: as células do item (`children`), a data da Exclusão e o botão de restaurar. */
function Linha({ excluidoEm, restaurar, children }: { excluidoEm: Date; restaurar: ReactNode; children: ReactNode }) {
  return (
    <tr className="transition-colors duration-150 hover:bg-elevada/50">
      {children}
      <td className="px-4 py-3 whitespace-nowrap text-suave">
        <time dateTime={excluidoEm.toISOString()}>{formatarDataHora(excluidoEm)}</time>
      </td>
      <td className="px-4 py-3 text-right">{restaurar}</td>
    </tr>
  );
}
