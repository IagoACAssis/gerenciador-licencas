import type { EstadoRecusavel } from "../formulario-recusavel";
import { FormularioRecusavel } from "../formulario-recusavel";

/** Botão de Exclusão com confirmação, para o fim do detalhe de um Produto, Cliente ou Licença. */
export function FormularioExclusao({ acao, campos, item }: {
  acao: (estado: EstadoRecusavel, formulario: FormData) => Promise<EstadoRecusavel>;
  campos: Record<string, string>;
  /** Como o item aparece na confirmação: "este Produto", "esta Licença". */
  item: string;
}) {
  return (
    <FormularioRecusavel acao={acao} campos={campos} className="acao">
      <label className="confirmacao">
        <input name="confirmacao" type="checkbox" value="sim" required />
        Excluir {item}. Nada é apagado: dá para restaurar na lista de excluídos.
      </label>
      <button type="submit">Excluir</button>
    </FormularioRecusavel>
  );
}
