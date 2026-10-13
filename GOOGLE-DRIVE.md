# Biblioteca privada de modelos RG3D

## 1. Preparar a pasta

Cria uma pasta no Google Drive, por exemplo **RG3D – Modelos**. Coloca nela os STL e 3MF. Podes organizar em subpastas, que aparecem como categorias. Partilha apenas com as contas Google da equipa que precisem de abrir os ficheiros; não é necessário tornar a pasta pública.

Para cada modelo, podes colocar uma foto com o mesmo nome na mesma pasta:

- `Chaveiro.stl` e `Chaveiro.jpg`
- `Presépio.3mf` e `Presépio.png`

## 2. Configuração Google, feita uma vez

1. Abre https://console.cloud.google.com/ e cria ou escolhe um projeto **RG3D**.
2. Em **APIs & Services → Library**, ativa **Google Drive API**.
3. Em **Google Auth Platform**, configura **Branding**, o email de suporte e **Audience → External**. Mantém em Testing para utilização pessoal e adiciona o teu email e os emails da equipa em **Test users**.
4. Em **Data Access**, adiciona o âmbito de leitura `https://www.googleapis.com/auth/drive.readonly`. O Google autoriza leitura do Drive, não apenas de uma pasta; o RG3D limita a consulta à pasta indicada e às subpastas. O programa não envia comandos de escrita ao Drive.
5. Em **Clients → Create client**, escolhe **Web application** e usa o nome RG3D.
6. Em **Authorized JavaScript origins**, adiciona exatamente `https://rafaelgiacometti-beep.github.io`, sem `/rg3d/` e sem barra final. O programa utiliza uma janela de autorização; não requer Client Secret nem redirect URI neste fluxo.
7. Copia o **Client ID**, terminado em `.apps.googleusercontent.com`. Este ID é público e pode ser colocado no programa. Nunca coloques o Client Secret.

Referências Google: https://developers.google.com/identity/oauth2/web/guides/use-token-model e https://developers.google.com/workspace/drive/api/guides/api-specific-auth

## 3. Ligar o RG3D

1. Entra como administrador e abre **Biblioteca 3D → Configurar pasta**.
2. Cola o link da pasta e o Client ID e guarda.
3. Clica em **Ligar Google Drive**, escolhe a tua conta e autoriza a leitura.
4. Clica em **Sincronizar biblioteca**.

A autorização só fica na memória do navegador, não no GitHub, Supabase ou localStorage. Cada pessoa autoriza a própria conta. Ao expirar ou ao reabrir o programa, volta a ligar o Google. Sair do RG3D ou usar Desligar Google limpa a autorização local, sem revogar a autorização concedida na conta Google.

## Utilização

- Os modelos aparecem em cartões com pesquisa por nome/categoria.
- **Ver produto**: STL tem visualizador simplificado com rotação e zoom. 3MF utiliza a miniatura interna quando incluída pelo fatiador. 3MF sem miniatura precisa de uma foto; esta versão não apresenta a malha do 3MF em 3D.
- **Guardar prévia como foto** grava a imagem no cadastro, disponível à equipa com acesso ao RG3D.
- **Abrir no Drive** permite abrir ou descarregar o original com a conta Google autorizada.
- **Orçamentar** reutiliza o produto. Preenche gramas e tempo a partir do fatiador; o sistema não fatia nem deduz automaticamente consumos.
- Fotos já cadastradas e custos comerciais são preservados na sincronização.
- Modelos removidos da pasta são assinalados como não encontrados; os produtos e orçamentos são preservados.
- A sincronização é manual e feita pelo administrador. Os restantes membros podem consultar o catálogo e ligar a conta Google para ler os ficheiros.
- Limites da sincronização: 100 pastas e 5000 ficheiros. Prévia: ficheiros até 50 MB, STL simplificado até 12000 triângulos. Fotos: até 20 MB antes da redução. Se o catálogo exceder a capacidade de cache do navegador, os dados online continuam disponíveis e a cópia offline é removida.

A integração precisa de validação com uma pasta real depois da configuração OAuth. Não é necessário novo SQL.
