import Link from "next/link";
import type { Licenca } from "@/nucleo";
import { SeloDeEstado } from "@/componentes/selo-de-estado";
import { formatarValidade } from "../formatacao";

export function TabelaLicencas({ licencas, semCliente = false }: { licencas: Licenca[]; semCliente?: boolean }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Chave</th>
          <th>Produto</th>
          {!semCliente && <th>Cliente</th>}
          <th>Validade</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {licencas.map((licenca) => (
          <tr key={licenca.prefixo}>
            <td><Link href={`/licencas/${licenca.prefixo}`}><code>{licenca.prefixo}…</code></Link></td>
            <td>{licenca.produto.nome}</td>
            {!semCliente && <td><Link href={`/clientes/${licenca.cliente.id}`}>{licenca.cliente.nome}</Link></td>}
            <td>{formatarValidade(licenca.validaAte)}</td>
            <td><SeloDeEstado licenca={licenca} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
