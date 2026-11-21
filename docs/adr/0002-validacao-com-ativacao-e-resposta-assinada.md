# Validação com Ativação e Resposta assinada

Uma Chave de licença sozinha não protege contra vazamento nem contra uma API falsa que responde sempre "válida". Por isso a Validação exige Chave de licença + Dispositivo, cria Ativações até o limite da Licença e devolve uma Resposta assinada com criptografia assimétrica. A chave privada fica só na Instância, e a pública vai embutida no Produto. A mesma assinatura permite a Tolerância offline, porque o Produto confere a resposta guardada sem precisar de rede.

## Consequências

- A chave pública fica distribuída dentro dos Produtos já entregues. Trocar o par de chaves exige atualizar esses Produtos. Por isso cada Produto tem o próprio par de chaves, e a troca de um não afeta os outros.
- A API de Validação não exige credencial do Produto. Uma credencial embutida no binário não seria secreta. Quem autentica a requisição é a Chave de licença, e o limite de requisições impede tentativa de adivinhar Chaves por força bruta.
- Crack do binário do Produto (remover a verificação) está fora do escopo de propósito. É responsabilidade do Produto.
