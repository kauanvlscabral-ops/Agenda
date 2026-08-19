# Ap-Praia — Gestão de Temporada

Sistema de reservas para apartamento de temporada na praia (Node.js + Express + MySQL).

## O que mudou nesta atualização

1. **Status financeiro da reserva** (substitui o antigo "Sinal recebido? Sim/Não"):
   - `Sinal pendente` · `Sinal recebido` · `Pago` · `Não pago`
   - Editável a qualquer momento (não só na criação).
   - Cálculo 100% centralizado em `shared/finance.js` e usado tanto pelo front quanto pelo back-end,
     para telas e banco nunca ficarem divergentes.
2. **Novos campos**: telefone do hóspede, horário de check-in, horário de check-out, limite de hóspedes.
3. **Configurações do imóvel** (ícone de engrenagem na barra lateral): endereço do apartamento e nome
   do locador/responsável — usados no contrato. Nada é inventado: se não for preenchido, o contrato
   mostra "Não informado".
4. **Botão "Gerar contrato"** em cada linha da lista de reservas (e também no card mobile e no modal de
   detalhes) — gera um PDF de contrato completo usando jsPDF + AutoTable (já usados no projeto).
5. Todas as funcionalidades antigas foram preservadas: dashboard, calendário, filtros, busca, exportação
   Excel/PDF da lista, backup em JSON, tema claro/escuro, responsividade.

## Instalação (banco novo)

```bash
npm install
cp .env.example .env   # edite usuário/senha do MySQL
mysql -u root -p < database.sql
npm start
```

## Atualizando um banco que já existia (antes desta versão)

Não apague nada — rode a migration, que só adiciona colunas e preenche valores compatíveis
para as reservas antigas:

```bash
mysql -u root -p < migration.sql
```

Reservas antigas sem status são classificadas automaticamente a partir do campo `sinalRecebido`
que já existia (`sim` → "Sinal recebido", `não` → "Sinal pendente").

## Estrutura

```
mare-app/
├── index.html          Front-end (estrutura)
├── style.css            Front-end (estilos)
├── script.js             Front-end (lógica, consome a API)
├── shared/finance.js      Regra de cálculo financeiro (compartilhada front/back)
├── server.js               Servidor Express (API + arquivos estáticos)
├── db.js                    Pool de conexão MySQL
├── routes/reservas.js        CRUD de reservas + validações + geração de status
├── routes/config.js           Endereço do imóvel / nome do locador
├── database.sql                 Script para instalação nova
└── migration.sql                Script para atualizar banco existente
```

## Regra de cálculo (implementada em `shared/finance.js`)

| Status         | Valor recebido      | Total a receber              |
|-----------------|---------------------|-------------------------------|
| Sinal pendente  | R$ 0,00              | Valor total                   |
| Sinal recebido  | Valor do sinal        | Valor total − Valor do sinal  |
| Pago            | Valor total             | R$ 0,00                       |
| Não pago        | R$ 0,00                   | Valor total                   |

O valor original do aluguel nunca é sobrescrito — só o status e os campos derivados
(`valorRecebido`, `totalAReceber`) mudam.

## Validações implementadas

- Check-out precisa ser posterior ao check-in.
- Sinal não pode ser maior que o valor total do aluguel.
- Limite de hóspedes deve ser maior que zero.
- Status precisa ser um dos quatro valores permitidos.
- Conflito de datas com outra reserva é bloqueado (front e back).

Todas as validações rodam tanto no navegador (feedback imediato) quanto na API
(garantia de integridade, mesmo se a API for chamada diretamente).
