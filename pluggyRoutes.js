/**
 * Rotas Express para integração com Pluggy (Open Finance)
 *
 * Como usar no seu servidor principal (server.js / index.js):
 *
 *   const pluggyRoutes = require('./pluggyRoutes');
 *   app.use('/pluggy', pluggyRoutes);
 *
 * Variáveis de ambiente necessárias:
 *   PLUGGY_CLIENT_ID
 *   PLUGGY_CLIENT_SECRET
 *   PLUGGY_WEBHOOK_URL (opcional, ex: https://seu-app.onrender.com/pluggy/webhook)
 */

const express = require('express');
const router = express.Router();
const pluggy = require('./pluggyClient');

// ---------------------------------------------------------------------------
// Armazenamento simples em memória dos items conectados.
// TROQUE por um banco de dados real (SQLite, Postgres, etc.) em produção -
// isso reseta toda vez que o servidor Render reinicia.
// ---------------------------------------------------------------------------
const connectedItems = new Set();

/**
 * GET /pluggy/connect-token
 * Retorna um token temporário que o frontend usa para abrir o widget
 * Pluggy Connect (onde o usuário escolhe o banco e faz login).
 */
router.get('/connect-token', async (req, res) => {
  try {
    const webhookUrl = process.env.PLUGGY_WEBHOOK_URL || null;
    const token = await pluggy.createConnectToken(null, webhookUrl);
    res.json({ accessToken: token });
  } catch (err) {
    console.error('[pluggy] erro ao gerar connect-token:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /pluggy/item-connected
 * Chamado pelo frontend depois que o widget Pluggy Connect termina com sucesso
 * (evento 'onSuccess' do widget, que retorna um itemId).
 * Body: { itemId: string }
 */
router.post('/item-connected', async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    return res.status(400).json({ error: 'itemId é obrigatório' });
  }

  connectedItems.add(itemId);
  console.log(`[pluggy] novo item conectado: ${itemId}`);

  res.json({ ok: true });
});

/**
 * POST /pluggy/webhook
 * Endpoint que o Pluggy chama automaticamente quando:
 * - uma conexão termina de sincronizar (item/updated)
 * - novas transações chegam (transactions/created)
 * - a conexão precisa de atenção (item/login_error, etc.)
 *
 * Configure essa URL no dashboard do Pluggy ou passe via createConnectToken.
 */
router.post('/webhook', async (req, res) => {
  const { event, itemId } = req.body;
  console.log(`[pluggy webhook] evento="${event}" itemId="${itemId}"`);

  if (itemId) {
    connectedItems.add(itemId);
  }

  // Responda rápido - o processamento pesado pode ser feito de forma assíncrona
  res.status(200).json({ received: true });

  // Aqui você pode disparar uma sincronização automática quando o evento for
  // relevante, por exemplo:
  // if (event === 'transactions/created') { syncItem(itemId); }
});

/**
 * GET /pluggy/items
 * Lista os items (conexões bancárias) já vinculados a esta aplicação.
 */
router.get('/items', async (req, res) => {
  try {
    const items = await pluggy.listItems();
    res.json(items);
  } catch (err) {
    console.error('[pluggy] erro ao listar items:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /pluggy/accounts/:itemId
 * Lista as contas (corrente, poupança, cartão) de um item específico.
 */
router.get('/accounts/:itemId', async (req, res) => {
  try {
    const accounts = await pluggy.getAccounts(req.params.itemId);
    res.json(accounts);
  } catch (err) {
    console.error('[pluggy] erro ao buscar contas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /pluggy/transactions/:accountId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Busca as transações de uma conta específica.
 */
router.get('/transactions/:accountId', async (req, res) => {
  try {
    const { from, to } = req.query;
    const transactions = await pluggy.getTransactions(req.params.accountId, { from, to });
    res.json(transactions);
  } catch (err) {
    console.error('[pluggy] erro ao buscar transações:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /pluggy/sync
 * Sincronização completa: percorre todos os items conectados, busca todas as
 * contas e todas as transações recentes, e retorna tudo formatado para o
 * FinançasPRO consumir de uma vez (mesmo formato que o polling atual espera).
 */
router.get('/sync', async (req, res) => {
  try {
    const results = [];

    for (const itemId of connectedItems) {
      const item = await pluggy.getItem(itemId);
      const accounts = await pluggy.getAccounts(itemId);

      for (const account of accounts.results || []) {
        const transactions = await pluggy.getTransactions(account.id, {
          from: req.query.from, // opcional, ex: '2026-08-01'
        });

        results.push({
          banco: item.connector?.name || 'Desconhecido',
          conta: {
            id: account.id,
            nome: account.name,
            tipo: account.type,
            saldo: account.balance,
          },
          transacoes: (transactions.results || []).map((t) => ({
            id: t.id,
            data: t.date,
            descricao: t.description,
            valor: t.amount,
            categoria: t.category,
          })),
        });
      }
    }

    res.json({ contas: results, sincronizadoEm: new Date().toISOString() });
  } catch (err) {
    console.error('[pluggy] erro na sincronização:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
