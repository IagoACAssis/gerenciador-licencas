# Chave de licença exibida uma única vez

A Instância não guarda a Chave de licença em si, só uma impressão (hash) que permite conferi-la na Validação. A Chave aparece uma única vez, na emissão, e nem o Administrador consegue vê-la de novo. O caminho óbvio seria guardar a Chave para o Administrador reenviá-la ao Cliente. Mesmo com um único Administrador (ADR-0001), preferimos que um vazamento do banco não entregue Chaves prontas para uso. O custo é o atendimento ao Cliente que perde a Chave, resolvido pela Troca de chave.

## Consequências

- O painel identifica uma Licença pelos primeiros caracteres da Chave, nunca pela Chave inteira.
- A decisão não volta atrás para as Chaves já emitidas: mesmo que no futuro a Instância passe a guardar as Chaves, as antigas nunca poderão ser mostradas.
