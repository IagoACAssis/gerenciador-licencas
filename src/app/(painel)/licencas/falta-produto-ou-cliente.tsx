import Link from "next/link";
import { classeBotao } from "@/componentes/botoes";
import { EstadoVazio } from "@/componentes/lista";

/** A Emissão pede pelo menos um Produto e um Cliente: diz o que falta e leva ao cadastro. */
export function FaltaProdutoOuCliente({ titulo, temProduto, temCliente }: {
  titulo: string;
  temProduto: boolean;
  temCliente: boolean;
}) {
  return (
    <EstadoVazio
      titulo={titulo}
      acao={
        <>
          {!temProduto && <Link href="/produtos/novo" className={classeBotao("primario")}>Cadastrar Produto</Link>}
          {!temCliente && (
            <Link href="/clientes/novo" className={classeBotao(temProduto ? "primario" : "secundario")}>Cadastrar Cliente</Link>
          )}
        </>
      }
    >
      Para emitir uma Licença, cadastre antes pelo menos um Produto e um Cliente.
    </EstadoVazio>
  );
}
