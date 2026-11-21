ALTER TABLE "clientes" ADD COLUMN "excluido_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "licencas" ADD COLUMN "excluida_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "produtos" ADD COLUMN "excluido_em" timestamp with time zone;