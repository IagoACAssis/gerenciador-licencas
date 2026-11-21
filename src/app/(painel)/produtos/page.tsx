import Link from "next/link";
import { nucleoDaInstancia } from "@/nucleo/producao";

export const dynamic = "force-dynamic";

export default async function Produtos() {
  const produtos = await nucleoDaInstancia().listarProdutos();
  return (
    <>
      <div className="titulo">
        <h1>Produtos</h1>
        <Link className="botao" href="/produtos/novo">Cadastrar Produto</Link>
      </div>
      {produtos.length === 0 ? (
        <p>Nenhum Produto cadastrado ainda.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Nome</th><th>Identificador</th><th>Licenças</th></tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto.identificador}>
                <td><Link href={`/produtos/${produto.identificador}`}>{produto.nome}</Link></td>
                <td><code>{produto.identificador}</code></td>
                <td>{produto.licencas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
