"use client";
import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import { classeBotao } from "@/componentes/botoes";
import { DestaqueDaChaveNova } from "@/componentes/chave-nova";
import { DialogoDeConfirmacao, type EstadoDoDialogo } from "@/componentes/dialogo-de-confirmacao";
import { trocarChave } from "../acoes";

interface ChaveTrocada {
  chave: string;
  prefixo: string;
}

const MostrarChaveNova = createContext<((trocada: ChaveTrocada) => void) | null>(null);

/**
 * Envolve o detalhe da Licença. Depois da Troca de chave, troca o detalhe inteiro
 * pela Chave nova, mostrada uma única vez: o detalhe ainda é o do prefixo antigo,
 * que deixou de existir, e as ações dele não valem mais.
 */
export function AreaDaTrocaDeChave({ children }: { children: ReactNode }) {
  const [trocada, setTrocada] = useState<ChaveTrocada | null>(null);
  if (trocada) {
    return (
      <DestaqueDaChaveNova titulo="Chave trocada" chave={trocada.chave}>
        <Link href={`/licencas/${trocada.prefixo}`} className={classeBotao("secundario")}>
          Ver a Licença {trocada.prefixo}…
        </Link>
      </DestaqueDaChaveNova>
    );
  }
  return <MostrarChaveNova value={setTrocada}>{children}</MostrarChaveNova>;
}

/** Botão da Troca de chave, com o diálogo de confirmação. Precisa estar dentro de AreaDaTrocaDeChave. */
export function BotaoTrocarChave({ prefixo }: { prefixo: string }) {
  const mostrarChaveNova = useContext(MostrarChaveNova);
  if (!mostrarChaveNova) throw new Error("BotaoTrocarChave precisa estar dentro de AreaDaTrocaDeChave.");
  const mostrar = mostrarChaveNova;

  async function trocar(_estado: EstadoDoDialogo, formulario: FormData): Promise<EstadoDoDialogo> {
    const { erro, trocada } = await trocarChave({}, formulario);
    if (!trocada) return { erro };
    mostrar(trocada);
    return { aviso: "Chave trocada. A anterior deixou de valer." };
  }

  return (
    <DialogoDeConfirmacao
      rotulo="Trocar chave"
      estilo="perigoContorno"
      titulo="Trocar a Chave de licença?"
      descricao="A Chave atual deixa de valer na hora, e o Cliente vai precisar da nova. Ela aparece uma única vez, para você copiar. As Ativações, a data de validade e o histórico continuam os mesmos."
      confirmar="Trocar chave"
      perigoso
      enviarConfirmacao
      acao={trocar}
      campos={{ prefixo }}
    />
  );
}
