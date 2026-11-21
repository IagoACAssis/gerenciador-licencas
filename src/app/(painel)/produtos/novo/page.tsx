import type { Metadata } from "next";
import { CabecalhoDaPagina, LinkDeVolta } from "@/componentes/pagina";
import { cadastrarProduto } from "../acoes";
import { FormularioProduto } from "../formulario-produto";

export const metadata: Metadata = { title: "Cadastrar Produto" };

export default function NovoProduto() {
  return (
    <div className="grid gap-8">
      <LinkDeVolta href="/produtos">Produtos</LinkDeVolta>
      <CabecalhoDaPagina
        titulo="Cadastrar Produto"
        descricao="Ao cadastrar, a Instância gera o par de chaves de assinatura e o identificador público do Produto."
      />
      <FormularioProduto
        acao={cadastrarProduto}
        rotuloBotao="Cadastrar"
        cancelar="/produtos"
        valoresIniciais={{ janelaAvisoDias: "15", carenciaDias: "", limiteAtivacoesPadrao: "1",
          cotaSubstituicoesQuantidade: "1", cotaSubstituicoesDias: "30", toleranciaOfflineDias: "7" }}
      />
    </div>
  );
}
