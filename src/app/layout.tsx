import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { TemaDoNavegador } from "@/componentes/tema-do-navegador";
import { SCRIPT_TEMA } from "@/componentes/tema";
import "./globais.css";

// O next/font baixa as fontes no build e as serve pela própria Instância: nenhuma
// requisição a terceiros quando o painel é usado.
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--fonte-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--fonte-mono" });

export const metadata: Metadata = {
  title: { template: "%s · Licença AI", default: "Licença AI" },
  description: "Licença AI, gerenciador de licenças auto-hospedado.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script do <head> põe data-tema no <html> antes da hidratação.
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <TemaDoNavegador />
        {children}
      </body>
    </html>
  );
}
