"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/** Quanto tempo o aviso fica na tela; a animação de entrada e saída usa a mesma duração. */
const DURACAO_MS = 4000;

const Avisar = createContext<((texto: string) => void) | null>(null);

/** Mostra um aviso temporário. Precisa estar dentro de ProvedorDeAvisos. */
export function useAvisar(): (texto: string) => void {
  const avisar = useContext(Avisar);
  if (!avisar) throw new Error("useAvisar precisa estar dentro de ProvedorDeAvisos.");
  return avisar;
}

/**
 * Avisos temporários depois de uma ação bem-sucedida. Fica acima das páginas (no
 * layout), para que o aviso sobreviva à troca de página e ao componente que o pediu.
 *
 * Uma ação que leva a outra página não devolve resultado ao cliente; ela redireciona
 * com `?aviso=<código>`, e o texto sai de `avisosNaUrl`. A URL traz só o código,
 * nunca o texto, para que um link não ponha uma mensagem qualquer no painel.
 */
export function ProvedorDeAvisos({ avisosNaUrl, children }: { avisosNaUrl: Record<string, string>; children: ReactNode }) {
  const [aviso, setAviso] = useState<{ texto: string; id: number } | null>(null);
  const proximoId = useRef(0);
  const avisar = useCallback((texto: string) => setAviso({ texto, id: ++proximoId.current }), []);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso((atual) => (atual === aviso ? null : atual)), DURACAO_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const parametros = useSearchParams();
  const caminho = usePathname();
  const router = useRouter();
  const codigo = parametros.get("aviso");
  useEffect(() => {
    if (codigo === null) return;
    if (Object.hasOwn(avisosNaUrl, codigo)) avisar(avisosNaUrl[codigo]);
    const resto = new URLSearchParams(parametros);
    resto.delete("aviso");
    router.replace(resto.size > 0 ? `${caminho}?${resto}` : caminho, { scroll: false });
  }, [codigo, avisosNaUrl, avisar, parametros, caminho, router]);

  return (
    <Avisar value={avisar}>
      {children}
      {/* A região existe desde o início, para o leitor de tela anunciar o que entrar nela. */}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {aviso && (
          <p
            key={aviso.id}
            className="aviso-temporario flex max-w-md items-center gap-2.5 rounded-xl bg-tinta px-4 py-3 text-sm text-fundo shadow-xl"
            style={{ animationDuration: `${DURACAO_MS}ms` }}
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ok text-[11px] text-fundo" aria-hidden="true">
              ✓
            </span>
            {aviso.texto}
          </p>
        )}
      </div>
    </Avisar>
  );
}
