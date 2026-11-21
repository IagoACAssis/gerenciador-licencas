"use client";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { AREAS_DO_PAINEL } from "./areas-do-painel";
import { classeBotao } from "./botoes";
import { carregarItensDaPaleta, type ItemDaPaleta } from "./paleta-de-comandos-acoes";

// Navegação e ações não dependem do banco: aparecem na hora, antes de os itens do servidor chegarem.
const ITENS_FIXOS: ItemDaPaleta[] = [
  { grupo: "Ação", rotulo: "Emitir Licença", href: "/licencas/nova" },
  { grupo: "Ação", rotulo: "Cadastrar Cliente", href: "/clientes/novo" },
  { grupo: "Ação", rotulo: "Cadastrar Produto", href: "/produtos/novo" },
  { grupo: "Ação", rotulo: "Licenças a vencer", href: "/licencas?aVencer=1" },
  ...AREAS_DO_PAINEL.map((area): ItemDaPaleta => ({ grupo: "Ir para", rotulo: area.rotulo, href: area.href })),
];

// Acima disso, a lista só cresce sem ajudar: quem procura algo específico digita mais.
const MAXIMO_DE_RESULTADOS = 50;

/** Minúsculas e sem acento, para que "licencas" ache "Licenças". */
function paraBusca(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function noMac(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.userAgent);
}

const nadaAcompanhar = () => () => {};

function Lupa() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-suave" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Paleta de comandos: o botão "Buscar" da barra do topo e o <dialog> que ele abre,
 * também por ⌘K ou Ctrl+K. Segue o padrão combobox com listbox: o foco fica no
 * campo, e as setas movem o item ativo (aria-activedescendant).
 */
export function PaletaDeComandos() {
  const router = useRouter();
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const cliqueComecouFora = useRef(false);
  const ultimaCarga = useRef(0);
  const idLista = useId();
  const [busca, setBusca] = useState("");
  const [ativo, setAtivo] = useState(0);
  const [doServidor, setDoServidor] = useState<ItemDaPaleta[] | null>(null);
  const [falhou, setFalhou] = useState(false);
  // No servidor não se sabe o sistema: mostra Ctrl K até hidratar.
  const mac = useSyncExternalStore(nadaAcompanhar, noMac, () => false);

  const itens = useMemo(
    () =>
      [...ITENS_FIXOS, ...(doServidor ?? [])].map((item) => ({
        ...item,
        texto: paraBusca(`${item.grupo} ${item.rotulo} ${item.detalhe ?? ""} ${item.termos ?? ""}`),
      })),
    [doServidor],
  );
  const palavras = paraBusca(busca).split(/\s+/).filter(Boolean);
  const filtrados = itens.filter((item) => palavras.every((p) => item.texto.includes(p))).slice(0, MAXIMO_DE_RESULTADOS);
  const idDoItem = (indice: number) => `${idLista}-${indice}`;

  function abrir() {
    const elemento = dialogo.current;
    if (!elemento || elemento.open) return;
    setBusca("");
    setAtivo(0);
    setFalhou(false);
    elemento.showModal();
    campo.current?.focus();
    // Só a carga da abertura mais recente vale: uma resposta atrasada de antes não a sobrescreve.
    const carga = ++ultimaCarga.current;
    carregarItensDaPaleta().then(
      (recebidos) => carga === ultimaCarga.current && setDoServidor(recebidos),
      () => carga === ultimaCarga.current && setFalhou(true),
    );
  }

  function fechar() {
    dialogo.current?.close();
  }

  function irPara(item: ItemDaPaleta | undefined) {
    if (!item) return;
    fechar();
    router.push(item.href);
  }

  useEffect(() => {
    const tecla = (evento: globalThis.KeyboardEvent) => {
      // O autocompletar do navegador dispara keydown sem key.
      if (!(evento.metaKey || evento.ctrlKey) || evento.altKey || evento.key?.toLowerCase() !== "k") return;
      evento.preventDefault();
      if (dialogo.current?.open) fechar();
      else abrir();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
    // abrir e fechar só usam refs e setters, que não mudam entre renderizações.
  }, []);

  function teclaNoCampo(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.nativeEvent.isComposing) return;
    const total = filtrados.length;
    if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
      evento.preventDefault();
      if (total === 0) return;
      const passo = evento.key === "ArrowDown" ? 1 : -1;
      setAtivo((atual) => (Math.min(atual, total - 1) + passo + total) % total);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      irPara(filtrados[Math.min(ativo, total - 1)]);
    }
  }

  const indiceAtivo = Math.min(ativo, filtrados.length - 1);

  // O item ativo fica sempre à vista, mesmo quando as setas passam da parte visível da lista.
  useEffect(() => {
    if (indiceAtivo >= 0) document.getElementById(`${idLista}-${indiceAtivo}`)?.scrollIntoView({ block: "nearest" });
  }, [indiceAtivo, idLista]);
  const carregando = doServidor === null && !falhou;
  const situacao =
    filtrados.length > 0
      ? `${filtrados.length} ${filtrados.length === 1 ? "resultado" : "resultados"}`
      : carregando
        ? "Carregando…"
        : "Nada encontrado.";

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        className={classeBotao("secundario")}
      >
        <Lupa />
        <span className="max-sm:sr-only">Buscar</span>
        <kbd aria-hidden="true" className="font-mono text-[11px] text-suave max-sm:hidden">
          {mac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>
      <dialog
        ref={dialogo}
        aria-label="Paleta de comandos"
        closedby="any"
        // Clique fora para os navegadores que ainda não têm closedby: o clique no fundo chega ao próprio <dialog>.
        onPointerDown={(evento) => {
          cliqueComecouFora.current = evento.target === evento.currentTarget;
        }}
        onClick={(evento) => {
          if (cliqueComecouFora.current && evento.target === evento.currentTarget) fechar();
        }}
        className="mx-auto mt-[12vh] mb-auto w-[min(92vw,36rem)] overflow-hidden rounded-2xl bg-superficie p-0 text-tinta shadow-2xl ring-1 ring-borda transition-[opacity,translate,scale,overlay,display] transition-discrete duration-200 ease-out not-open:translate-y-2 not-open:scale-98 not-open:opacity-0 starting:open:translate-y-2 starting:open:scale-98 starting:open:opacity-0 backdrop:bg-transparent backdrop:transition-[background-color,overlay,display] backdrop:transition-discrete backdrop:duration-200 open:backdrop:bg-[rgb(0_0_0/0.35)] starting:open:backdrop:bg-transparent"
      >
        <div className="flex items-center gap-3 border-b px-4">
          <Lupa />
          <input
            ref={campo}
            type="text"
            role="combobox"
            aria-label="Buscar Licença, Cliente, Produto ou ação"
            aria-expanded={filtrados.length > 0}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={filtrados.length > 0 ? idDoItem(indiceAtivo) : undefined}
            autoComplete="off"
            spellCheck={false}
            value={busca}
            onChange={(evento) => {
              setBusca(evento.target.value);
              setAtivo(0);
            }}
            onKeyDown={teclaNoCampo}
            placeholder="Buscar Licença, Cliente, Produto ou ação…"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-suave"
          />
          <kbd aria-hidden="true" className="rounded border px-1.5 py-0.5 font-mono text-[11px] text-suave">Esc</kbd>
        </div>
        <ul id={idLista} role="listbox" aria-label="Resultados" className="max-h-[50vh] overflow-y-auto p-2 empty:hidden">
          {filtrados.map((item, indice) => {
            const atual = indice === indiceAtivo;
            return (
              <li
                key={`${item.grupo}-${item.href}`}
                id={idDoItem(indice)}
                role="option"
                aria-selected={atual}
                onPointerMove={() => setAtivo(indice)}
                onClick={() => irPara(item)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-100 ${
                  atual ? "bg-acento-suave text-tinta ring-1 ring-acento/40" : "text-tinta"
                }`}
              >
                <span className="w-16 shrink-0 text-xs text-suave">{item.grupo}</span>
                <span className="min-w-0 flex-1 truncate">{item.rotulo}</span>
                {item.detalhe && <span className="max-w-[40%] truncate font-mono text-xs text-suave">{item.detalhe}</span>}
                <span aria-hidden="true" className={`w-3 text-xs text-suave ${atual ? "" : "invisible"}`}>↵</span>
              </li>
            );
          })}
        </ul>
        {filtrados.length === 0 && (
          <p aria-hidden="true" className="px-3 py-8 text-center text-sm text-suave">{situacao}</p>
        )}
        {falhou && (
          <p className="border-t px-4 py-2 text-xs text-perigo">Não foi possível atualizar Licenças, Clientes e Produtos. Feche e abra de novo.</p>
        )}
        <p role="status" className="sr-only">{situacao}</p>
      </dialog>
    </>
  );
}
