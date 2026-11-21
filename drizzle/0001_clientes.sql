CREATE TABLE "clientes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clientes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"criado_em" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_email_unico" ON "clientes" USING btree (lower("email"));