/**
 * Cliente Pluggy - gerencia autenticação e chamadas à API
 *
 * Variáveis de ambiente necessárias (configure no Render, NUNCA no código):
 *   PLUGGY_CLIENT_ID
 *   PLUGGY_CLIENT_SECRET
 */

const PLUGGY_BASE_URL = 'https://api.pluggy.ai';

let cachedApiKey = null;
let cachedApiKeyExpiresAt = 0;

/**
 * Autentica com Client ID + Client Secret e retorna um apiKey.
 * O apiKey do Pluggy expira em ~2h, então cacheamos e renovamos quando necessário.
 */
async function getApiKey() {
  const now = Date.now();

  // Reusa o apiKey em cache se ainda for válido (com margem de 5 min)
  if (cachedApiKey && now < cachedApiKeyExpiresAt - 5 * 60 * 1000) {
    return cachedApiKey;
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET precisam estar configurados como variáveis de ambiente'
    );
  }

  const response = await fetch(`${PLUGGY_BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao autenticar no Pluggy: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  cachedApiKey = data.apiKey;
  // Pluggy apiKey dura ~2h; guardamos timestamp de expiração estimado
  cachedApiKeyExpiresAt = now + 2 * 60 * 60 * 1000;

  return cachedApiKey;
}

/**
 * Faz uma requisição autenticada genérica à API do Pluggy
 */
async function pluggyRequest(path, options = {}) {
  const apiKey = await getApiKey();

  const response = await fetch(`${PLUGGY_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pluggy API erro em ${path}: ${response.status} - ${errText}`);
  }

  // Algumas respostas (204) não têm corpo
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Gera um connect_token para o widget Pluggy Connect (frontend)
 * Opcionalmente pode passar itemId para reconectar/atualizar um item existente
 */
async function createConnectToken(itemId = null, webhookUrl = null) {
  const apiKey = await getApiKey();

  const body = {};
  if (itemId) body.itemId = itemId;
  if (webhookUrl) body.webhookUrl = webhookUrl;

  const response = await fetch(`${PLUGGY_BASE_URL}/connect_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha ao gerar connect_token: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.accessToken;
}

/** Lista todas as contas de um item (conexão bancária) */
async function getAccounts(itemId) {
  return pluggyRequest(`/accounts?itemId=${itemId}`);
}

/** Busca transações de uma conta, com paginação e filtro de data opcional */
async function getTransactions(accountId, { from, to, page = 1, pageSize = 500 } = {}) {
  const params = new URLSearchParams({ accountId, page, pageSize });
  if (from) params.set('from', from); // formato YYYY-MM-DD
  if (to) params.set('to', to);

  return pluggyRequest(`/transactions?${params.toString()}`);
}

/** Busca detalhes de um item (status da conexão, banco, última sincronização) */
async function getItem(itemId) {
  return pluggyRequest(`/items/${itemId}`);
}

/** Lista todos os items (conexões bancárias) já criados nesta aplicação */
async function listItems() {
  return pluggyRequest(`/items`);
}

module.exports = {
  getApiKey,
  createConnectToken,
  getAccounts,
  getTransactions,
  getItem,
  listItems,
};
