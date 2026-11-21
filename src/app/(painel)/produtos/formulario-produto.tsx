"use client";
import { useActionState } from "react";
import type { EstadoFormularioProduto } from "./acoes";

type Acao = (estado: EstadoFormularioProduto, dados: FormData) => Promise<EstadoFormularioProduto>;

function Campo({ nome, rotulo, estado, ajuda, numerico = true, obrigatorio = true }: {
  nome: string;
  rotulo: string;
  estado: EstadoFormularioProduto;
  ajuda?: string;
  numerico?: boolean;
  obrigatorio?: boolean;
}) {
  const erro = estado.erros?.[nome as keyof NonNullable<EstadoFormularioProduto["erros"]>];
  return (
    <label>
      {rotulo}
      <input
        name={nome}
        defaultValue={estado.valores[nome] ?? ""}
        required={obrigatorio}
        {...(numerico ? { type: "number", min: 0, step: 1, inputMode: "numeric" as const } : {})}
        aria-invalid={erro ? true : undefined}
      />
      {ajuda && <small>{ajuda}</small>}
      {erro && <span className="erro">{erro}</span>}
    </label>
  );
}

export function FormularioProduto({ acao, valoresIniciais, rotuloBotao }: {
  acao: Acao;
  valoresIniciais: Record<string, string>;
  rotuloBotao: string;
}) {
  const [estado, despachar, enviando] = useActionState(acao, { valores: valoresIniciais });
  return (
    <form className="cartao formulario" action={despachar}>
      <Campo nome="nome" rotulo="Nome" estado={estado} numerico={false} />
      <label>
        Descrição
        <textarea name="descricao" rows={3} defaultValue={estado.valores.descricao ?? ""} />
      </label>
      <fieldset>
        <legend>Regras</legend>
        <Campo nome="janelaAvisoDias" rotulo="Janela de aviso (dias)" estado={estado}
          ajuda="Quantos dias antes da data de validade a Licença passa a ser informada como “a vencer”." />
        <Campo nome="carenciaDias" rotulo="Carência (dias, opcional)" estado={estado} obrigatorio={false}
          ajuda="Quantos dias depois da data de validade uma Licença Expirada continua aceita. Vazio é zero." />
        <Campo nome="limiteAtivacoesPadrao" rotulo="Limite de ativações padrão" estado={estado}
          ajuda="Quantas Ativações simultâneas uma Licença aceita, se ela não tiver limite próprio." />
        <Campo nome="cotaSubstituicoesQuantidade" rotulo="Cota de substituições: quantidade" estado={estado} />
        <Campo nome="cotaSubstituicoesDias" rotulo="Cota de substituições: nos últimos N dias" estado={estado} />
        <Campo nome="toleranciaOfflineDias" rotulo="Tolerância offline (dias)" estado={estado}
          ajuda="Por quanto tempo uma Resposta assinada vale sem nova Validação." />
      </fieldset>
      {estado.mensagem && <p role="status">{estado.mensagem}</p>}
      <button type="submit" disabled={enviando}>{rotuloBotao}</button>
    </form>
  );
}
