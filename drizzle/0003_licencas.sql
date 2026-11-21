CREATE TABLE "eventos_licenca" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "eventos_licenca_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"licenca_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"dados" jsonb NOT NULL,
	"ocorrido_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licencas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "licencas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"produto_id" integer NOT NULL,
	"cliente_id" integer NOT NULL,
	"hash_chave" text NOT NULL,
	"prefixo_chave" text NOT NULL,
	"valida_ate" timestamp with time zone,
	"limite_ativacoes" integer,
	"emitida_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eventos_licenca" ADD CONSTRAINT "eventos_licenca_licenca_id_licencas_id_fk" FOREIGN KEY ("licenca_id") REFERENCES "public"."licencas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licencas" ADD CONSTRAINT "licencas_produto_id_produtos_id_fk" FOREIGN KEY ("produto_id") REFERENCES "public"."produtos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licencas" ADD CONSTRAINT "licencas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eventos_licenca_licenca" ON "eventos_licenca" USING btree ("licenca_id");--> statement-breakpoint
CREATE UNIQUE INDEX "licencas_hash_chave_unico" ON "licencas" USING btree ("hash_chave");--> statement-breakpoint
CREATE UNIQUE INDEX "licencas_prefixo_chave_unico" ON "licencas" USING btree ("prefixo_chave");--> statement-breakpoint
CREATE INDEX "licencas_produto" ON "licencas" USING btree ("produto_id");--> statement-breakpoint
CREATE INDEX "licencas_cliente" ON "licencas" USING btree ("cliente_id");