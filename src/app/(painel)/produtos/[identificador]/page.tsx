import Link from "next/link";
import { notFound } from "next/navigation";
import { nucleoDaInstancia } from "@/nucleo/producao";
import { editarProduto } from "../acoes";
import { BotaoCopiar } from "../../botao-copiar";
import { FormularioProduto } from "../formulario-produto";
import { excluirProduto } from "../../excluidos/acoes";
import { FormularioExclusao } from "../../excluidos/formulario-exclusao";

export const dynamic = "force-dynamic";

export default async function DetalheProduto({ params }: { params: Promise<{ identificador: string }> }) {
  const { identificador } = await params;
  const produto = await nucleoDaInstancia().obterProduto(identificador);
  if (!produto) notFound();
  const { regras } = produto;

  return (
    <>
      <p><Link href="/produtos">← Produtos</Link></p>
      <h1>{produto.nome}</h1>
      <p>
        <Link href={`/licencas?produto=${produto.identificador}`}>Licenças: {produto.licencas}</Link>
        {" · "}
        <Link href={`/licencas/nova?produto=${produto.identificador}`}>Emitir Licença</Link>
      </p>

      <section className="cartao">
        <h2>Para embutir no Produto</h2>
        <p>O Produto envia o identificador público na Validação e confere a Resposta assinada com a chave pública.</p>
        <h3>Identificador público</h3>
        <pre>{produto.identificador}</pre>
        <BotaoCopiar texto={produto.identificador} rotulo="Copiar identificador" />
        <h3>Chave pública (Ed25519, PEM)</h3>
        <pre>{produto.chavePublica}</pre>
        <BotaoCopiar texto={produto.chavePublica} rotulo="Copiar chave pública" />
      </section>

      <h2>Editar</h2>
      <p>Mudanças nas regras valem na hora para todas as Licenças do Produto.</p>
      <FormularioProduto
        acao={editarProduto.bind(null, produto.identificador)}
        rotuloBotao="Salvar"
        valoresIniciais={{
          nome: produto.nome,
          descricao: produto.descricao,
          janelaAvisoDias: String(regras.janelaAvisoDias),
          carenciaDias: String(regras.carenciaDias),
          limiteAtivacoesPadrao: String(regras.limiteAtivacoesPadrao),
          cotaSubstituicoesQuantidade: String(regras.cotaSubstituicoes.quantidade),
          cotaSubstituicoesDias: String(regras.cotaSubstituicoes.dias),
          toleranciaOfflineDias: String(regras.toleranciaOfflineDias),
        }}
      />

      <h2>Exclusão</h2>
      <p>
        Para um Produto cadastrado por engano. Ele e as Licenças dele saem das listas, e a Validação com o
        identificador dele passa a responder 404. Não é possível com Licença Ativa ou Suspensa.
      </p>
      <FormularioExclusao acao={excluirProduto} campos={{ identificador: produto.identificador }} item="este Produto" />
    </>
  );
}
