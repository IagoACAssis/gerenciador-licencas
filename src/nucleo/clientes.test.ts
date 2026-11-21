import { describe, expect, it } from "vitest";
import { nucleoDeTeste } from "../../testes/nucleo-de-teste.ts";
import { ClienteNaoEncontrado, DadosDeClienteInvalidos } from "./index.ts";

/** Executa a ação e devolve os erros por campo da recusa (falha se não houver recusa). */
async function errosDaRecusa(acao: () => Promise<unknown>) {
  const erro = await acao().then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(DadosDeClienteInvalidos);
  return (erro as DadosDeClienteInvalidos).erros;
}

describe("cadastro de Clientes", () => {
  const { nucleo } = nucleoDeTeste();

  it("cadastra um Cliente com nome e e-mail e o devolve na lista", async () => {
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana Souza", email: "ana@exemplo.com" });

    expect(cliente).toEqual({
      id: expect.any(Number),
      nome: "Ana Souza",
      email: "ana@exemplo.com",
      criadoEm: new Date("2026-01-01T12:00:00Z"),
      atualizadoEm: new Date("2026-01-01T12:00:00Z"),
    });
    expect(await nucleo.listarClientes()).toEqual([cliente]);
  });

  it("guarda o nome sem espaços nas pontas e o e-mail normalizado", async () => {
    const cliente = await nucleo.cadastrarCliente({ nome: "  Ana Souza ", email: "  Ana@Exemplo.COM " });

    expect(cliente.nome).toBe("Ana Souza");
    expect(cliente.email).toBe("ana@exemplo.com");
  });

  it("recusa o cadastro sem nome", async () => {
    const erros = await errosDaRecusa(() => nucleo.cadastrarCliente({ nome: "   ", email: "ana@exemplo.com" }));

    expect(erros).toEqual({ nome: "Informe o nome do Cliente." });
    expect(await nucleo.listarClientes()).toEqual([]);
  });

  it("recusa o cadastro com e-mail em formato inválido", async () => {
    const erros = await errosDaRecusa(() => nucleo.cadastrarCliente({ nome: "Ana", email: "ana.exemplo.com" }));

    expect(erros).toEqual({ email: "Informe um e-mail válido." });
  });

  it("recusa o cadastro sem e-mail", async () => {
    const erros = await errosDaRecusa(() => nucleo.cadastrarCliente({ nome: "Ana", email: "" }));

    expect(erros).toEqual({ email: "Informe o e-mail do Cliente." });
  });

  it("aponta os erros de todos os campos de uma vez", async () => {
    const erros = await errosDaRecusa(() => nucleo.cadastrarCliente({ nome: "", email: "sem-arroba" }));

    expect(erros).toEqual({ nome: "Informe o nome do Cliente.", email: "Informe um e-mail válido." });
  });

  it("recusa o cadastro com e-mail já usado por outro Cliente, mesmo com outras maiúsculas", async () => {
    await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });

    const erros = await errosDaRecusa(() => nucleo.cadastrarCliente({ nome: "Outra Ana", email: "ANA@exemplo.com" }));

    expect(erros).toEqual({ email: "Já existe um Cliente com este e-mail." });
    expect(await nucleo.listarClientes()).toHaveLength(1);
  });

  it("lista os Clientes em ordem de nome", async () => {
    await nucleo.cadastrarCliente({ nome: "Carla", email: "carla@exemplo.com" });
    await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });
    await nucleo.cadastrarCliente({ nome: "Bruno", email: "bruno@exemplo.com" });

    expect((await nucleo.listarClientes()).map((c) => c.nome)).toEqual(["Ana", "Bruno", "Carla"]);
  });

  it("obtém um Cliente pelo id", async () => {
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });

    expect(await nucleo.obterCliente(cliente.id)).toEqual(cliente);
  });

  it("não encontra um Cliente que não existe", async () => {
    expect(await nucleo.obterCliente(999)).toBeNull();
    expect(await nucleo.obterCliente(Number.NaN)).toBeNull();
  });
});

describe("edição de Clientes", () => {
  const { nucleo, tempo } = nucleoDeTeste();

  it("edita o nome e o e-mail e registra o momento da edição", async () => {
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });
    tempo.avancar(60 * 60 * 1000);

    const editado = await nucleo.editarCliente(cliente.id, { nome: "Ana Souza", email: " ANA.SOUZA@exemplo.com" });

    expect(editado).toEqual({
      id: cliente.id,
      nome: "Ana Souza",
      email: "ana.souza@exemplo.com",
      criadoEm: new Date("2026-01-01T12:00:00Z"),
      atualizadoEm: new Date("2026-01-01T13:00:00Z"),
    });
    expect(await nucleo.obterCliente(cliente.id)).toEqual(editado);
  });

  it("aceita a edição que mantém o próprio e-mail", async () => {
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });

    const editado = await nucleo.editarCliente(cliente.id, { nome: "Ana Souza", email: "Ana@Exemplo.com" });

    expect(editado.email).toBe("ana@exemplo.com");
  });

  it("recusa a edição com e-mail já usado por outro Cliente", async () => {
    await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });
    const bruno = await nucleo.cadastrarCliente({ nome: "Bruno", email: "bruno@exemplo.com" });

    const erros = await errosDaRecusa(() =>
      nucleo.editarCliente(bruno.id, { nome: "Bruno", email: "ana@exemplo.com" }),
    );

    expect(erros).toEqual({ email: "Já existe um Cliente com este e-mail." });
    expect(await nucleo.obterCliente(bruno.id)).toEqual(bruno);
  });

  it("recusa a edição com dados inválidos sem alterar o Cliente", async () => {
    const cliente = await nucleo.cadastrarCliente({ nome: "Ana", email: "ana@exemplo.com" });

    const erros = await errosDaRecusa(() => nucleo.editarCliente(cliente.id, { nome: "", email: "ana" }));

    expect(erros).toEqual({ nome: "Informe o nome do Cliente.", email: "Informe um e-mail válido." });
    expect(await nucleo.obterCliente(cliente.id)).toEqual(cliente);
  });

  it("recusa a edição de um Cliente que não existe", async () => {
    await expect(nucleo.editarCliente(999, { nome: "Ana", email: "ana@exemplo.com" })).rejects.toBeInstanceOf(
      ClienteNaoEncontrado,
    );
  });
});

describe("busca de Clientes", () => {
  const { nucleo } = nucleoDeTeste();

  async function cadastrarVarios() {
    await nucleo.cadastrarCliente({ nome: "Ana Souza", email: "ana@exemplo.com" });
    await nucleo.cadastrarCliente({ nome: "Bruno Lima", email: "bruno@empresa.com.br" });
    await nucleo.cadastrarCliente({ nome: "Carla Souza", email: "carla@outro.net" });
  }

  it("encontra por trecho do nome, sem diferenciar maiúsculas", async () => {
    await cadastrarVarios();

    const encontrados = await nucleo.listarClientes({ busca: "souZA" });

    expect(encontrados.map((c) => c.nome)).toEqual(["Ana Souza", "Carla Souza"]);
  });

  it("encontra por trecho do e-mail, sem diferenciar maiúsculas", async () => {
    await cadastrarVarios();

    const encontrados = await nucleo.listarClientes({ busca: "EMPRESA.com" });

    expect(encontrados.map((c) => c.nome)).toEqual(["Bruno Lima"]);
  });

  it("devolve todos quando a busca está vazia", async () => {
    await cadastrarVarios();

    expect(await nucleo.listarClientes({ busca: "   " })).toHaveLength(3);
  });

  it("devolve lista vazia quando nada corresponde", async () => {
    await cadastrarVarios();

    expect(await nucleo.listarClientes({ busca: "zzz" })).toEqual([]);
  });

  it("trata % e _ da busca como texto comum", async () => {
    await nucleo.cadastrarCliente({ nome: "Promoção 100%", email: "promo@exemplo.com" });
    await nucleo.cadastrarCliente({ nome: "Ana", email: "ana_souza@exemplo.com" });
    await nucleo.cadastrarCliente({ nome: "Bruno", email: "bruno@exemplo.com" });

    expect((await nucleo.listarClientes({ busca: "%" })).map((c) => c.nome)).toEqual(["Promoção 100%"]);
    expect((await nucleo.listarClientes({ busca: "_" })).map((c) => c.nome)).toEqual(["Ana"]);
  });
});
