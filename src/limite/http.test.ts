import { beforeEach, describe, expect, it } from "vitest";
import { relogioDeTeste } from "../../testes/nucleo-de-teste.ts";
import { barrarExcesso } from "./http.ts";
import { criarLimitador } from "./limitador.ts";

function requisicaoDe(cabecalhos: Record<string, string>) {
  return new Request("http://localhost/api/validacao", { method: "POST", headers: cabecalhos });
}

describe("barrar o excesso de requisições numa rota da API", () => {
  let tempo: ReturnType<typeof relogioDeTeste>;
  let limitador: ReturnType<typeof criarLimitador>;

  beforeEach(() => {
    tempo = relogioDeTeste();
    limitador = criarLimitador({ maximo: 1, janelaSegundos: 60 }, tempo.relogio);
  });

  it("deixa a requisição seguir dentro do limite", () => {
    expect(barrarExcesso(limitador, requisicaoDe({ "x-forwarded-for": "203.0.113.7" }))).toBeNull();
  });

  it("responde 429 com o tempo de espera quando o IP passa do limite", async () => {
    const requisicao = () => requisicaoDe({ "x-forwarded-for": "203.0.113.7" });
    barrarExcesso(limitador, requisicao());
    tempo.avancar(15_000);

    const resposta = barrarExcesso(limitador, requisicao());

    expect(resposta?.status).toBe(429);
    expect(resposta?.headers.get("Retry-After")).toBe("45");
    expect(await resposta?.json()).toEqual({
      erro: "Muitas requisições. Tente de novo em 45 segundos.",
      esperaSegundos: 45,
    });
  });

  it("identifica o IP pela última entrada do x-forwarded-for, a que o proxy reverso acrescentou", () => {
    barrarExcesso(limitador, requisicaoDe({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }));

    expect(barrarExcesso(limitador, requisicaoDe({ "x-forwarded-for": "2.2.2.2, 203.0.113.7" }))?.status).toBe(429);
    expect(barrarExcesso(limitador, requisicaoDe({ "x-forwarded-for": "203.0.113.8" }))).toBeNull();
  });

  it("usa o x-real-ip quando não há x-forwarded-for", () => {
    barrarExcesso(limitador, requisicaoDe({ "x-real-ip": "203.0.113.7" }));

    expect(barrarExcesso(limitador, requisicaoDe({ "x-real-ip": "203.0.113.7" }))?.status).toBe(429);
    expect(barrarExcesso(limitador, requisicaoDe({ "x-real-ip": "203.0.113.8" }))).toBeNull();
  });
});
