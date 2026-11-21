"use client";
import { useEffect, useRef, useState } from "react";
import { classeBotao, type EstiloBotao } from "./botoes";

const CONFIRMACAO_MS = 2000;

/**
 * Copia `texto` para a área de transferência e confirma no próprio botão. Sem a
 * API de área de transferência (por exemplo, a Instância aberta por http fora do
 * localhost), avisa que é preciso copiar à mão.
 */
export function BotaoCopiar({ texto, rotulo = "Copiar", estilo = "fantasma" }: {
  texto: string;
  rotulo?: string;
  estilo?: EstiloBotao;
}) {
  const [situacao, setSituacao] = useState<"pronto" | "copiado" | "falhou">("pronto");
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setSituacao("copiado");
    } catch {
      setSituacao("falhou");
    }
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setSituacao("pronto"), CONFIRMACAO_MS);
  }

  return (
    <button type="button" onClick={copiar} className={classeBotao(estilo, estilo === "fantasma" ? "px-2! py-1! text-xs!" : "")}>
      <span aria-live="polite" className={`transition-colors duration-200 ${situacao === "copiado" && estilo === "fantasma" ? "text-ok" : ""}`}>
        {situacao === "copiado" ? "✓ Copiado" : situacao === "falhou" ? "Copie à mão" : rotulo}
      </span>
    </button>
  );
}
