// O tema do painel: a escolha (Claro, Escuro ou Sistema) fica no navegador, e o
// <html> leva data-tema="claro" ou "escuro". As cores trocam pelas variáveis CSS
// de globais.css, nunca pelas classes.

export const CHAVE_TEMA = "tema";

export type EscolhaDeTema = "claro" | "escuro" | "sistema";

export const ESCOLHAS_DE_TEMA: readonly EscolhaDeTema[] = ["claro", "escuro", "sistema"];

/** Evento disparado na janela quando a escolha muda nesta aba (o "storage" só chega às outras). */
export const EVENTO_TEMA = "tema-escolhido";

/**
 * Aplica no <html> o tema da escolha guardada; em Sistema (ou sem escolha), segue
 * prefers-color-scheme. Roda também como script inline antes da primeira pintura
 * (SCRIPT_TEMA), por isso não pode usar nada de fora da própria função.
 */
export function aplicarTema(chave: string): void {
  let escolha: string | null = null;
  try {
    escolha = localStorage.getItem(chave);
  } catch {
    // Sem acesso ao localStorage (modo restrito do navegador): fica com o sistema.
  }
  const escuro = escolha === "escuro" || (escolha !== "claro" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
}

/** Script do <head>: aplica o tema enquanto o HTML é lido, antes de pintar e de o React hidratar. */
export const SCRIPT_TEMA = `(${aplicarTema.toString()})(${JSON.stringify(CHAVE_TEMA)})`;

export function lerEscolhaDeTema(): EscolhaDeTema {
  try {
    const guardada = localStorage.getItem(CHAVE_TEMA);
    return ESCOLHAS_DE_TEMA.find((escolha) => escolha === guardada) ?? "sistema";
  } catch {
    return "sistema";
  }
}

export function escolherTema(escolha: EscolhaDeTema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, escolha);
  } catch {
    // Sem localStorage a escolha vale só até recarregar.
  }
  aplicarTema(CHAVE_TEMA);
  window.dispatchEvent(new Event(EVENTO_TEMA));
}
