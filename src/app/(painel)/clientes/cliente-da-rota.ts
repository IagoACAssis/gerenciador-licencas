import { cache } from "react";
import { nucleoDaInstancia } from "@/nucleo/producao";

/** O Cliente do id na rota, ou null se o id não for um número ou não existir. Uma consulta só por requisição. */
export const obterClienteDaRota = cache(async (id: string) =>
  /^\d+$/.test(id) ? nucleoDaInstancia().obterCliente(Number(id)) : null,
);
