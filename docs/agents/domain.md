# Docs de domínio

Como as skills de engenharia devem usar a documentação de domínio deste repo ao explorar o código. Glossário e ADRs são escritos em português.

## Antes de explorar, leia

- **`GLOSSARY.md`** na raiz do repo, ou
- **`GLOSSARY-MAP.md`** na raiz, se existir. Ele aponta para um `GLOSSARY.md` por contexto; leia os que tiverem relação com o assunto.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você vai trabalhar. Em repos multi-context, veja também `src/<contexto>/docs/adr/` para decisões de um contexto específico.

Se algum desses arquivos não existir, **siga em silêncio**. Não aponte a ausência e não sugira criá-los de antemão. A skill `/domain-modeling` (chamada via `/grill-with-docs` e `/improve-codebase-architecture`) cria esses arquivos sob demanda, quando termos ou decisões forem de fato definidos.

## Estrutura de arquivos

Este repo é single-context:

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-exemplo-de-decisao.md
│   └── 0002-outra-decisao.md
└── src/
```

Repo multi-context (identificado pela presença de `GLOSSARY-MAP.md` na raiz):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← decisões do sistema todo
└── src/
    ├── contexto-a/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← decisões do contexto
    └── contexto-b/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando o que você produzir nomear um conceito de domínio (no título de uma issue, numa proposta de refatoração, numa hipótese, no nome de um teste), use o termo como está definido no `GLOSSARY.md`. Não troque por sinônimos que o glossário evita.

Se o conceito de que você precisa ainda não está no glossário, preste atenção: ou você está inventando um termo que o projeto não usa (reconsidere), ou há uma lacuna de verdade (anote para o `/domain-modeling`).

## Aponte conflitos com ADRs

Se o que você produzir contradizer um ADR existente, diga isso explicitamente em vez de passar por cima dele sem avisar:

> _Contradiz o ADR-0007 (pedidos com event sourcing), mas vale reabrir porque…_
