import type { ReactNode } from "react";
import "./estilos.css";

export const metadata = { title: "Gerenciador de Licenças" };

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
