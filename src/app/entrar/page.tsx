import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { Marca } from "@/componentes/marca";
import { FormularioEntrada } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar() {
  if (await administradorAutenticado()) redirect("/");
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm animate-entrar">
        <div className="mb-8 grid justify-items-center gap-5 text-center">
          <Marca tamanho="grande" descricao />
          <h1 className="text-lg text-suave">Licença aí, entre para continuar</h1>
        </div>
        <div className="rounded-2xl bg-superficie p-6 shadow-sm ring-1 ring-borda">
          <FormularioEntrada />
        </div>
      </div>
    </main>
  );
}
