import { beforeEach, describe, expect, it } from "vitest";
import { relogioDeTeste } from "../../testes/nucleo-de-teste.ts";
import { criarLimitador } from "./limitador.ts";

describe("limitador de requisições por IP", () => {
  let tempo: ReturnType<typeof relogioDeTeste>;
  let limitador: ReturnType<typeof criarLimitador>;

  beforeEach(() => {
    tempo = relogioDeTeste();
    limitador = criarLimitador({ maximo: 3, janelaSegundos: 60 }, tempo.relogio);
  });

  it("aceita requisições até o máximo da janela e recusa a seguinte", () => {
    expect(limitador.registrar("10.0.0.1")).toEqual({ permitido: true });
    expect(limitador.registrar("10.0.0.1")).toEqual({ permitido: true });
    expect(limitador.registrar("10.0.0.1")).toEqual({ permitido: true });
    expect(limitador.registrar("10.0.0.1").permitido).toBe(false);
  });

  it("informa quanto falta, em segundos arredondados para cima, até a janela acabar", () => {
    limitador.registrar("10.0.0.1");
    tempo.avancar(20_500);
    limitador.registrar("10.0.0.1");
    limitador.registrar("10.0.0.1");
    expect(limitador.registrar("10.0.0.1")).toEqual({ permitido: false, esperaSegundos: 40 });
  });

  it("volta a aceitar quando a janela acaba", () => {
    for (let i = 0; i < 4; i++) limitador.registrar("10.0.0.1");
    tempo.avancar(60_000);
    expect(limitador.registrar("10.0.0.1")).toEqual({ permitido: true });
  });

  it("conta cada IP separadamente", () => {
    for (let i = 0; i < 4; i++) limitador.registrar("10.0.0.1");
    expect(limitador.registrar("10.0.0.2")).toEqual({ permitido: true });
  });
});
