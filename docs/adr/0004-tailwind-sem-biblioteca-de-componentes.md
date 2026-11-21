# Tailwind sem biblioteca de componentes

O painel é estilizado com Tailwind, e os componentes interativos (diálogos de confirmação, menus, avisos temporários) são feitos com elementos nativos do HTML, como `<dialog>` e a Popover API, em vez de uma biblioteca como shadcn/ui, Radix, Headless UI ou MUI. O caminho óbvio seria o shadcn/ui, mas as bibliotecas de componentes trazem uma cara reconhecível de coisa importada, e o objetivo é uma identidade visual própria, com efeitos e animações desenhados para ela. Os elementos nativos já trazem o foco preso, a tecla Esc e a acessibilidade, que é o que justificaria uma biblioteca. As animações também ficam no CSS e no Tailwind, sem biblioteca de animação.

## Consequências

- Se os elementos nativos não atenderem a um caso, a saída é rever esta decisão para aquele componente, não adotar uma biblioteca inteira.
