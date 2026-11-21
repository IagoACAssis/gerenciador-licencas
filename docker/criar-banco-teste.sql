-- Roda só na primeira inicialização do volume do Postgres (desenvolvimento).
-- O banco de teste tem um usuário próprio com senha fixa e pública: ele só
-- existe na máquina de desenvolvimento e no CI, e assim `pnpm test` funciona
-- sem ler nenhum segredo. O banco da Instância continua com as credenciais do .env.
CREATE ROLE teste LOGIN PASSWORD 'teste';
CREATE DATABASE licencas_teste OWNER teste;
