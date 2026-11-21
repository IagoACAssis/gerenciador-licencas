"use client";
import { useLayoutEffect } from "react";
import { aplicarTema, CHAVE_TEMA } from "./tema";

/**
 * Mantém o tema em dia depois do carregamento: segue a mudança do tema do sistema
 * (na escolha Sistema) e a escolha feita em outra aba, sem recarregar. Também
 * reaplica o tema logo ao montar, porque em desenvolvimento o Strict Mode do React
 * limpa o atributo que o script do <head> pôs no <html>.
 */
export function TemaDoNavegador() {
  useLayoutEffect(() => {
    const aplicar = () => aplicarTema(CHAVE_TEMA);
    aplicar();
    const sistema = matchMedia("(prefers-color-scheme: dark)");
    sistema.addEventListener("change", aplicar);
    window.addEventListener("storage", aplicar);
    return () => {
      sistema.removeEventListener("change", aplicar);
      window.removeEventListener("storage", aplicar);
    };
  }, []);
  return null;
}
