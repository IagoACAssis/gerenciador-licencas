// Estilos de botão do painel, para <button> e para <Link> com cara de botão.
// Funciona no servidor e no cliente.
const ESTILOS = {
  primario: "bg-acento text-sobre-acento hover:brightness-110",
  secundario: "bg-superficie text-tinta ring-1 ring-borda hover:bg-elevada",
  perigo: "bg-perigo text-fundo hover:brightness-110",
  fantasma: "text-suave hover:bg-elevada hover:text-tinta",
};

export type EstiloBotao = keyof typeof ESTILOS;

export function classeBotao(estilo: EstiloBotao, extra = ""): string {
  return `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-50 ${ESTILOS[estilo]} ${extra}`.trim();
}
