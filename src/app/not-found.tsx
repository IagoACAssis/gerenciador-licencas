import type { Metadata } from "next";
import Link from "next/link";
import { classeBotao } from "@/componentes/botoes";
import { Marca } from "@/componentes/marca";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid max-w-sm animate-entrar justify-items-center gap-5 text-center">
        <Marca tamanho="grande" />
        <h1 className="text-xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="text-suave">O endereço não existe ou o item foi excluído.</p>
        <Link href="/" className={classeBotao("primario")}>Voltar ao Início</Link>
      </div>
    </main>
  );
}
