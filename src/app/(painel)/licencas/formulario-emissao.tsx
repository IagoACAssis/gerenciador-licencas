"use client";
import { useActionState } from "react";
import { emitirLicenca } from "./acoes";
import { DestaqueDaChaveNova } from "@/componentes/chave-nova";
import { BotoesDoFormulario, Campo, Formulario } from "@/componentes/formulario";

interface Opcao {
  valor: string;
  rotulo: string;
}

export function FormularioEmissao({ produtos, clientes, inicial }: {
  produtos: Opcao[];
  clientes: Opcao[];
  inicial: { produto: string; cliente: string };
}) {
  const [estado, acao, enviando] = useActionState(emitirLicenca, {
    valores: { ...inicial, validaAte: "", limiteAtivacoes: "" },
  });

  if (estado.emitida) {
    return <DestaqueDaChaveNova titulo="Licença emitida" {...estado.emitida} />;
  }

  const { valores, erros } = estado;
  return (
    <Formulario action={acao} noValidate>
      <Campo rotulo="Produto" erro={erros?.produto}>
        {(props) => (
          <select name="produto" defaultValue={valores.produto} required {...props}>
            <option value="">Escolha…</option>
            {produtos.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
          </select>
        )}
      </Campo>
      <Campo rotulo="Cliente" erro={erros?.cliente}>
        {(props) => (
          <select name="cliente" defaultValue={valores.cliente} required {...props}>
            <option value="">Escolha…</option>
            {clientes.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
          </select>
        )}
      </Campo>
      <Campo
        rotulo="Data de validade (opcional)"
        ajuda="Vale até o fim desse dia (UTC). Vazia, a Licença é perpétua."
        erro={erros?.validaAte}
      >
        {(props) => <input name="validaAte" type="date" defaultValue={valores.validaAte} {...props} />}
      </Campo>
      <Campo
        rotulo="Limite de ativações (opcional)"
        ajuda="Vazio, segue o Limite de ativações padrão do Produto, inclusive se ele mudar."
        erro={erros?.limiteAtivacoes}
      >
        {(props) => (
          <input
            name="limiteAtivacoes"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={valores.limiteAtivacoes}
            {...props}
          />
        )}
      </Campo>
      <BotoesDoFormulario rotulo="Emitir" enviando={enviando} cancelar="/licencas" />
    </Formulario>
  );
}
