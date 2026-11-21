import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { gerarHashSenha } from "../src/acesso/senha.ts";

// Lê a senha sem ecoar no terminal e imprime o valor para ADMIN_SENHA_HASH.
// O readline não tem opção para não ecoar; ele escreve numa saída que descarta
// tudo enquanto a senha é digitada. Só usa API pública, que não muda entre versões do Node.
let ocultar = false;
const saida = new Writable({
  write(pedaco, codificacao, pronto) {
    if (!ocultar) stdout.write(pedaco, codificacao);
    pronto();
  },
});
const leitor = createInterface({ input: stdin, output: saida, terminal: true });

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
