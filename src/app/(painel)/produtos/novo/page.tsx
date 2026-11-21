import Link from "next/link";
import { cadastrarProduto } from "../acoes";
import { FormularioProduto } from "../formulario-produto";

export default function NovoProduto() {
  return (
    <>
      <p><Link href="/produtos">← Produtos</Link></p>
      <h1>Cadastrar Produto</h1>
      <p>Ao cadastrar, a Instância gera o par de chaves de assinatura e o identificador público do Produto.</p>
      <FormularioProduto
        acao={cadastrarProduto}
        rotuloBotao="Cadastrar"
        valoresIniciais={{ janelaAvisoDias: "15", carenciaDias: "", limiteAtivacoesPadrao: "1",
          cotaSubstituicoesQuantidade: "1", cotaSubstituicoesDias: "30", toleranciaOfflineDias: "7" }}
      />
    </>
  );
}
