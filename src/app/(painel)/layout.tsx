import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { administradorAutenticado, sair } from "@/acesso/administrador";
import { ProvedorDeAvisos } from "@/componentes/aviso-temporario";
import { classeBotao } from "@/componentes/botoes";
import { Marca } from "@/componentes/marca";
import { SeletorDeTema } from "@/componentes/seletor-de-tema";
import { Abas } from "./abas";
import { AVISOS_NA_URL } from "./avisos";

async function sairDoPainel() {
  "use server";
  await sair();
  redirect("/entrar");
}

/** A casca do painel: a barra fixa no topo (marca, abas, busca, tema e Sair) e a página larga embaixo. */
export default async function LayoutPainel({ children }: { children: ReactNode }) {
  // O proxy já barra quem não tem sessão; conferir aqui também protege o painel
  // caso o matcher do proxy mude.
  if (!(await administradorAutenticado())) redirect("/entrar");
  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-superficie/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 md:px-8">
          <Link href="/" className="rounded-md" aria-label="Licença AI, Início">
            <Marca />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {/* Aqui entra o botão "Buscar ⌘K" da paleta de comandos (#20). */}
            <SeletorDeTema />
            <form action={sairDoPainel}>
              <button type="submit" className={classeBotao("fantasma")}>Sair</button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-7xl">
          <Abas />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <ProvedorDeAvisos avisosNaUrl={AVISOS_NA_URL}>{children}</ProvedorDeAvisos>
      </main>
    </>
  );
}
