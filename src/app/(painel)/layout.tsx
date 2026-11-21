import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { administradorAutenticado, sair } from "@/acesso/administrador";

async function sairDoPainel() {
  "use server";
  await sair();
  redirect("/entrar");
}

export default async function LayoutPainel({ children }: { children: ReactNode }) {
  // O proxy já barra quem não tem sessão; conferir aqui também protege o painel
  // caso o matcher do proxy mude.
  if (!(await administradorAutenticado())) redirect("/entrar");
  return (
    <>
      <header>
        <nav>
          <Link href="/"><strong>Gerenciador de Licenças</strong></Link>
          <Link href="/produtos">Produtos</Link>
          <Link href="/clientes">Clientes</Link>
          <Link href="/licencas">Licenças</Link>
          <Link href="/excluidos">Excluídos</Link>
        </nav>
        <form action={sairDoPainel}>
          <button type="submit">Sair</button>
        </form>
      </header>
      <main>{children}</main>
    </>
  );
}
