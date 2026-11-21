"use client";
import Link from "next/link";
import { useActionState } from "react";
import { BotaoCopiar } from "../botao-copiar";
import { emitirLicenca, type EstadoEmissao } from "./acoes";

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
    return (
      <section className="cartao">
        <h2>Licença emitida</h2>
        <p className="aviso" role="alert">
          Copie a Chave de licença agora e entregue-a ao Cliente. <strong>Ela não poderá ser vista de novo</strong>,
          nem por você: a Instância guarda só uma impressão dela.
        </p>
        <pre>{estado.emitida.chave}</pre>
        <BotaoCopiar texto={estado.emitida.chave} rotulo="Copiar Chave de licença" />
        <p>
          <Link href={`/licencas/${estado.emitida.prefixo}`}>Ver a Licença {estado.emitida.prefixo}</Link>
        </p>
      </section>
    );
  }

  const { valores, erros } = estado;
  return (
    <form className="cadastro" action={acao} noValidate>
      <label>
        Produto
        <select name="produto" defaultValue={valores.produto} aria-invalid={!!erros?.produto} required>
          <option value="">Escolha…</option>
          {produtos.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
        {erros?.produto && <span className="erro">{erros.produto}</span>}
      </label>
      <label>
        Cliente
        <select name="cliente" defaultValue={valores.cliente} aria-invalid={!!erros?.cliente} required>
          <option value="">Escolha…</option>
          {clientes.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
        </select>
        {erros?.cliente && <span className="erro">{erros.cliente}</span>}
      </label>
      <label>
        Data de validade (opcional)
        <input name="validaAte" type="date" defaultValue={valores.validaAte} aria-invalid={!!erros?.validaAte} />
        <small>Vale até o fim desse dia (UTC). Vazia, a Licença é perpétua.</small>
        {erros?.validaAte && <span className="erro">{erros.validaAte}</span>}
      </label>
      <label>
        Limite de ativações (opcional)
        <input
          name="limiteAtivacoes"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          defaultValue={valores.limiteAtivacoes}
          aria-invalid={!!erros?.limiteAtivacoes}
        />
        <small>Vazio, segue o Limite de ativações padrão do Produto, inclusive se ele mudar.</small>
        {erros?.limiteAtivacoes && <span className="erro">{erros.limiteAtivacoes}</span>}
      </label>
      <div className="acoes">
        <button type="submit" disabled={enviando}>Emitir</button>
        <Link href="/licencas">Cancelar</Link>
      </div>
    </form>
  );
}
