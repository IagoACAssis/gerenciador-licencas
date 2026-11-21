// As áreas do painel, na ordem das abas da barra do topo. A paleta de comandos oferece as mesmas.
export const AREAS_DO_PAINEL = [
  { href: "/", rotulo: "Início" },
  { href: "/produtos", rotulo: "Produtos" },
  { href: "/clientes", rotulo: "Clientes" },
  { href: "/licencas", rotulo: "Licenças" },
  { href: "/excluidos", rotulo: "Excluídos" },
];

/** O filtro da lista de Licenças que mostra só as a vencer: `?aVencer=1`. */
export const FILTRO_A_VENCER = { nome: "aVencer", valor: "1" } as const;

/** A lista das Licenças a vencer. */
export const LICENCAS_A_VENCER = `/licencas?${FILTRO_A_VENCER.nome}=${FILTRO_A_VENCER.valor}`;
