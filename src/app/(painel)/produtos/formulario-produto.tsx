"use client";
import { useActionState } from "react";
import { useAvisar } from "@/componentes/aviso-temporario";
import { BotoesDoFormulario, Campo, Formulario, GrupoDeCampos } from "@/componentes/formulario";
import type { EstadoFormularioProduto } from "./acoes";

type Acao = (estado: EstadoFormularioProduto, dados: FormData) => Promise<EstadoFormularioProduto>;

type Erros = NonNullable<EstadoFormularioProduto["erros"]>;

/** Um campo de regra: número inteiro de zero ou mais. */
function CampoNumerico({ nome, rotulo, ajuda, estado, obrigatorio = true }: {
  nome: keyof Erros;
  rotulo: string;
  ajuda?: string;
  estado: EstadoFormularioProduto;
  obrigatorio?: boolean;
}) {
  return (
    <Campo rotulo={rotulo} ajuda={ajuda} erro={estado.erros?.[nome]}>
      {(props) => (
        <input
          name={nome}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          required={obrigatorio}
          defaultValue={estado.valores[nome] ?? ""}
          {...props}
        />
      )}
    </Campo>
  );
}

export function FormularioProduto({ acao, valoresIniciais, rotuloBotao, cancelar }: {
  acao: Acao;
  valoresIniciais: Record<string, string>;
  rotuloBotao: string;
  /** Para onde o Cancelar leva; sem ele, não há Cancelar. */
  cancelar?: string;
}) {
  const avisar = useAvisar();
  const [estado, despachar, enviando] = useActionState<EstadoFormularioProduto, FormData>(async (anterior, dados) => {
    const resultado = await acao(anterior, dados);
    if (resultado.mensagem) avisar(resultado.mensagem);
    return resultado;
  }, { valores: valoresIniciais });

  return (
    <Formulario action={despachar}>
      <Campo rotulo="Nome" erro={estado.erros?.nome}>
        {(props) => <input name="nome" required defaultValue={estado.valores.nome ?? ""} {...props} />}
      </Campo>
      <Campo rotulo="Descrição (opcional)">
        {(props) => <textarea name="descricao" rows={3} defaultValue={estado.valores.descricao ?? ""} {...props} />}
      </Campo>
      <GrupoDeCampos titulo="Regras">
        <CampoNumerico nome="janelaAvisoDias" rotulo="Janela de aviso (dias)" estado={estado}
          ajuda="Quantos dias antes da data de validade a Licença passa a ser informada como “a vencer”." />
        <CampoNumerico nome="carenciaDias" rotulo="Carência (dias, opcional)" estado={estado} obrigatorio={false}
          ajuda="Quantos dias depois da data de validade uma Licença Expirada continua aceita. Vazio é zero." />
        <CampoNumerico nome="limiteAtivacoesPadrao" rotulo="Limite de ativações padrão" estado={estado}
          ajuda="Quantas Ativações simultâneas uma Licença aceita, se ela não tiver limite próprio." />
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoNumerico nome="cotaSubstituicoesQuantidade" rotulo="Cota de substituições: quantidade" estado={estado} />
          <CampoNumerico nome="cotaSubstituicoesDias" rotulo="Cota de substituições: nos últimos N dias" estado={estado} />
        </div>
        <CampoNumerico nome="toleranciaOfflineDias" rotulo="Tolerância offline (dias)" estado={estado}
          ajuda="Por quanto tempo uma Resposta assinada vale sem nova Validação." />
      </GrupoDeCampos>
      <BotoesDoFormulario rotulo={rotuloBotao} enviando={enviando} cancelar={cancelar} />
    </Formulario>
  );
}
