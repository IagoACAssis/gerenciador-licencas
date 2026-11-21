import type { Licenca } from "@/nucleo";

export type Tom = "ok" | "alerta" | "perigo" | "neutro";

/**
 * Texto e tom do estado da Licença, com as indicações "a vencer" e "em Carência".
 * É o único lugar que decide o tom de cada estado. Não recalcula nada: só lê o
 * estado e as indicações que o núcleo devolve.
 */
export function situacaoDaLicenca(licenca: Pick<Licenca, "estado" | "aVencer" | "emCarencia">): { texto: string; tom: Tom } {
  switch (licenca.estado) {
    case "Ativa":
      return licenca.aVencer ? { texto: "Ativa · a vencer", tom: "alerta" } : { texto: "Ativa", tom: "ok" };
    case "Expirada":
      return licenca.emCarencia ? { texto: "Expirada · em Carência", tom: "alerta" } : { texto: "Expirada", tom: "perigo" };
    case "Suspensa":
      return { texto: "Suspensa", tom: "alerta" };
    case "Revogada":
      return { texto: "Revogada", tom: "neutro" };
  }
}

const CLASSES_DO_TOM: Record<Tom, string> = {
  ok: "bg-ok-suave text-ok",
  alerta: "bg-alerta-suave text-alerta",
  perigo: "bg-perigo-suave text-perigo",
  neutro: "bg-elevada text-suave",
};

/** A cor cheia do tom, para pontos e barras que acompanham o texto de um estado. */
export const COR_DO_TOM: Record<Tom, string> = {
  ok: "bg-ok",
  alerta: "bg-alerta",
  perigo: "bg-perigo",
  neutro: "bg-suave",
};

/** O estado da Licença como selo: sempre texto e cor juntos. */
export function SeloDeEstado({ licenca }: { licenca: Pick<Licenca, "estado" | "aVencer" | "emCarencia"> }) {
  const { texto, tom } = situacaoDaLicenca(licenca);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${CLASSES_DO_TOM[tom]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {texto}
    </span>
  );
}
