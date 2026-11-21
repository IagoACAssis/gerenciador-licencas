# Padrões de código

Lido na revisão. Cada regra aqui é de julgamento: o que dá para conferir por máquina fica no `pnpm verificar` e no CI.

## Uma regra, um lugar

Cada regra do domínio e cada fato do banco têm uma única fonte da verdade, e o resto do código a chama. Na revisão, procure no diff qualquer conta, constante ou condição que **repete** uma que já existe, mesmo escrita de outro jeito, e aponte a fonte que deveria ser chamada.

As fontes de hoje:

- `src/nucleo/estado.ts`: estado e indicações da Licença ("a vencer", "em Carência"), fim da Carência, fim da Tolerância offline, Limite de ativações que vale (o próprio da Licença ou o padrão do Produto) e início da janela da Cota de substituições. Uma regra nova de cálculo da Licença entra aqui.
- `src/nucleo/licencas.ts`: o que torna inválidos a data de validade e o Limite de ativações próprio (`erroNaDataDeValidade` e `erroNoLimite`, usados na Emissão, na Renovação e na alteração do limite), e a recusa de qualquer ação de ciclo de vida em Licença Revogada (`recusarSeRevogada`).
- `src/nucleo/substituicoes.ts`: quantas Substituições de ativação contam agora para a Cota de substituições.
- `src/nucleo/chave-licenca.ts`: formato, normalização, hash e prefixo da Chave de licença.
- `src/nucleo/chaves.ts`: par de chaves Ed25519 e cifra da chave privada.
- `src/banco/postgres.ts`: teto do `integer`, id válido e detecção de violação de índice único.

Quando a mesma forma aparece pela segunda vez e não há fonte para ela, extraia a fonte no mesmo diff e acrescente-a à lista acima.

## Regras no núcleo

As rotas da API e as telas do painel traduzem HTTP e formulários em chamadas ao núcleo e erros do núcleo em respostas. Uma decisão de negócio (o que é aceito, recusado ou calculado) fica dentro de `src/nucleo/`.

## Exemplos para quem integra

Os exemplos de código em `docs/` (por exemplo, `docs/validacao.md`) são contrato público: quem desenvolve um Produto copia esse código. Na revisão, confira a lógica de cada exemplo contra a spec e contra o núcleo como se fosse código de produção, inclusive os caminhos de recusa e de falha.

## Testes

Os testes usam só a interface pública do núcleo (`src/nucleo/index.ts`) contra o Postgres real, e montam o cenário pelos próprios casos de uso. Os valores esperados vêm da spec ou de um exemplo resolvido à mão, nunca da mesma conta que o código faz.
