import { fileURLToPath } from "node:url";
import { migrar } from "../src/banco/migrar.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL para rodar as migrações.");
  process.exit(1);
}

await migrar(url, fileURLToPath(new URL("../drizzle", import.meta.url)));
console.log("Migrações aplicadas.");
