import { and, count, eq, gt } from "drizzle-orm";
import type { Banco } from "../banco/conexao.ts";
import { substituicoesAtivacao } from "../banco/esquema.ts";
import { inicioDaJanelaDeSubstituicoes } from "./estado.ts";

/** Quantas Substituições de ativação a Licença fez no período atual da Cota de substituições. */
export async function substituicoesNoPeriodo(
  banco: Pick<Banco, "select">,
  licenca: { id: number; contagemSubstituicoesZeradaEm: Date | null },
  regras: { cotaSubstituicoesDias: number },
  agora: Date,
): Promise<number> {
  const [{ total } = { total: 0 }] = await banco
    .select({ total: count() })
    .from(substituicoesAtivacao)
    .where(
      and(
        eq(substituicoesAtivacao.licencaId, licenca.id),
        gt(substituicoesAtivacao.feitaEm, inicioDaJanelaDeSubstituicoes(licenca, regras, agora)),
      ),
    );
  return total;
}
