import { nucleoDaInstancia } from "@/nucleo/producao";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await nucleoDaInstancia().verificarSaude());
  } catch {
    return Response.json({ banco: "indisponivel" }, { status: 503 });
  }
}
