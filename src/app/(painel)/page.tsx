import type { Metadata } from "next";

export const metadata: Metadata = { title: "Início" };

export default function Inicio() {
  return (
    <div className="legado">
      <h1>Painel do Administrador</h1>
      <ul>
        <li><a href="/produtos">Produtos</a></li>
        <li><a href="/clientes">Clientes</a></li>
        <li><a href="/licencas">Licenças</a> (veja também as <a href="/licencas?aVencer=1">Licenças a vencer</a>)</li>
        <li><a href="/excluidos">Excluídos</a></li>
      </ul>
    </div>
  );
}
