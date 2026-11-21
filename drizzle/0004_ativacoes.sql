CREATE TABLE "ativacoes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ativacoes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"licenca_id" integer NOT NULL,
	"dispositivo" text NOT NULL,
	"nome_dispositivo" text,
	"ativada_em" timestamp with time zone NOT NULL,
	"ultima_validacao_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ativacoes" ADD CONSTRAINT "ativacoes_licenca_id_licencas_id_fk" FOREIGN KEY ("licenca_id") REFERENCES "public"."licencas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ativacoes_licenca_dispositivo_unico" ON "ativacoes" USING btree ("licenca_id","dispositivo");