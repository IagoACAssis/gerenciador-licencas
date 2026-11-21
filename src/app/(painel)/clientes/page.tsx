import type { Metadata } from "next";
import Link from "next/link";
import { nucleoDaInstancia } from "@/nucleo/producao";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ busca?: string | string[] }> }) {
  const { busca: parametro } = await searchParams;
  const busca = (Array.isArray(parametro) ? parametro[0] : parametro) ?? "";
  const clientes = await nucleoDaInstancia().listarClientes({ busca });
  return (
    <div className="legado">
      <div className="titulo">
        <h1>Clientes</h1>
        <Link href="/clientes/novo">Novo Cliente</Link>
      </div>
      <form className="busca" role="search">
        <input name="busca" type="search" defaultValue={busca} placeholder="Buscar por nome ou e-mail" aria-label="Buscar" />
        <button type="submit">Buscar</button>
      </form>
      {clientes.length === 0 ? (
        <p>{busca.trim() ? "Nenhum Cliente encontrado." : "Nenhum Cliente cadastrado ainda."}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id}>
                <td><Link href={`/clientes/${cliente.id}`}>{cliente.nome}</Link></td>
                <td>{cliente.email}</td>
                <td>
                  <Link href={`/clientes/${cliente.id}/editar`}>Editar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
