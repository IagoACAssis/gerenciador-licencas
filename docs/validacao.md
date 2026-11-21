# API de Validação e Resposta assinada

Este documento é para quem desenvolve um Produto. Ele explica como consultar a Instância e como conferir a Resposta assinada sem depender da rede (ADR-0002).

## Pedido

```http
POST /api/v1/validacoes
Content-Type: application/json

{
  "produto": "prd_…",
  "chave": "ABCD-EFGH-…",
  "dispositivo": "id-opaco-do-dispositivo",
  "nomeDispositivo": "Notebook da Ana",
  "nonce": "valor-aleatório-novo-a-cada-pedido"
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `produto` | sim | Identificador público do Produto, mostrado no painel, até 100 caracteres. Não é credencial. |
| `chave` | sim | Chave de licença informada pelo Cliente. Hífens, espaços e maiúsculas/minúsculas não importam. |
| `dispositivo` | sim | Identificador do Dispositivo, de 1 a 200 caracteres. A Instância não o interpreta: use algo estável por máquina, instalação ou conta. |
| `nomeDispositivo` | não | Nome legível, até 200 caracteres, mostrado ao Administrador no painel. Se vier numa Validação seguinte, substitui o anterior. |
| `nonce` | não | De 1 a 200 caracteres. Volta dentro da carga assinada. Gere um valor novo a cada pedido para não aceitar uma resposta antiga reapresentada como nova. |

Não existe credencial de Produto: quem autentica o pedido é a Chave de licença.

## Respostas HTTP

| Status | Quando | Corpo |
| --- | --- | --- |
| `200` | Toda resposta de negócio, aceita **ou recusada** | `{ "carga": "<JSON em texto>", "assinatura": "<base64url>" }` |
| `400` | Pedido malformado (JSON inválido, campo faltando ou fora do tamanho) | `{ "erro": "…", "erros": { "<campo>": "…" } }`, sem assinatura |
| `404` | Identificador de Produto inexistente | `{ "erro": "Produto não encontrado." }`, sem assinatura (trate como erro de configuração) |
| `429` | Limite de requisições por IP excedido | `{ "erro": "…", "esperaSegundos": n }` e o cabeçalho `Retry-After` |

Só a resposta `200` é assinada. As outras não decidem nada sobre a Licença: o Produto não deve tratá-las como aceitação nem como recusa definitiva.

## Resposta assinada

- `carga` é um texto JSON serializado uma única vez pela Instância. **Confira a assinatura sobre os bytes UTF-8 desse texto exatamente como chegou**, sem reserializar, e só depois faça o parse.
- `assinatura` é a assinatura Ed25519 desses bytes, em base64url, feita com a chave privada do Produto. A chave pública (PEM, SPKI) aparece no painel, na página do Produto, para você embutir no Produto.

### Campos da carga

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `produto` | texto | Identificador público do Produto. |
| `licenca` | texto | Prefixo da Chave de licença, como `"ABCD-EFGH"`. **Ausente** na recusa `chave_invalida`. |
| `dispositivo` | texto | O identificador do Dispositivo enviado. |
| `resultado` | `"aceita"` ou `"recusada"` | Se a Licença pode ser usada neste Dispositivo. |
| `motivo` | texto ou `null` | `null` na aceitação. Nas recusas: `chave_invalida`, `licenca_expirada`, `licenca_suspensa`, `licenca_revogada` ou `limite_de_ativacoes_atingido`. |
| `estado` | texto | `Ativa`, `Expirada`, `Suspensa` ou `Revogada`. Ausente em `chave_invalida`. |
| `aVencer` | booleano | Licença Ativa dentro da Janela de aviso do Produto. Ausente em `chave_invalida`. |
| `emCarencia` | booleano | Licença Expirada dentro da Carência: ainda é aceita. Ausente em `chave_invalida`. |
| `dataDeValidade` | data ou `null` | Data de validade da Licença; `null` quando ela é perpétua. Ausente em `chave_invalida`. Use-a para mostrar quantos dias faltam. |
| `emitidaEm` | data | Quando a Instância emitiu esta resposta. |
| `validaAte` | data | Até quando esta resposta vale offline. Na aceitação, é o menor entre `emitidaEm` + Tolerância offline e `dataDeValidade` + Carência. Nas recusas, é igual a `emitidaEm`: uma recusa não vale por um período. |
| `nonce` | texto ou `null` | O nonce enviado no pedido, ou `null`. |

Datas em ISO 8601, em UTC (`2026-01-08T12:00:00.000Z`). Campos novos podem ser acrescentados no futuro: ignore os que não conhecer.

A recusa `chave_invalida` é a mesma para Chave inexistente e para Chave de outro Produto, para que ninguém descubra nada pela resposta. Recusas por estado (`licenca_*`) não criam nem atualizam Ativações.

Exemplo de carga aceita:

```json
{"produto":"prd_x1…","licenca":"ABCD-EFGH","dispositivo":"pc-01","resultado":"aceita","motivo":null,"estado":"Ativa","aVencer":false,"emCarencia":false,"dataDeValidade":"2027-01-31T23:59:59.999Z","emitidaEm":"2026-11-21T12:00:00.000Z","validaAte":"2026-11-28T12:00:00.000Z","nonce":"5f2c…"}
```

## Como o Produto confere a resposta

Toda resposta passa por estas conferências:

1. **Assinatura**: confira com a chave pública embutida no Produto, sobre o texto `carga` recebido. Se falhar, descarte a resposta e trate como falha de rede: ela pode ter vindo de uma API falsa.
2. **Identidade**: `produto` é o identificador do seu Produto e `dispositivo` é o deste Dispositivo. `licenca`, quando vier, é o começo da Chave que o Cliente informou: os 8 primeiros caracteres sem hífen, em dois grupos de 4. Isso impede usar a resposta de outro Produto, de outra Licença ou de outro Dispositivo.

Depois, a conferência depende de a resposta ser nova ou guardada:

- **Resposta nova** (a do pedido que você acabou de fazer): `nonce` tem que ser o que você enviou. Se não bater, a resposta é antiga ou de outro pedido. Uma resposta nova vale na hora, tanto aceita quanto recusada. **Uma recusa substitui qualquer aceitação guardada**: apague a aceitação guardada e pare de usar a Licença.
- **Resposta guardada** (uso offline, sem nova Validação): guarde só respostas aceitas. Ela sustenta o uso enquanto o momento atual estiver entre `emitidaEm` e `validaAte`. Fora disso, faça uma nova Validação. Recusas nunca são guardadas: elas já nascem com `validaAte` igual a `emitidaEm`.

Use a Licença só se `resultado` for `"aceita"`.

Exemplo em Node, sem dependências:

```js
import { verify } from "node:crypto";

const CHAVE_PUBLICA = `-----BEGIN PUBLIC KEY-----
…
-----END PUBLIC KEY-----`;
const PRODUTO = "prd_…";

/** Assinatura e identidade. Devolve a carga lida, ou null se a resposta não for desta Licença neste Dispositivo. */
function lerResposta({ carga, assinatura }, { chave, dispositivo }) {
  const autentica = verify(null, Buffer.from(carga, "utf8"), CHAVE_PUBLICA, Buffer.from(assinatura, "base64url"));
  if (!autentica) return null;
  const dados = JSON.parse(carga);
  const normalizada = chave.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const prefixo = `${normalizada.slice(0, 4)}-${normalizada.slice(4, 8)}`;
  if (dados.produto !== PRODUTO || dados.dispositivo !== dispositivo) return null;
  if (dados.licenca !== undefined && dados.licenca !== prefixo) return null;
  return dados;
}

/** Resposta nova: confere o nonce. Aceita ou recusada, vale na hora. */
function conferirRespostaNova(resposta, pedido) {
  const dados = lerResposta(resposta, pedido);
  return dados && dados.nonce === pedido.nonce ? dados : null;
}

/** Resposta aceita guardada: vale só dentro da janela emitidaEm..validaAte. */
function conferirRespostaGuardada(resposta, pedido, agora = new Date()) {
  const dados = lerResposta(resposta, pedido);
  if (!dados || dados.resultado !== "aceita") return null;
  if (agora < new Date(dados.emitidaEm) || agora > new Date(dados.validaAte)) return null;
  return dados;
}

const pedido = { chave, dispositivo, nonce: crypto.randomUUID() };
const http = await fetch("https://licencas.exemplo.com/api/v1/validacoes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ produto: PRODUTO, ...pedido }),
}).catch(() => null);

if (http?.status === 200) {
  const resposta = await http.json();
  const dados = conferirRespostaNova(resposta, pedido);
  if (dados?.resultado === "aceita") guardar(resposta); // { carga, assinatura }
  else if (dados) apagarGuardada(); // recusa autêntica: pare de usar a Licença
} else {
  // Sem rede, erro ou resposta não conferida: use a aceitação guardada, se ainda valer.
  const guardada = lerGuardada();
  const dados = guardada && conferirRespostaGuardada(guardada, pedido);
}
```

O relógio local do Dispositivo pode ser atrasado de propósito para esticar uma resposta guardada. Se isso importar para o seu Produto, guarde o maior `emitidaEm` já visto e recuse respostas guardadas quando o relógio estiver antes dele.
