"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { BotaoCopiar } from "./botao-copiar";
import { classeBotao } from "./botoes";

/**
 * Destaque da Chave de licença na única vez em que ela sai do núcleo (ADR-0003): na
 * Emissão e na Troca de chave. Ela chega só na resposta da ação, nunca pela URL.
 * Ao aparecer, recebe o foco, porque substitui o formulário ou o diálogo que o tinha.
 */
export function DestaqueDaChaveNova({ titulo, chave, prefixo }: { titulo: string; chave: string; prefixo: string }) {
  const cabecalho = useRef<HTMLHeadingElement>(null);
  useEffect(() => cabecalho.current?.focus(), []);
  return (
    <section className="grid max-w-2xl animate-entrar gap-5 rounded-2xl border bg-superficie p-6 shadow-sm">
      <h2 ref={cabecalho} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">{titulo}</h2>
      <p className="rounded-xl bg-alerta-suave px-4 py-3 text-sm leading-relaxed text-tinta" role="alert">
        Copie a Chave de licença agora e entregue-a ao Cliente.{" "}
        <strong className="font-semibold text-alerta">Ela não poderá ser vista de novo</strong>, nem por você: a
        Instância guarda só uma impressão dela.
      </p>
      <code className="block rounded-xl bg-acento-suave px-4 py-4 font-mono text-lg font-medium tracking-wide break-all text-tinta select-all ring-1 ring-acento/30">
        {chave}
      </code>
      <div className="flex flex-wrap items-center gap-3">
        <BotaoCopiar texto={chave} rotulo="Copiar Chave de licença" estilo="primario" />
        <Link href={`/licencas/${prefixo}`} className={classeBotao("secundario")}>
          Ver a Licença {prefixo}…
        </Link>
      </div>
    </section>
  );
}
