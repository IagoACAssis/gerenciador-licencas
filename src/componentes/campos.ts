// Estilos de campo de formulário do painel. Funciona no servidor e no cliente.

/**
 * Rótulo do campo: envolvendo o campo (<label className={CLASSE_ROTULO}>Texto<input /></label>)
 * ou ligado a ele por htmlFor, como em `Campo` (formulario.tsx).
 */
export const CLASSE_ROTULO = "grid gap-1.5 text-sm font-medium";

export const CLASSE_CAMPO =
  "rounded-lg bg-superficie px-3 py-2 text-base font-normal text-tinta ring-1 ring-suave/80 outline-none transition-shadow duration-150 focus:ring-2 focus:ring-acento aria-invalid:ring-perigo disabled:opacity-50 sm:text-sm";

/** Ajuda abaixo do campo. */
export const CLASSE_AJUDA = "text-xs font-normal text-suave";
