"use client";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { useAvisar } from "./aviso-temporario";
import { classeBotao, type EstiloBotao } from "./botoes";

/** O que a ação do diálogo devolve: a recusa, mostrada no diálogo, ou o resultado, mostrado no aviso temporário. */
export interface EstadoDoDialogo {
  erro?: string;
  /** Só no sucesso. Sem ele, o diálogo continua aberto. */
  aviso?: string;
}

type AcaoDoDialogo = (estado: EstadoDoDialogo, formulario: FormData) => Promise<EstadoDoDialogo>;

/**
 * Botão que abre um diálogo de confirmação (<dialog> nativo) e, ao confirmar, envia o
 * formulário à Server Action de sempre. `campos` vão ocultos; `children` são os campos
 * que o diálogo pede (por exemplo, a nova data de validade). A recusa da ação aparece
 * dentro do diálogo; o sucesso fecha o diálogo e mostra o aviso temporário.
 *
 * Fecha com Esc, com Cancelar e clicando fora, sem enviar nada. Cada abertura começa
 * limpa, sem a recusa nem os valores da anterior.
 */
export function DialogoDeConfirmacao({
  rotulo,
  estilo = "secundario",
  titulo,
  descricao,
  confirmar,
  perigoso = false,
  enviarConfirmacao = false,
  acao,
  campos = {},
  children,
}: {
  /** Texto do botão que abre o diálogo. */
  rotulo: ReactNode;
  estilo?: EstiloBotao;
  titulo: string;
  /** A consequência da ação, em uma ou duas frases. */
  descricao: ReactNode;
  /** Texto do botão de confirmar: nomeia a ação ("Revogar definitivamente"). */
  confirmar: string;
  /** Ação destrutiva: o botão de confirmar fica vermelho. */
  perigoso?: boolean;
  /**
   * Para as ações que o servidor só executa com `confirmacao=sim` (Revogação e Troca de
   * chave): o botão de confirmar envia o campo.
   */
  enviarConfirmacao?: boolean;
  acao: AcaoDoDialogo;
  campos?: Record<string, string>;
  children?: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const enviando = useRef(false);
  const cliqueComecouFora = useRef(false);
  // Muda a cada fechamento, para a próxima abertura montar o formulário do zero.
  const [abertura, setAbertura] = useState(0);
  const ids = useId();

  return (
    <>
      <button type="button" className={classeBotao(estilo)} onClick={() => dialogo.current?.showModal()}>
        {rotulo}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={`${ids}-titulo`}
        aria-describedby={`${ids}-descricao`}
        className="m-auto w-[min(92vw,28rem)] rounded-2xl bg-superficie p-0 text-tinta shadow-2xl ring-1 ring-borda"
        onClose={() => setAbertura((n) => n + 1)}
        // Enquanto a ação roda, o diálogo não fecha: o resultado precisa de onde aparecer.
        onCancel={(evento) => enviando.current && evento.preventDefault()}
        // Fora do conteúdo, o clique cai no próprio <dialog> (o fundo).
        onPointerDown={(evento) => (cliqueComecouFora.current = evento.target === evento.currentTarget)}
        onClick={(evento) => {
          if (cliqueComecouFora.current && evento.target === evento.currentTarget && !enviando.current) {
            dialogo.current?.close();
          }
        }}
      >
        <FormularioDoDialogo
          key={abertura}
          ids={ids}
          dialogo={dialogo}
          enviando={enviando}
          titulo={titulo}
          descricao={descricao}
          confirmar={confirmar}
          perigoso={perigoso}
          enviarConfirmacao={enviarConfirmacao}
          acao={acao}
          campos={campos}
        >
          {children}
        </FormularioDoDialogo>
      </dialog>
    </>
  );
}

function FormularioDoDialogo({ ids, dialogo, enviando: enviandoRef, titulo, descricao, confirmar, perigoso, enviarConfirmacao, acao, campos, children }: {
  ids: string;
  dialogo: RefObject<HTMLDialogElement | null>;
  enviando: RefObject<boolean>;
  titulo: string;
  descricao: ReactNode;
  confirmar: string;
  perigoso: boolean;
  enviarConfirmacao: boolean;
  acao: AcaoDoDialogo;
  campos: Record<string, string>;
  children?: ReactNode;
}) {
  const avisar = useAvisar();
  // O aviso e o fechamento saem daqui, e não de um efeito: a ação pode tirar da página
  // o próprio botão que abriu o diálogo (a Ativação removida, por exemplo).
  const [estado, despachar, enviando] = useActionState<EstadoDoDialogo, FormData>(async (anterior, formulario) => {
    const resultado = await acao(anterior, formulario);
    if (resultado.aviso) {
      avisar(resultado.aviso);
      dialogo.current?.close();
    }
    return resultado;
  }, {});
  useEffect(() => {
    enviandoRef.current = enviando;
  }, [enviando, enviandoRef]);

  return (
    <form
      className="grid gap-4 p-6"
      onSubmit={(evento) => {
        // Envio manual, e não <form action>, para o React não limpar os campos quando a
        // ação recusa: quem digitou corrige sem redigitar.
        evento.preventDefault();
        const formulario = new FormData(evento.currentTarget, (evento.nativeEvent as SubmitEvent).submitter);
        startTransition(() => despachar(formulario));
      }}
    >
      {Object.entries(campos).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}
      <div className="grid gap-1.5">
        <h2 id={`${ids}-titulo`} className="text-lg font-semibold tracking-tight">{titulo}</h2>
        <p id={`${ids}-descricao`} className="text-sm leading-relaxed text-suave">{descricao}</p>
      </div>
      {children && <fieldset disabled={enviando} className="grid gap-3">{children}</fieldset>}
      {estado.erro && (
        <p role="alert" className="rounded-lg bg-perigo-suave px-3 py-2 text-sm text-perigo">{estado.erro}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2 pt-1">
        {/* Sem campos, o foco inicial cai aqui: Cancelar vem antes de confirmar. */}
        <button type="button" className={classeBotao("fantasma")} disabled={enviando} onClick={() => dialogo.current?.close()}>
          Cancelar
        </button>
        <button
          type="submit"
          className={classeBotao(perigoso ? "perigo" : "primario")}
          disabled={enviando}
          {...(enviarConfirmacao && { name: "confirmacao", value: "sim" })}
        >
          {enviando ? "Aguarde…" : confirmar}
        </button>
      </div>
    </form>
  );
}
