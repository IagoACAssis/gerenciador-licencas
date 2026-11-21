/**
 * Avisos temporários que chegam pela URL (`?aviso=<código>`), depois de uma ação que
 * leva a outra página. A URL traz só o código; o texto sai daqui.
 */
export const AVISOS_NA_URL = {
  "licenca-excluida": "Licença excluída. Dá para restaurar em Excluídos.",
  "produto-cadastrado": "Produto cadastrado.",
  "produto-excluido": "Produto excluído. Dá para restaurar em Excluídos.",
  "cliente-cadastrado": "Cliente cadastrado.",
  "cliente-salvo": "Cliente salvo.",
  "cliente-excluido": "Cliente excluído. Dá para restaurar em Excluídos.",
} satisfies Record<string, string>;

/** O destino de um redirecionamento, com o aviso que a página de chegada mostra. */
export function comAviso(caminho: string, codigo: keyof typeof AVISOS_NA_URL): string {
  return `${caminho}?aviso=${codigo}`;
}
