const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

let lancamentos = [];

// ── Detecta categoria pela descrição ──
function detectarCategoria(descricao, tipo) {
  const d = descricao.toLowerCase();

  if (tipo === 'entrada') {
    if (d.includes('salario') || d.includes('salário') || d.includes('pagamento') || d.includes('holerite')) return 'Salário';
    if (d.includes('freelance') || d.includes('servico') || d.includes('serviço')) return 'Freelance';
    if (d.includes('dividendo') || d.includes('rendimento') || d.includes('investimento')) return 'Investimento';
    return 'Receita';
  }

  // Alimentação
  if (d.includes('ifood') || d.includes('rappi') || d.includes('uber eats') ||
      d.includes('supermercado') || d.includes('mercado') || d.includes('padaria') ||
      d.includes('restaurante') || d.includes('lanchonete') || d.includes('pizza') ||
      d.includes('burger') || d.includes('mcdonalds') || d.includes('subway') ||
      d.includes('habib') || d.includes('giraffas') || d.includes('açougue') ||
      d.includes('hortifruti') || d.includes('extra') || d.includes('carrefour') ||
      d.includes('atacadao') || d.includes('atacadão') || d.includes('assai') ||
      d.includes('assaí') || d.includes('pao de acucar') || d.includes('pão de açúcar'))
    return 'Alimentação';

  // Transporte
  if (d.includes('uber') || d.includes('99') || d.includes('taxi') || d.includes('táxi') ||
      d.includes('onibus') || d.includes('ônibus') || d.includes('metro') || d.includes('metrô') ||
      d.includes('combustivel') || d.includes('combustível') || d.includes('gasolina') ||
      d.includes('posto') || d.includes('estacionamento') || d.includes('pedagio') ||
      d.includes('pedágio') || d.includes('shell') || d.includes('ipiranga') || d.includes('petrobras'))
    return 'Transporte';

  // Moradia
  if (d.includes('aluguel') || d.includes('condominio') || d.includes('condomínio') ||
      d.includes('luz') || d.includes('energia') || d.includes('agua') || d.includes('água') ||
      d.includes('gas') || d.includes('gás') || d.includes('internet') || d.includes('telefone') ||
      d.includes('celular') || d.includes('tim') || d.includes('claro') || d.includes('vivo') ||
      d.includes('oi ') || d.includes('net ') || d.includes('enel') || d.includes('cemig') ||
      d.includes('copel') || d.includes('sabesp') || d.includes('cedae'))
    return 'Moradia';

  // Saúde
  if (d.includes('farmacia') || d.includes('farmácia') || d.includes('drogaria') ||
      d.includes('medico') || d.includes('médico') || d.includes('consulta') ||
      d.includes('hospital') || d.includes('clinica') || d.includes('clínica') ||
      d.includes('dentista') || d.includes('laboratorio') || d.includes('laboratório') ||
      d.includes('droga') || d.includes('ultrafarma') || d.includes('drogasil') ||
      d.includes('pacheco') || d.includes('remedios') || d.includes('remédios'))
    return 'Saúde';

  // Lazer
  if (d.includes('cinema') || d.includes('netflix') || d.includes('spotify') ||
      d.includes('amazon prime') || d.includes('disney') || d.includes('hbo') ||
      d.includes('youtube') || d.includes('steam') || d.includes('playstation') ||
      d.includes('xbox') || d.includes('show') || d.includes('teatro') ||
      d.includes('ingresso') || d.includes('bar ') || d.includes('balada') ||
      d.includes('academia') || d.includes('smartfit') || d.includes('bodytech'))
    return 'Lazer';

  // Educação
  if (d.includes('escola') || d.includes('faculdade') || d.includes('universidade') ||
      d.includes('curso') || d.includes('udemy') || d.includes('alura') ||
      d.includes('livro') || d.includes('livraria') || d.includes('mensalidade') ||
      d.includes('colegio') || d.includes('colégio') || d.includes('ensino'))
    return 'Educação';

  // Vestuário
  if (d.includes('roupa') || d.includes('calçado') || d.includes('calcado') ||
      d.includes('renner') || d.includes('riachuelo') || d.includes('c&a') ||
      d.includes('zara') || d.includes('hm') || d.includes('shein') ||
      d.includes('shopee') || d.includes('magazine') || d.includes('americanas'))
    return 'Vestuário';

  return 'Outros';
}

// ── Detecta tipo pelo título/texto da notificação ──
function detectarTipo(titulo, texto) {
  const t = (titulo + ' ' + texto).toLowerCase();

  // ── SAÍDA (dinheiro saindo) — verificado primeiro para ter prioridade ──
  if (t.includes('você pagou') || t.includes('voce pagou') ||
      t.includes('pix enviado') || t.includes('enviad') ||
      t.includes('transferencia feita') || t.includes('transferência feita') ||
      t.includes('transferencia enviada') || t.includes('transferência enviada') ||
      t.includes('transferência realizada') || t.includes('transferencia realizada') ||
      t.includes('você enviou') || t.includes('voce enviou') ||
      t.includes('pagamento realizado') || t.includes('pagamento efetuado') ||
      t.includes('debitad') || t.includes('você transferiu') || t.includes('voce transferiu') ||
      t.includes('compra aprovada') || t.includes('pagamento aprovado') ||
      t.includes('compra de') || t.includes('gasto'))
    return 'saida';

  // ── ENTRADA (dinheiro entrando) ──
  if (t.includes('você recebeu') || t.includes('voce recebeu') ||
      t.includes('recebemos') || t.includes('creditad') ||
      t.includes('transferência recebida') || t.includes('transferencia recebida') ||
      t.includes('recebemos sua transferência') || t.includes('recebemos sua transferencia') ||
      t.includes('você depositou') || t.includes('voce depositou') ||
      t.includes('depósito') || t.includes('deposito') ||
      t.includes('dinheiro já está disponível') || t.includes('dinheiro ja esta disponivel') ||
      t.includes('está disponível') || t.includes('esta disponivel') ||
      t.includes('entrada') || t.includes('caiu na conta') ||
      t.includes('pix recebido'))
    return 'entrada';

  return 'saida'; // padrão
}

// ── APK envia lançamento aqui ──
app.post('/lancamento', (req, res) => {
  const { titulo, texto, valor, descricao, conta, data } = req.body;

  if (!valor) return res.status(400).json({ erro: 'Valor obrigatório' });

  const tipo      = detectarTipo(titulo || '', texto || '');
  const desc      = descricao || titulo || 'Mercado Pago';
  const categoria = detectarCategoria(desc + ' ' + (texto || ''), tipo);

  const lancamento = {
    id:         Date.now(),
    tipo,
    valor:      parseFloat(valor),
    descricao:  desc,
    categoria,
    conta:      conta || 'Mercado Pago',
    data:       data  || new Date().toISOString().split('T')[0],
    obs:        texto || '',
    origem:     'auto',
    criadoEm:   new Date().toISOString()
  };

  lancamentos.push(lancamento);
  console.log(`[${tipo.toUpperCase()}] ${desc} — R$ ${valor} → ${categoria}`);
  res.json({ sucesso: true, lancamento });
});

// ── Site busca lançamentos pendentes ──
app.get('/lancamentos', (req, res) => {
  res.json(lancamentos);
});

// ── Site confirma importação e limpa fila ──
app.delete('/lancamentos', (req, res) => {
  const total = lancamentos.length;
  lancamentos = [];
  res.json({ sucesso: true, limpos: total });
});

// ── Health check ──
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    lancamentosPendentes: lancamentos.length,
    hora: new Date().toLocaleString('pt-BR')
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// ── AUTO-PING: mantém o Render acordado (evita dormir após 15min) ──
const SELF_URL = process.env.RENDER_EXTERNAL_URL || null;
if (SELF_URL) {
  setInterval(() => {
    fetch(SELF_URL)
      .then(() => console.log('Auto-ping OK —', new Date().toLocaleTimeString('pt-BR')))
      .catch(err => console.log('Auto-ping falhou:', err.message));
  }, 10 * 60 * 1000); // a cada 10 minutos
  console.log('Auto-ping ativado para:', SELF_URL);
}
