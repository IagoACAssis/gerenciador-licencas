import type { Metadata } from "next";
import Link from "next/link";
import type { Cliente } from "@/nucleo";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { classeBotao } from "@/componentes/botoes";
import { CLASSE_CAMPO } from "@/componentes/campos";
import { BarraDeFiltros, EstadoVazio, Tabela } from "@/componentes/lista";
import { CabecalhoDaPagina } from "@/componentes/pagina";
import { parametro } from "../formatacao";

export const metadata: Metadata = { title: "Clientes" };

export default async function Clientes({ searchParams }: { searchParams: Promise<{ busca?: string | string[] }> }) {
  const busca = parametro((await searchParams).busca);
  const clientes = await nucleoDaInstancia().listarClientes({ busca });
  const buscando = busca.trim() !== "";
  return (
    <div className="grid gap-6">
      <CabecalhoDaPagina
        titulo="Clientes"
        descricao="Quem recebe as Licenças. Abra um Cliente para ver as Licenças dele."
        acoes={<Link href="/clientes/novo" className={classeBotao("primario")}>Cadastrar Cliente</Link>}
      />
      <BarraDeFiltros rotulo="Buscar Clientes" botao="Buscar">
        <input
          name="busca"
          type="search"
          defaultValue={busca}
          placeholder="Nome ou e-mail"
          aria-label="Nome ou e-mail"
          className={`${CLASSE_CAMPO} w-full sm:w-72`}
        />
      </BarraDeFiltros>
      {clientes.length > 0 ? (
        <Tabela<Cliente>
          colunas={[
            { titulo: "Nome", celula: (c) => <span className="font-medium">{c.nome}</span> },
            { titulo: "E-mail", classe: "break-all text-suave", celula: (c) => c.email },
          ]}
          itens={clientes}
          chave={(c) => c.id}
          href={(c) => `/clientes/${c.id}`}
          rotulo={(c) => `${c.nome}, ${c.email}`}
        />
      ) : buscando ? (
        <EstadoVazio
          titulo={`Nenhum Cliente encontrado para “${busca.trim()}”`}
          acao={<Link href="/clientes" className={classeBotao("secundario")}>Limpar busca</Link>}
        >
          A busca procura no nome e no e-mail. Tente outra parte do nome ou do e-mail, ou limpe a busca para ver todos.
        </EstadoVazio>
      ) : (
        <EstadoVazio
          titulo="Nenhum Cliente ainda"
          acao={<Link href="/clientes/novo" className={classeBotao("primario")}>Cadastrar Cliente</Link>}
        >
          Cadastre o primeiro Cliente para emitir Licenças para ele.
        </EstadoVazio>
      )}
    </div>
  );
}
