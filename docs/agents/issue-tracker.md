# Issue tracker: GitHub

As issues e specs deste repo são issues do GitHub. Use o `gh` CLI em todas as operações. Escreva títulos, corpos e comentários em português.

## Convenções

- **Criar uma issue**: `gh issue create --title "..." --body "..."`. Para corpos com várias linhas, use heredoc.
- **Ler uma issue**: `gh issue view <número> --json number,title,body,labels,comments`.
- **Listar issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`, com os filtros `--label` e `--state` adequados.
- **Tornar uma issue sub-issue de outra (pai)**: `gh issue create --parent <pai> ...`, ou depois `gh issue edit <pai> --add-sub-issue <filha>` (`gh` 2.94+). Com `gh` mais antigo: `gh api --method POST repos/<owner>/<repo>/issues/<pai>/sub_issues -F sub_issue_id=<id-db-da-filha>`, usando o id de banco como em **Bloqueio** abaixo. Sem sub-issues, coloque `Parte de #<pai>` no topo do corpo da filha.
- **Comentar numa issue**: `gh issue comment <número> --body "..."`
- **Aplicar / remover labels**: `gh issue edit <número> --add-label "..."` / `--remove-label "..."`
- **Fechar**: `gh issue close <número> --comment "..."`

O repo é inferido de `git remote -v`. O `gh` faz isso sozinho quando roda dentro do clone.

## Pull requests como entrada de triagem

**PRs como canal de pedidos (PRs as a request surface): não (no).** _(Mude para `sim (yes)` se este repo tratar PRs externos como pedidos de funcionalidade. O `/triage` lê esta flag.)_

Com a flag em `sim`, os PRs passam pelos mesmos labels e estados das issues, usando os equivalentes `gh pr`:

- **Ler um PR**: `gh pr view <número> --comments`, e `gh pr diff <número>` para o diff.
- **Listar PRs externos para triagem**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Comentar / rotular / fechar**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

No GitHub, issues e PRs dividem a mesma numeração, então um `#42` sozinho pode ser qualquer um dos dois. Tente `gh pr view 42` e, se falhar, `gh issue view 42`.

## Quando uma skill disser "publish to the issue tracker" (publicar no issue tracker)

Crie uma issue no GitHub.

## Quando uma skill disser "fetch the relevant ticket" (buscar o ticket relevante)

Leia a issue como em **Ler uma issue** acima.

## Operações de wayfinding

Usadas pelo `/wayfinder`. O **mapa** é uma única issue, e os tickets são issues **filhas** dela. Os labels `wayfinder:*` ficam em inglês porque a skill depende desses nomes exatos.

- **Mapa**: uma única issue com o label `wayfinder:map`, cujo corpo traz Notes / Decisions-so-far / Fog. Crie com `gh issue create --label wayfinder:map`.
- **Ticket filho**: uma issue ligada ao mapa como sub-issue do GitHub (veja **Tornar uma issue sub-issue de outra**). Onde não houver sub-issues, adicione a filha a uma task list no corpo do mapa e coloque `Parte de #<mapa>` no topo do corpo da filha. Labels: `wayfinder:<tipo>` (`research`/`prototype`/`grilling`/`task`). Quando o ticket for assumido, ele é atribuído ao dev que conduz o trabalho.
- **Bloqueio**: use as **dependências nativas de issue** do GitHub, que são a representação oficial e aparecem na interface. Adicione uma dependência com `gh api --method POST repos/<owner>/<repo>/issues/<filha>/dependencies/blocked_by -F issue_id=<id-db-do-bloqueador>`. O `<id-db-do-bloqueador>` é o **id de banco** numérico do bloqueador (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`), e _não_ o `#número` nem o `node_id`. O GitHub informa `issue_dependencies_summary.blocked_by`, que conta só os bloqueadores abertos e é a trava em tempo real. Onde não houver dependências, use uma linha `Bloqueada por: #<n>, #<n>` no topo do corpo da filha. Um ticket fica desbloqueado quando todos os bloqueadores estão fechados.
- **Consulta da fronteira**: liste as filhas abertas do mapa (`gh issue list --state open`, restrito às sub-issues ou à task list do mapa). Descarte as que têm bloqueador aberto (`issue_dependencies_summary.blocked_by > 0`, ou uma issue aberta na linha `Bloqueada por`) e as que já têm responsável. A primeira que sobrar, na ordem do mapa, é a próxima.
- **Assumir**: `gh issue edit <n> --add-assignee @me`. Esta é a primeira escrita da sessão.
- **Resolver**: `gh issue comment <n> --body "<resposta>"`, depois `gh issue close <n>`, e por fim acrescente um ponteiro de contexto (resumo + link) às Decisions-so-far do mapa.
