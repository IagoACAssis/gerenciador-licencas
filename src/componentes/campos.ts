// Estilos de campo de formulário do painel. Funciona no servidor e no cliente.

/** Rótulo com o campo embaixo: <label className={CLASSE_ROTULO}>Texto<input className={CLASSE_CAMPO} /></label>. */
export const CLASSE_ROTULO = "grid gap-1.5 text-sm font-medium";

export const CLASSE_CAMPO =
  "rounded-lg bg-superficie px-3 py-2 text-base font-normal text-tinta ring-1 ring-suave/70 outline-none transition-shadow duration-150 focus:ring-2 focus:ring-acento aria-invalid:ring-perigo disabled:opacity-50 sm:text-sm";

/** Ajuda abaixo do campo. */
export const CLASSE_AJUDA = "text-xs font-normal text-suave";
