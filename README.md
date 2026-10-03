# RG3D — Gestão de impressão 3D

PWA responsivo para computador e telemóvel. Identidade visual preta, grafite e ciano da RG3D. Sem compilação e sem instalação de dependências para publicar.

## O que está incluído

- Cálculo por unidade de filamento, desperdício, eletricidade, desgaste da máquina, mão de obra, acessórios/NFC e embalagem.
- Quantidade, margem sobre venda, desconto, IVA, lucro estimado e horas totais.
- Clientes, produtos, filamentos e impressoras.
- Orçamentos editáveis enquanto pendentes, impressão/guardar como PDF e conversão para encomenda.
- Produção, prazos, pagamentos parciais e valores por receber.
- Contas individuais, colaboradores e administradores.
- Dados partilhados por Supabase, atualização a cada 30 segundos e botão Atualizar.
- Proteção contra sobrescrita concorrente e validação de saldo de pagamentos no servidor.
- Exportação CSV e cópia de segurança JSON.
- Demonstração independente no navegador e consulta offline dos dados da conta.

## 1. Preparar a base de dados

Pode ser um novo projeto Supabase ou o mesmo que usas no Medical R.G. As tabelas `rg3d_*` são separadas e este script não altera tabelas de outros sistemas.

1. Abre **Supabase → SQL Editor → New query**.
2. Cola e executa o conteúdo de `supabase.sql`. O script pode ser executado novamente.
3. Em **Authentication → Users → Add user**, cria a tua conta com email e palavra-passe e marca o email como confirmado (Auto Confirm).
4. Copia o **User UID** da conta.
5. Executa esta consulta substituindo apenas `UUID-DA-TUA-CONTA`:

```sql
insert into public.rg3d_members(user_id,name,role)
values ('UUID-DA-TUA-CONTA','Rafael','admin')
on conflict(user_id) do update set name=excluded.name,role=excluded.role;
```

6. Em **Project Settings → API / API Keys**, copia o Project URL e a chave **publishable** (ou a antiga **anon public**).
7. Em `config.js`, preenche:

```js
export const CONFIG = {
  supabaseUrl: 'https://O-TEU-PROJETO.supabase.co',
  supabaseKey: 'A-TUA-CHAVE-PUBLICA'
};
```

A chave pública pode estar no GitHub; as políticas RLS exigem uma conta que esteja na equipa RG3D. Nunca coloques `service_role`, secret key ou palavras-passe nos ficheiros. Se usares um projeto existente, mantém a configuração de autenticação usada pelo outro sistema.

Alternativa: configurar a ligação no ecrã inicial em cada dispositivo, sem editar `config.js`. Ainda é necessário criar as tabelas e o primeiro membro.

## 2. Publicar no GitHub

1. Na conta `rafaelgiacometti-beep`, cria um repositório chamado **rg3d**, público, com README inicial.
2. Descompacta este ZIP. Em **Add file → Upload files**, arrasta o **conteúdo** da pasta `rg3d`, incluindo a pasta `assets`. O `index.html` deve ficar diretamente na raiz do repositório, não numa segunda pasta `rg3d`.
3. Confirma o envio em **Commit changes**.
4. Vai a **Settings → Pages → Build and deployment**.
5. Em **Source**, escolhe **Deploy from a branch**.
6. Em **Branch**, escolhe **main** e **/(root)**, depois **Save**.
7. Aguarda a publicação. O endereço esperado é `https://rafaelgiacometti-beep.github.io/rg3d/`.
8. Abre o endereço, inicia sessão e adiciona os custos reais em Definições, Filamentos e Impressoras.

O endereço só estará disponível depois de criar o repositório, enviar os ficheiros e ativar o Pages.

## 3. Acesso para outras pessoas

1. Cria a conta em **Supabase → Authentication → Users → Add user**, com o email da pessoa, uma palavra-passe inicial e Auto Confirm.
2. Copia o User UID.
3. No RG3D, abre **Equipa**, indica o UUID, nome e permissão e toca em Adicionar membro.
4. A pessoa entra no RG3D com a conta criada. Não é preciso partilhar a tua palavra-passe.

Colaboradores gerem dados de trabalho. Administradores gerem também definições e acessos. Não existe registo público. A remoção de um membro bloqueia o acesso ao servidor, mas não apaga cópias que a pessoa já tenha exportado ou consultado offline. A própria conta administradora não pode ser removida pelo ecrã Equipa.

## 4. Fluxo diário

1. Cadastra cliente, material e impressora. Cadastra um produto se o vendes frequentemente.
2. Cria orçamento. Usa gramas e horas **por peça**, mesmo em lotes. Por exemplo, 10 peças com 160 g e 5 horas no slicer equivalem a 16 g e 0,5 h por unidade.
3. Guarda e exporta pelo botão **PDF**. Na janela de impressão escolhe **Guardar como PDF**. O cliente não vê os custos internos ou lucro.
4. Quando aprovado, toca em **Vender / Converter em venda**. Regista o sinal ou pagamento.
5. Muda para **Em produção**, depois **Pronto** e **Entregue**. O sistema permite entregar com saldo pendente mediante confirmação.
6. Regista os restantes pagamentos. Para corrigir um pagamento incorreto, apaga-o e volta a registar.

## Como o cálculo funciona

```
Filamento = gramas / 1000 × preço por kg × (1 + desperdício / 100)
Energia = horas × watts / 1000 × preço kWh
Máquina = horas × (preço da máquina / vida útil em horas + manutenção por hora)
Mão de obra = minutos / 60 × preço da hora
Custo = material + energia + máquina + mão de obra + acessórios + embalagem
Preço unitário = custo / (1 − margem / 100) × (1 − desconto / 100)
Subtotal = preço unitário arredondado a cêntimos × quantidade
IVA = subtotal × taxa / 100
Lucro estimado = subtotal − custo total
```

IVA padrão começa em **0%**, sem assumir o teu regime. Ajusta a taxa aplicável. O lucro é uma previsão dos custos incluídos, sem considerar impostos sobre lucro ou despesas que não tenhas inserido. O desperdício aplica-se ao material; falhas completas de impressão devem ser contempladas nos tempos e custos introduzidos.

O stock de filamento é informativo e ajustado manualmente; não há baixa automática, gestão de lotes ou faturas fiscais. A primeira versão calcula uma peça/produto por orçamento, com a respetiva quantidade. O PDF usa a impressão do navegador. A exportação JSON é uma cópia para recuperação manual; não existe botão de importação automática. Os pagamentos cancelados não são reembolsados pelo sistema: resolve a devolução e documenta-a nas notas.

## Instalação

- iPhone: Safari → Partilhar → Adicionar ao ecrã principal.
- Android: Chrome → menu → Instalar aplicação / Adicionar ao ecrã principal.
- Computador: usa a opção de instalação no Chrome ou Edge, quando oferecida.

Precisa de HTTPS para instalar. O GitHub Pages disponibiliza HTTPS. Sem internet, o modo empresa só permite consultar a última cópia guardada no dispositivo. Ao sair, essa cópia da conta é removida deste navegador. A demonstração não é sincronizada com a empresa.

## Atualizar o programa

Envia os ficheiros modificados para o mesmo repositório. Se alterares ficheiros do PWA, incrementa o nome `CACHE` em `sw.js`. Fecha e reabre os separadores da aplicação para permitir a ativação da nova versão.

## Verificar localmente

```sh
npm test
python3 -m http.server 8080
```

Abre `http://localhost:8080` e toca em Explorar demonstração. Os testes cobrem fórmulas financeiras, desconto, quantidades inválidas, saldo parcial e segurança da exportação CSV. O modo sincronizado precisa de um projeto Supabase configurado para validar a integração real.

Fontes técnicas: https://supabase.com/docs/guides/auth · https://supabase.com/docs/guides/database/postgres/row-level-security · https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
Sistema de gestão RG3D
