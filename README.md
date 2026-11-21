# Gerenciador de Licenças

Sistema de código aberto e auto-hospedado para cadastrar Produtos e controlar quem tem direito de usá-los. Cada Instância tem o próprio banco e um único Administrador. O vocabulário está em [`GLOSSARY.md`](GLOSSARY.md) e as decisões em [`docs/adr/`](docs/adr/).

## Subir a Instância

Requisitos: Docker com Docker Compose. Para gerar o hash da senha, também Node 26+ e pnpm.

1. Gere o hash da senha do Administrador. A senha é lida sem aparecer no terminal:

   ```sh
   pnpm install
   pnpm hash-senha
   ```

2. Crie um arquivo `.env` na raiz com as variáveis abaixo:

   ```sh
   POSTGRES_USER=licencas
   POSTGRES_PASSWORD=<senha do banco>
   POSTGRES_DB=licencas

   ADMIN_USUARIO=admin
   ADMIN_SENHA_HASH=<saída do pnpm hash-senha>
   SESSAO_SEGREDO=<gere com: openssl rand -base64 48>
   ```

3. Suba a aplicação e o banco:

   ```sh
   docker compose -f docker-compose.yml up -d --build
   ```

   O `-f docker-compose.yml` deixa de fora o `docker-compose.override.yml`, que é só de desenvolvimento (expõe o Postgres na máquina e cria o banco de testes). Sem o `-f`, o docker compose carrega o override sozinho.

   A cada início, a aplicação aplica as migrações pendentes do banco, em ordem, e só depois passa a atender. O painel fica em <http://localhost:3000>, e `GET /api/saude` informa se a Instância alcança o banco.

Para atualizar a Instância, baixe a versão nova e rode o mesmo comando de novo.

### Variáveis de configuração

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | sim | Credenciais do Postgres do compose. |
| `ADMIN_USUARIO` | sim | Usuário do Administrador. |
| `ADMIN_SENHA_HASH` | sim | Hash scrypt da senha, gerado por `pnpm hash-senha`. |
| `SESSAO_SEGREDO` | sim | Segredo, com no mínimo 32 caracteres, que assina o cookie de sessão. Se for trocado, todas as sessões abertas caem. |
| `SESSAO_HORAS` | não (8) | Duração da sessão do Administrador. |
| `APP_PORTA` | não (3000) | Porta da aplicação na máquina. |
| `POSTGRES_PORTA` | não (5432) | Só em desenvolvimento: porta do Postgres na máquina, aberta só em `127.0.0.1`. |

Sobre a sessão do Administrador:

- Em produção (no Docker), o cookie é `Secure`. Fora de `localhost`, sirva a Instância por HTTPS, por exemplo atrás de um proxy reverso; sem isso, o navegador não guarda a sessão. Em `pnpm dev`, o cookie não é `Secure`.
- A sessão não fica guardada no servidor: sair apaga o cookie do navegador, mas uma cópia do cookie continua valendo até expirar. Trocar a senha não derruba as sessões abertas. Para derrubar todas, troque o `SESSAO_SEGREDO`.

## Desenvolvimento

```sh
docker compose up -d postgres   # com o override: Postgres exposto e com os bancos licencas e licencas_teste
export DATABASE_URL=postgres://licencas:<senha>@localhost:5432/licencas
export DATABASE_URL_TESTE=postgres://licencas:<senha>@localhost:5432/licencas_teste
pnpm db:migrar                  # aplica as migrações no banco de desenvolvimento
pnpm dev                        # também precisa de ADMIN_USUARIO, ADMIN_SENHA_HASH e SESSAO_SEGREDO
```

- `pnpm typecheck`: confere os tipos.
- `pnpm test`: roda os testes (Vitest) contra o Postgres real no banco `licencas_teste`, que é limpo antes de cada teste.
- `pnpm db:gerar`: gera a migração SQL depois de uma mudança em `src/banco/esquema.ts`. Faça commit da migração gerada, em `drizzle/`.

O banco `licencas_teste` é criado na primeira inicialização do volume do Postgres. Se o volume já existia antes, crie-o à mão: `docker compose exec postgres createdb -U licencas licencas_teste`.

### Estrutura

- `src/nucleo/`: o núcleo de licenciamento, onde ficam todas as regras do domínio. Recebe banco, relógio e aleatoriedade injetados. Os testes usam só a interface pública dele.
- `src/app/`: as telas do painel e as rotas da API. Elas só traduzem HTTP e formulários em chamadas ao núcleo.
- `src/acesso/`: a entrada do Administrador (senha e cookie de sessão).
- `src/banco/`: a conexão, o esquema Drizzle e as migrações.
