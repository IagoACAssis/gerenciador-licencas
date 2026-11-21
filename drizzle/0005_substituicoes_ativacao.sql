CREATE TABLE "substituicoes_ativacao" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "substituicoes_ativacao_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"licenca_id" integer NOT NULL,
	"dispositivo_removido" text NOT NULL,
	"dispositivo_novo" text NOT NULL,
	"feita_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "licencas" ADD COLUMN "contagem_substituicoes_zerada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "substituicoes_ativacao" ADD CONSTRAINT "substituicoes_ativacao_licenca_id_licencas_id_fk" FOREIGN KEY ("licenca_id") REFERENCES "public"."licencas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "substituicoes_ativacao_licenca_feita_em" ON "substituicoes_ativacao" USING btree ("licenca_id","feita_em");