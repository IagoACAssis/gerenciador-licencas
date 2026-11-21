import type { Metadata } from "next";
import Link from "next/link";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { formatarDataHora } from "../formatacao";
import { FormularioRecusavel } from "../formulario-recusavel";
import { restaurarCliente, restaurarLicenca, restaurarProduto } from "./acoes";

export const metadata: Metadata = { title: "Excluídos" };

export const dynamic = "force-dynamic";

function Restaurar({ acao, campos }: { acao: typeof restaurarProduto; campos: Record<string, string> }) {
  return (
    <FormularioRecusavel acao={acao} campos={campos} className="acao">
      <button type="submit">Restaurar</button>
    </FormularioRecusavel>
  );
}

export default async function Excluidos() {
  const excluidos = await nucleoDaInstancia().listarExcluidos();
  const vazio = excluidos.produtos.length + excluidos.clientes.length + excluidos.licencas.length === 0;
  return (
    <div className="legado">
      <h1>Excluídos</h1>
      <p>
        Nada aqui foi apagado. A restauração devolve o item como estava; restaurar um Produto ou um Cliente
        traz de volta as Licenças dele que não foram excluídas uma a uma.
      </p>
      {vazio && <p>Nada excluído.</p>}
      {excluidos.produtos.length > 0 && (
        <>
          <h2>Produtos</h2>
          <table>
            <thead><tr><th>Nome</th><th>Identificador</th><th>Excluído em</th><th /></tr></thead>
            <tbody>
              {excluidos.produtos.map((produto) => (
                <tr key={produto.identificador}>
                  <td>{produto.nome}</td>
                  <td><code>{produto.identificador}</code></td>
                  <td>{formatarDataHora(produto.excluidoEm)}</td>
                  <td><Restaurar acao={restaurarProduto} campos={{ identificador: produto.identificador }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {excluidos.clientes.length > 0 && (
        <>
          <h2>Clientes</h2>
          <table>
            <thead><tr><th>Nome</th><th>E-mail</th><th>Excluído em</th><th /></tr></thead>
            <tbody>
              {excluidos.clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.nome}</td>
                  <td>{cliente.email}</td>
                  <td>{formatarDataHora(cliente.excluidoEm)}</td>
                  <td><Restaurar acao={restaurarCliente} campos={{ id: String(cliente.id) }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {excluidos.licencas.length > 0 && (
        <>
          <h2>Licenças</h2>
          <table>
            <thead><tr><th>Licença</th><th>Produto</th><th>Cliente</th><th>Excluída em</th><th /></tr></thead>
            <tbody>
              {excluidos.licencas.map((licenca) => (
                <tr key={licenca.prefixo}>
                  <td><code>{licenca.prefixo}…</code></td>
                  <td>{licenca.produto}</td>
                  <td>{licenca.cliente}</td>
                  <td>{formatarDataHora(licenca.excluidaEm)}</td>
                  <td><Restaurar acao={restaurarLicenca} campos={{ prefixo: licenca.prefixo }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      <p><Link href="/">← Painel</Link></p>
    </div>
  );
}
