// Padrão de formulário do painel: rótulo, campo, erro logo abaixo do campo, ajuda
// embaixo e o botão principal. Funciona no servidor e no cliente.
import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { classeBotao } from "./botoes";
import { CLASSE_AJUDA, CLASSE_CAMPO, CLASSE_ROTULO } from "./campos";

/** O cartão do formulário. Recebe tudo o que um <form> recebe (action, noValidate…). */
export function Formulario({ className = "", ...props }: ComponentProps<"form">) {
  return <form className={`grid max-w-xl animate-entrar gap-5 rounded-2xl border bg-superficie p-6 [animation-delay:60ms] ${className}`} {...props} />;
}

/** O que o campo recebe de `Campo`: o id, o estilo e a ligação com o erro e a ajuda. */
export interface PropsDoControle {
  id: string;
  className: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
}

/**
 * Um campo com rótulo, o erro da validação e a ajuda. O controle vem de `children`, que
 * recebe as props a espalhar nele (input, select ou textarea):
 *
 *   <Campo rotulo="Nome" erro={erros?.nome}>{(props) => <input name="nome" {...props} />}</Campo>
 */
export function Campo({ rotulo, ajuda, erro, children }: {
  rotulo: string;
  ajuda?: ReactNode;
  erro?: string;
  children: (props: PropsDoControle) => ReactNode;
}) {
  const id = useId();
  const idDoErro = `${id}-erro`;
  const idDaAjuda = `${id}-ajuda`;
  const descricao = [erro && idDoErro, ajuda && idDaAjuda].filter(Boolean).join(" ");
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className={CLASSE_ROTULO}>{rotulo}</label>
      {children({
        id,
        className: CLASSE_CAMPO,
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": descricao || undefined,
      })}
      {erro && (
        <p id={idDoErro} className="text-sm text-perigo">{erro}</p>
      )}
      {ajuda && <p id={idDaAjuda} className={CLASSE_AJUDA}>{ajuda}</p>}
    </div>
  );
}

/** Campos que andam juntos (por exemplo, as regras do Produto), sob um título. */
export function GrupoDeCampos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-5 rounded-xl border p-5">
      <legend className="px-1.5 text-sm font-semibold">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/** O botão principal do formulário e, se houver para onde voltar, o Cancelar. */
export function BotoesDoFormulario({ rotulo, enviando, cancelar }: {
  rotulo: string;
  enviando: boolean;
  /** Para onde o Cancelar leva. */
  cancelar?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <button type="submit" disabled={enviando} className={classeBotao("primario", "px-4 py-2")}>
        {enviando ? "Aguarde…" : rotulo}
      </button>
      {cancelar && <Link href={cancelar} className={classeBotao("fantasma", "px-4 py-2")}>Cancelar</Link>}
    </div>
  );
}
