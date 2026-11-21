"use server";
import { redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { emGrupos } from "@/nucleo/chave-licenca";
import { nucleoDaInstancia } from "@/nucleo/producao";

export interface ItemDaPaleta {
  grupo: "Ação" | "Ir para" | "Licença" | "Cliente" | "Produto";
  rotulo: string;
  detalhe?: string;
  href: string;
  /** Outras formas de achar o item, além do grupo, do rótulo e do detalhe. */
  termos?: string;
}

/**
 * Licenças, Clientes e Produtos para a paleta de comandos, das listagens do núcleo,
 * que já deixam de fora o que foi excluído. Carregado a cada abertura da paleta,
 * para que um cadastro novo apareça sem recarregar a página.
 */
export async function carregarItensDaPaleta(): Promise<ItemDaPaleta[]> {
  // O proxy e o layout já exigem sessão; a Server Action confere de novo por ser um ponto de entrada próprio.
  if (!(await administradorAutenticado())) redirect("/entrar");

  const nucleo = nucleoDaInstancia();
  const [licencas, clientes, produtos] = await Promise.all([
    nucleo.listarLicencas(),
    nucleo.listarClientes(),
    nucleo.listarProdutos(),
  ]);
  return [
    ...licencas.map((l): ItemDaPaleta => ({
      grupo: "Licença",
      rotulo: `${l.cliente.nome} · ${l.produto.nome}`,
      detalhe: `${l.prefixo}…`,
      href: `/licencas/${l.prefixo}`,
      // O prefixo também é achado como aparece na Chave, com hífen: "ABCD-EF".
      termos: emGrupos(l.prefixo),
    })),
    ...clientes.map((c): ItemDaPaleta => ({ grupo: "Cliente", rotulo: c.nome, detalhe: c.email, href: `/clientes/${c.id}` })),
    ...produtos.map((p): ItemDaPaleta => ({ grupo: "Produto", rotulo: p.nome, detalhe: p.identificador, href: `/produtos/${p.identificador}` })),
  ];
}
