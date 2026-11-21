import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { FormularioEntrada } from "./formulario";

export default async function Entrar() {
  if (await administradorAutenticado()) redirect("/");
  return <FormularioEntrada />;
}
