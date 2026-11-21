"use client";
import { useState } from "react";

export function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <button type="button" onClick={copiar} aria-live="polite">
      {copiado ? "Copiado!" : rotulo}
    </button>
  );
}
