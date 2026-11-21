"use server";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { administradorAutenticado } from "@/acesso/administrador";
import { DadosDeProdutoInvalidos, ProdutoNaoEncontrado, type CampoProduto, type DadosProduto } from "@/nucleo/index";
import { nucleoDaInstancia } from "@/nucleo/producao";

export interface EstadoFormularioProduto {
  valores: Record<string, string>;
  erros?: Partial<Record<CampoProduto, string>>;
  mensagem?: string;
}

const CAMPOS = [
  "nome",
  "descricao",
  "janelaAvisoDias",
  "carenciaDias",
  "limiteAtivacoesPadrao",
  "cotaSubstituicoesQuantidade",
  "cotaSubstituicoesDias",
  "toleranciaOfflineDias",
] as const;

// Campo numérico vazio vira NaN, que o núcleo recusa. A Carência vazia vai como null,
// e o núcleo decide o que ela vale.
function numero(texto: string): number {
  return texto.trim() === "" ? Number.NaN : Number(texto);
}

function lerFormulario(dados: FormData) {
  const valores = Object.fromEntries(CAMPOS.map((campo) => [campo, String(dados.get(campo) ?? "")]));
  const produto: DadosProduto = {
    nome: valores.nome,
    descricao: valores.descricao,
    janelaAvisoDias: numero(valores.janelaAvisoDias),
    carenciaDias: valores.carenciaDias.trim() === "" ? null : numero(valores.carenciaDias),
    limiteAtivacoesPadrao: numero(valores.limiteAtivacoesPadrao),
    cotaSubstituicoes: {
      quantidade: numero(valores.cotaSubstituicoesQuantidade),
      dias: numero(valores.cotaSubstituicoesDias),
    },
    toleranciaOfflineDias: numero(valores.toleranciaOfflineDias),
  };
  return { valores, produto };
}

/** Devolve os erros por campo quando o núcleo recusa os dados; relança qualquer outro erro. */
function errosDoFormulario(erro: unknown, valores: Record<string, string>): EstadoFormularioProduto {
  if (erro instanceof DadosDeProdutoInvalidos) return { valores, erros: erro.erros };
  if (erro instanceof ProdutoNaoEncontrado) notFound();
  throw erro;
}

async function exigirAdministrador() {
  // Server Actions podem ser chamadas diretamente; o layout não as protege.
  if (!(await administradorAutenticado())) redirect("/entrar");
}

export async function cadastrarProduto(
  _estado: EstadoFormularioProduto,
  dados: FormData,
): Promise<EstadoFormularioProduto> {
  await exigirAdministrador();
  const { valores, produto } = lerFormulario(dados);
  let identificador: string;
  try {
    identificador = (await nucleoDaInstancia().cadastrarProduto(produto)).identificador;
  } catch (erro) {
    return errosDoFormulario(erro, valores);
  }
  revalidatePath("/produtos");
  redirect(`/produtos/${identificador}`);
}

export async function editarProduto(
  identificador: string,
  _estado: EstadoFormularioProduto,
  dados: FormData,
): Promise<EstadoFormularioProduto> {
  await exigirAdministrador();
  const { valores, produto } = lerFormulario(dados);
  try {
    await nucleoDaInstancia().editarProduto(identificador, produto);
  } catch (erro) {
    return errosDoFormulario(erro, valores);
  }
  revalidatePath("/produtos");
  revalidatePath(`/produtos/${identificador}`);
  return { valores, mensagem: "Produto salvo." };
}
