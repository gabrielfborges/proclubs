# FC Pro Clubs Manager

Sistema web para gerenciamento de campeonatos de **EA Sports FC Pro Clubs**: cadastro de campeonatos e times, sorteio de grupos, geração automática de partidas, classificação em tempo real, mata-mata gerado automaticamente e definição do campeão — tudo com uma área pública (sem login) e uma área administrativa protegida por autenticação.

## Tecnologias

- **Frontend:** React + TypeScript + Tailwind CSS (Vite)
- **Backend:** Node.js + Express + TypeScript
- **Banco de dados:** PostgreSQL + Prisma ORM
- **Autenticação:** JWT (usuário/senha do administrador)

## Estrutura do projeto

```
fc-pro-clubs-manager/
├── backend/          # API Node.js + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/     # regras de negócio (grupos, partidas, mata-mata, classificação)
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   └── .env.example
├── frontend/         # SPA React + TypeScript + Tailwind
│   └── src/
│       ├── pages/public/   # dashboard, detalhes do campeonato
│       ├── pages/admin/    # login, painel, gerenciamento
│       ├── components/
│       └── api/
└── docker-compose.yml   # sobe apenas um PostgreSQL local (opcional)
```

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+ (local, em Docker ou um serviço gerenciado)
- npm

## 1. Banco de dados

Se quiser subir um PostgreSQL local rapidamente com Docker:

```bash
docker compose up -d
```

Isso cria um banco `fc_pro_clubs` em `localhost:5432` com usuário/senha `postgres/postgres` (ver `docker-compose.yml`). Se preferir, use seu próprio PostgreSQL e ajuste a `DATABASE_URL`.

## 2. Backend (API)

```bash
cd backend
cp .env.example .env
# edite o .env se necessário (DATABASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD...)

npm install
npm run prisma:migrate      # cria as tabelas no banco (pede um nome para a migration, ex: init)
npm run seed                # cria o usuário administrador definido no .env
npm run dev                 # inicia a API em http://localhost:3333
```

Variáveis do `.env` (veja `backend/.env.example`):

| Variável        | Descrição                                                  |
|-----------------|--------------------------------------------------------------|
| `DATABASE_URL`  | String de conexão do PostgreSQL usada pelo Prisma            |
| `PORT`          | Porta da API (padrão 3333)                                   |
| `JWT_SECRET`    | Segredo usado para assinar os tokens do admin                |
| `JWT_EXPIRES_IN`| Validade do token (ex: `8h`)                                  |
| `ADMIN_USERNAME`| Usuário do administrador criado pelo `npm run seed`           |
| `ADMIN_PASSWORD`| Senha do administrador criado pelo `npm run seed`             |
| `FRONTEND_URL`  | Origem liberada no CORS (URL do frontend)                     |

## 3. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
# ajuste VITE_API_URL se a API não estiver em http://localhost:3333/api

npm install
npm run dev                 # abre em http://localhost:5173
```

Acesse `http://localhost:5173`. A área pública já funciona sem login. Para acessar o painel administrativo, clique em **"Login admin"** e use as credenciais definidas em `ADMIN_USERNAME` / `ADMIN_PASSWORD` (padrão: `admin` / `admin123`).

## Fluxo de uso

1. **Login como admin** e crie um campeonato definindo nome, número máximo de times, quantidade de grupos e quantos times se classificam por grupo para o mata-mata.
2. **Cadastre os times** (o sistema impede duplicados e bloqueia o cadastro ao atingir o limite definido).
3. **Sorteie os grupos** — distribui os times cadastrados aleatoriamente entre os grupos.
4. **Gere as partidas dos grupos** — cria automaticamente o turno único (todos contra todos) de cada grupo.
5. **Lance os placares** das partidas — a classificação é recalculada automaticamente (vitória = 3 pts, empate = 1 pt, derrota = 0 pts; critérios de desempate: pontos → saldo de gols → gols marcados).
6. Quando **todas** as partidas dos grupos tiverem resultado, o botão **"Gerar mata-mata"** é liberado — ele monta o chaveamento automaticamente com os classificados de cada grupo.
7. Lance os resultados do mata-mata (em caso de empate, informe os pênaltis) e use **"Avançar para a próxima fase"** para gerar a rodada seguinte.
8. Ao concluir a final, o **campeão é definido automaticamente**.

Toda a área pública (dashboard, campeonatos, times, classificação, partidas e chave do mata-mata) fica disponível para qualquer visitante, sem necessidade de login. Apenas as ações de escrita (criar/editar/excluir campeonatos e times, gerar grupos/partidas/mata-mata, lançar placares) exigem autenticação de administrador.

## Regras de negócio implementadas

- Não é possível cadastrar mais times do que o limite definido no campeonato.
- Não é possível cadastrar dois times com o mesmo nome no mesmo campeonato.
- Times só podem ser adicionados/removidos enquanto o campeonato está na fase de inscrição (antes do sorteio dos grupos).
- Classificação: vitória = 3 pontos, empate = 1 ponto, derrota = 0 pontos; ordenação por pontos, depois saldo de gols, depois gols marcados.
- O mata-mata só pode ser gerado quando **todas** as partidas da fase de grupos tiverem resultado.
- Grupos e partidas só podem ser sorteados/gerados novamente enquanto nenhum resultado tiver sido lançado (evita inconsistência).
- Se o número de classificados não for uma potência de dois, os melhores colocados recebem "bye" (avanço automático) na primeira fase do mata-mata.
- Em caso de empate no mata-mata, é obrigatório informar o resultado dos pênaltis para definir o vencedor.
- Somente o administrador autenticado (JWT) pode alterar dados; toda a leitura é pública.

## Build para produção

**Backend**

```bash
cd backend
npm run build
npm run prisma:deploy   # aplica as migrations em produção
npm start
```

**Frontend**

```bash
cd frontend
npm run build
# gera os arquivos estáticos em frontend/dist, prontos para qualquer servidor estático (Nginx, Vercel, etc.)
```

Em produção, lembre-se de:

- Definir um `JWT_SECRET` forte e uma senha de administrador segura.
- Ajustar `FRONTEND_URL` (backend) e `VITE_API_URL` (frontend) para os domínios reais.
- Usar HTTPS e uma instância gerenciada de PostgreSQL (ou o próprio `docker-compose.yml` adaptado).


### Chats das partidas no Discord

Na tela de gerenciamento, o botao **Comecar partida** cria um canal de texto privado no servidor Discord configurado, liberado para os dois capitaes e para os administradores informados. O cadastro e feito normalmente; depois do login, cada usuario pode clicar em **Vincular Discord** na barra superior. Configure `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` e `DISCORD_REDIRECT_URI` no backend e cadastre a URL de retorno no OAuth2 do Discord. O bot precisa estar no servidor e ter a permissao **Gerenciar canais**.

### Times independentes criados por usuarios

Usuarios autenticados podem usar a aba **Criar time** para buscar o clube na EA pelo nome, confirmar o `EaClubId` e criar um time independente. O time fica vinculado ao usuario criador como capitao e nao e inscrito automaticamente em nenhum campeonato. A inscricao em campeonatos e feita separadamente.

## Segurança operacional atualizada

O backend limita tentativas de login e cadastro, limita o JSON recebido a 1 MB e exige JWT_SECRET em produção. TRUST_PROXY deve permanecer false salvo quando a aplicação estiver atrás de um proxy reverso confiável. Em múltiplas instâncias, substitua o limitador em memória por Redis ou pelo gateway.
