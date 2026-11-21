import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";

describe("saúde da Instância", () => {
  const { nucleo, tempo } = nucleoDeTeste();

  it("informa que o banco respondeu e o momento atual do relógio da Instância", async () => {
    expect(await nucleo.verificarSaude()).toEqual({
      banco: "ok",
      verificadaEm: new Date("2026-01-01T12:00:00Z"),
    });
  });

  it("acompanha o relógio quando o tempo avança", async () => {
    tempo.avancar(60 * 60 * 1000);
    expect((await nucleo.verificarSaude()).verificadaEm).toEqual(new Date("2026-01-01T13:00:00Z"));
  });
});
