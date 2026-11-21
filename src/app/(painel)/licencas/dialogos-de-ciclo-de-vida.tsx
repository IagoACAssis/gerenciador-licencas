// Renovar e Reativar, iguais onde aparecem: na página da Licença e no resumo da página inicial.
import { CLASSE_CAMPO, CLASSE_ROTULO } from "@/componentes/campos";
import { DialogoDeConfirmacao } from "@/componentes/dialogo-de-confirmacao";
import type { EstiloBotao } from "@/componentes/botoes";
import { formatarData } from "../formatacao";
import { reativarLicenca, renovarLicenca } from "./acoes";

/** Renovar, com a nova data de validade pedida no diálogo. Só para Licença com data de validade. */
export function DialogoRenovar({ prefixo, validaAte, estilo = "primario" }: { prefixo: string; validaAte: Date; estilo?: EstiloBotao }) {
  return (
    <DialogoDeConfirmacao
      rotulo="Renovar"
      estilo={estilo}
      titulo={`Renovar a Licença ${prefixo}…`}
      descricao={`Muda só a data de validade, hoje ${formatarData(validaAte)}. A Chave de licença e as Ativações continuam as mesmas.`}
      confirmar="Renovar"
      acao={renovarLicenca}
      campos={{ prefixo }}
    >
      <label className={CLASSE_ROTULO}>
        Nova data de validade
        <input name="validaAte" type="date" required className={CLASSE_CAMPO} />
      </label>
    </DialogoDeConfirmacao>
  );
}

/** Reativar a Licença Suspensa. */
export function DialogoReativar({ prefixo, estilo = "secundario" }: { prefixo: string; estilo?: EstiloBotao }) {
  return (
    <DialogoDeConfirmacao
      rotulo="Reativar"
      estilo={estilo}
      titulo={`Reativar a Licença ${prefixo}…?`}
      descricao="As Ativações voltam a valer."
      confirmar="Reativar"
      acao={reativarLicenca}
      campos={{ prefixo }}
    />
  );
}
