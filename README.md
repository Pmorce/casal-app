# Casa

App web instalável (PWA) para um casal gerir a lista de compras, a casa (frigorífico e despensa),
o congelador, as rotinas de cada um, as tarefas da casa e os gastos do supermercado. Sincroniza
entre os dois telemóveis e funciona sem rede.

## Instalar no telemóvel

Abrir o endereço da app (GitHub Pages) e:

- **Android (Chrome):** menu ⋮ → **Instalar app** (ou "Adicionar ao ecrã principal").
- **iPhone (Safari):** botão Partilhar → **Adicionar ao ecrã principal**.

Depois, abrir a app pelo ícone **Casa** e entrar com o email e a palavra-passe de cada um.
No iPhone, a app instalada não partilha a sessão com o Safari: é preciso entrar dentro da app.

## Desenvolvimento local

Precisa de Node 24 e Java (para os emuladores do Firebase).

```bash
npm install
npm run emu                    # terminal 1: emuladores Auth + Firestore
node scripts/emu-setup.mjs     # cria ana@casa.test / rui@casa.test (palavra-passe casa1234)
npm run dev                    # terminal 2: http://localhost:5173
```

Testes:

```bash
npm test                       # lógica e componentes
npm run test:rules             # regras de segurança do Firestore (arranca o emulador sozinho)
node scripts/ui-check.mjs <cenário> <pasta>   # verificação no browser (shell, compras, congelador, rotinas, tarefas, hoje)
```

## Publicação

O workflow `.github/workflows/deploy.yml` corre os testes, faz o build e publica no GitHub Pages
em cada push para `main`. A configuração do Firebase vem das variáveis do repositório
`VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID` e `VITE_FB_APP_ID`.

As regras de segurança publicam-se à parte:

```bash
npx firebase deploy --only firestore:rules --project prod
```

### Contas

A app não tem registo. As contas criam-se na consola do Firebase (Authentication → Utilizadores) e
cada uma precisa de um documento `members/{uid}` no Firestore com o campo `name` (o nome mostrado na app).
Uma conta sem esse documento vê "Esta conta não tem acesso".
