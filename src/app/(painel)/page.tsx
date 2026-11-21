export default function Inicio() {
  return (
    <>
      <h1>Painel do Administrador</h1>
      <ul>
        <li><a href="/produtos">Produtos</a></li>
        <li><a href="/clientes">Clientes</a></li>
        <li><a href="/licencas">Licenças</a> (veja também as <a href="/licencas?aVencer=1">Licenças a vencer</a>)</li>
      </ul>
    </>
  );
}
