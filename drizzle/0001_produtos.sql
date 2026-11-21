CREATE TABLE "produtos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "produtos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"identificador" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text NOT NULL,
	"janela_aviso_dias" integer NOT NULL,
	"carencia_dias" integer NOT NULL,
	"limite_ativacoes_padrao" integer NOT NULL,
	"cota_substituicoes_quantidade" integer NOT NULL,
	"cota_substituicoes_dias" integer NOT NULL,
	"tolerancia_offline_dias" integer NOT NULL,
	"chave_publica" text NOT NULL,
	"chave_privada_cifrada" text NOT NULL,
	"cadastrado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "produtos_identificador_unique" UNIQUE("identificador")
);
