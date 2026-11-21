import { fileURLToPath } from "node:url";
import { migrar } from "../src/banco/migrar.ts";
import { urlBancoTeste } from "./url-banco-teste.ts";

/** Roda uma vez antes da suíte: aplica as migrações no banco de teste. */
export default async function prepararBanco() {
  await migrar(urlBancoTeste(), fileURLToPath(new URL("../drizzle", import.meta.url)));
}
