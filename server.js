const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Armazena lançamentos em memória
let lancamentos = [];

// APK envia lançamento aqui
app.post('/lancamento', (req, res) => {
  const { tipo, valor, descricao, categoria, conta, data, obs } = req.body;

  if (!valor || !tipo) {
    return res.status(400).json({ erro: 'Dados incompletos' });
  }

  const lancamento = {
    id: Date.now(),
    tipo,
    valor: parseFloat(valor),
    descricao: descricao || 'Mercado Pago',
    categoria: categoria || 'Outros',
    conta: conta || 'Mercado Pago',
    data: data || new Date().toISOString().split('T')[0],
    obs: obs || '',
    origem: 'auto',
    criadoEm: new Date().toISOString()
  };

  lancamentos.push(lancamento);
  console.log('Novo lançamento:', lancamento);
  res.json({ sucesso: true, lancamento });
});

// Site busca lançamentos aqui
app.get('/lancamentos', (req, res) => {
  res.json(lancamentos);
});

// Site confirma que importou e limpa a fila
app.delete('/lancamentos', (req, res) => {
  lancamentos = [];
  res.json({ sucesso: true });
});

// Teste se servidor está online
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    lancamentosPendentes: lancamentos.length 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});