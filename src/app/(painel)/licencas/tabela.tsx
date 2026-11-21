import Link from "next/link";
import type { Licenca } from "@/nucleo";
import { formatarData } from "../formatacao";

/** Estado com as indicações "a vencer" e "em Carência", quando houver. */
export function Estado({ licenca }: { licenca: Licenca }) {
  return (
    <>
      <span className={`estado estado-${licenca.estado.toLowerCase()}`}>{licenca.estado}</span>
      {licenca.aVencer && <span className="indicacao">a vencer</span>}
      {licenca.emCarencia && <span className="indicacao">em Carência</span>}
    </>
  );
}

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
            <td>{licenca.validaAte ? formatarData(licenca.validaAte) : "Perpétua"}</td>
            <td><Estado licenca={licenca} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
