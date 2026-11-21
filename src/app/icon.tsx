import { ImageResponse } from "next/og";
import { Simbolo } from "@/componentes/marca";

// O favicon é o mesmo símbolo do cabeçalho, no selo verde da marca, gerado no build.
// As cores são as do tema claro (--acento e --sobre-acento): a imagem não vê as variáveis CSS.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icone() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#1d5c45", borderRadius: 14, color: "#ffffff" }}>
        <Simbolo width={40} height={40} />
      </div>
    ),
    size,
  );
}
