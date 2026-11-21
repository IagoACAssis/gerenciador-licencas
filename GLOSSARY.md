# Gerenciador de Licenças

Sistema de código aberto e auto-hospedado para cadastrar Produtos e controlar quem tem direito de usá-los. Outros sistemas consultam esse direito por uma API pública.

## Linguagem

**Instância**:
Uma implantação do Gerenciador de Licenças, com o próprio banco de dados e os próprios cadastros. Instâncias não compartilham dados entre si.
_Evite_: tenant, gerenciador (para se referir a uma implantação)

**Administrador**:
Pessoa que opera uma Instância: cadastra Produtos e Clientes e emite e gerencia Licenças.
_Evite_: emissor, dono, usuário, gestor

**Produto**:
Software, serviço ou comunidade cujo uso é controlado por Licenças.
_Evite_: licença (para se referir ao Produto), projeto, app

**Cliente**:
Pessoa cadastrada numa Instância que pode ter Licenças de um ou mais Produtos.
_Evite_: usuário, comprador, conta

**Licença**:
Direito de um Cliente de usar um Produto durante um período.
_Evite_: assinatura, plano, acesso

**Licença perpétua**:
Licença sem data de validade.

**Renovação**:
Extensão da data de validade de uma Licença existente, inclusive de uma Licença Expirada. A Chave de licença e as Ativações continuam as mesmas, e cada Renovação fica registrada no histórico da Licença.
_Evite_: recompra, nova licença

**Chave de licença**:
Segredo que identifica uma Licença e que o Administrador entrega ao Cliente. Aparece uma única vez, na emissão; depois disso nem a Instância consegue mostrá-la de novo.
_Evite_: token, serial, código

**Troca de chave**:
Geração de uma Chave de licença nova para uma Licença existente, feita pelo Administrador quando o Cliente perde a Chave. A antiga deixa de valer na hora; as Ativações, a data de validade e o histórico continuam os mesmos.
_Evite_: reemissão, nova licença

**Exclusão**:
Retirada de um Produto, Cliente ou Licença criado por engano das listas do painel, sem apagar o registro. O que foi excluído deixa de funcionar, mas continua guardado para o histórico e pode ser restaurado.
_Evite_: remoção, apagar (para se referir a encerrar uma Licença, ver Revogada)

**Janela de aviso**:
Quantos dias antes da data de validade a Licença passa a ser informada como "a vencer". Definida por Produto.
_Evite_: notificação, alerta

**Carência**:
Quantos dias depois da data de validade uma Licença Expirada continua sendo aceita. Definida por Produto, e opcional.
_Evite_: tolerância (ver Tolerância offline)

### Validação

**Validação**:
Consulta em que o Produto pergunta à Instância se uma Chave de licença pode ser usada num Dispositivo.
_Evite_: verificação, checagem, check

**Dispositivo**:
Onde o Produto está sendo usado: uma máquina, uma instalação ou uma conta de uma plataforma externa.
_Evite_: máquina, device, hardware

**Ativação**:
Vínculo entre uma Licença e um Dispositivo. Uma Licença aceita Ativações até o seu Limite de ativações.
_Evite_: instalação, seat

**Limite de ativações**:
Quantas Ativações simultâneas uma Licença aceita. Cada Produto tem um padrão, que a Licença pode sobrescrever.

**Substituição de ativação**:
Troca, feita a partir de um Dispositivo novo, de uma Ativação existente por uma Ativação nesse Dispositivo, quando a Licença já atingiu o Limite de ativações.
_Evite_: transferência, desativação

**Cota de substituições**:
Quantas Substituições de ativação uma Licença pode fazer nos últimos N dias sem intervenção do Administrador. A quantidade e o N são definidos por Produto.

**Resposta assinada**:
Resultado de uma Validação, aceita ou recusada, assinado pela Instância. O Produto consegue conferir que ele é autêntico sem precisar de rede.
_Evite_: token, certificado

**Tolerância offline**:
Por quanto tempo uma Resposta assinada continua valendo sem uma nova Validação, nunca além da data de validade mais a Carência. Definida por Produto.

### Estados da Licença

**Ativa**:
Licença dentro do período, nem suspensa nem revogada.

**Expirada**:
Licença cuja data de validade já passou. Decorre da data, ninguém marca à mão.
_Evite_: vencida

**Suspensa**:
Licença pausada pelo Administrador, que pode reativá-la. As Ativações são mantidas e voltam a valer na reativação.
_Evite_: bloqueada, pausada

**Revogada**:
Licença encerrada em definitivo pelo Administrador, sem volta.
_Evite_: cancelada, excluída
