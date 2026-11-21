import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { gerarHashSenha } from "../src/acesso/senha.ts";

// Lê a senha sem ecoar no terminal e imprime o valor para ADMIN_SENHA_HASH.
const leitor = createInterface({ input: stdin, output: stdout, terminal: true });
// O readline não tem opção para não ecoar; interceptamos a escrita interna dele.
const leitorComEco = leitor as unknown as { _writeToOutput: (texto: string) => void };
const escreverOriginal = leitorComEco._writeToOutput.bind(leitor);
let ocultar = false;
leitorComEco._writeToOutput = (texto) => escreverOriginal(ocultar ? "" : texto);

stdout.write("Senha do Administrador: ");
ocultar = true;
const senha = await leitor.question("");
ocultar = false;
leitor.close();
stdout.write("\n");

if (senha.length < 12) {
  console.error("Use uma senha com pelo menos 12 caracteres.");
  process.exit(1);
}
console.log(`ADMIN_SENHA_HASH=${await gerarHashSenha(senha)}`);
