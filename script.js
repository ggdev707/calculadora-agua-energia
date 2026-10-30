
/* 1. Constantes ----------------------------------------------------------- */
const DIAS_NO_MES = 30;
const SEMANAS_NO_MES = 4.33;
const POTENCIA_CHUVEIRO_KW = 5.5;
const LITROS_POR_LAVAGEM = 100;
const KWH_POR_LAVAGEM = 0.5;
const CHAVE_STORAGE = "calc-agua-energia";

/* 2. Dados ---------------------------------------------------------------- */

// Ids dos campos numéricos do formulário (o checkbox "chuv" é tratado à parte)
const CAMPOS = [
  "pessoas", "banho", "vazao", "outros", "ciclos",
  "lamp", "lw", "lh", "ac", "acw", "gel", "outE",
  "tk", "tm"
];

// Valores iniciais do formulário
const PADROES = {
  pessoas: 4, banho: 10, vazao: 8, outros: 80, ciclos: 4,
  lamp: 10, lw: 10, lh: 5, ac: 0, acw: 800, gel: 40, outE: 30,
  tk: 0.9, tm: 8,
  chuv: true
};

// Dicas de economia.
//   peso(d): de 0 a 1, o quanto a dica combina com os hábitos informados (0 = não se aplica)
//   texto(d): mensagem exibida, podendo usar os números do usuário
const DICAS = [
  {
    peso: d => (d.banho > 6 ? 1 : 0.3),
    texto: d => {
      const m3 = d.pessoas * 2 * d.vazao * DIAS_NO_MES / 1000;
      const kwh = d.chuv ? POTENCIA_CHUVEIRO_KW * (d.pessoas * 2 / 60) * DIAS_NO_MES : 0;
      return `Reduzir o banho em 2 minutos economiza cerca de ${brl(m3 * d.tm + kwh * d.tk)} por mês.`;
    }
  },
  {
    peso: d => (d.chuv ? 0.9 : 0),
    texto: () => "No calor, deixe o chuveiro elétrico na posição “verão”: gasta bem menos energia."
  },
  {
    peso: d => (d.ac > 0 ? 0.9 : 0),
    texto: () => "Deixe o ar-condicionado em 23 °C ou mais e limpe os filtros todo mês: o aparelho gasta menos."
  },
  {
    peso: d => (d.lw >= 20 ? 1 : d.lw > 0 ? 0.2 : 0),
    texto: () => "Troque lâmpadas incandescentes ou fluorescentes por LED: dão a mesma luz com até 80% menos energia."
  },
  {
    peso: d => (d.lh > 5 ? 0.6 : 0.3),
    texto: () => "Aproveite a luz natural durante o dia e apague a luz ao sair do cômodo."
  },
  {
    peso: () => 0.4,
    texto: () => "Feche a torneira ao escovar os dentes e ao ensaboar a louça: dá para poupar dezenas de litros por dia."
  },
  {
    peso: d => (d.ciclos > 0 ? 0.7 : 0),
    texto: () => "Só ligue a máquina de lavar com a capacidade cheia: menos ciclos, menos água e energia."
  },
  {
    peso: d => (d.ciclos > 0 ? 0.35 : 0),
    texto: () => "Reaproveite a água da lavagem para limpar o quintal ou a calçada."
  },
  {
    peso: () => 0.5,
    texto: () => "Teste vazamentos: pingue corante na caixa da descarga e, se a cor chegar à bacia sem apertar o botão, há vazamento."
  },
  {
    peso: d => (d.gel > 0 ? 0.4 : 0),
    texto: () => "Mantenha a borracha da geladeira em bom estado, deixe espaço atrás dela e não guarde comida quente."
  },
  {
    peso: () => 0.4,
    texto: () => "Tire da tomada o que fica em espera (TV, carregadores, micro-ondas): o consumo parado soma ao longo do mês."
  },
  {
    peso: d => (d.pessoas > 0 ? 0.3 : 0),
    texto: () => "Regue plantas de manhã cedo ou à noite, com menos evaporação, e se puder, capte água da chuva."
  },
  {
    peso: () => 0.25,
    texto: () => "Compare a conta com esta estimativa: diferenças grandes podem indicar vazamento ou erro de leitura."
  }
];

/* 3. Utilitários ---------------------------------------------------------- */
const $ = id => document.getElementById(id);

const brl = valor =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const numero = valor =>
  valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/* 4. Entrada: ler e preencher o formulário -------------------------------- */

// Lê os campos e devolve um objeto com números (vazio ou negativo vira 0)
function lerFormulario() {
  const dados = {};
  CAMPOS.forEach(id => {
    const valor = parseFloat($(id).value);
    dados[id] = isFinite(valor) && valor >= 0 ? valor : 0;
  });
  dados.chuv = $("chuv").checked;
  return dados;
}

// Preenche o formulário com um objeto de dados
function preencherFormulario(dados) {
  CAMPOS.forEach(id => {
    if (dados[id] !== undefined) $(id).value = dados[id];
  });
  $("chuv").checked = !!dados.chuv;
}

/* 5. Cálculo (não mexe na tela) ------------------------------------------- */

// Converte hábitos em consumo (m³ e kWh) e depois em reais
function calcular(d) {
  const agua = {
    "Banhos": d.pessoas * d.banho * d.vazao * DIAS_NO_MES / 1000,
    "Outros usos": d.pessoas * d.outros * DIAS_NO_MES / 1000,
    "Máquina de lavar": d.ciclos * SEMANAS_NO_MES * LITROS_POR_LAVAGEM / 1000
  };

  const energia = {
    "Chuveiro elétrico": d.chuv ? POTENCIA_CHUVEIRO_KW * (d.pessoas * d.banho / 60) * DIAS_NO_MES : 0,
    "Lâmpadas": d.lamp * d.lw * d.lh * DIAS_NO_MES / 1000,
    "Ar-condicionado": d.acw * d.ac * DIAS_NO_MES / 1000,
    "Geladeira": d.gel,
    "Outros aparelhos": d.outE,
    "Máquina de lavar (energia)": d.ciclos * SEMANAS_NO_MES * KWH_POR_LAVAGEM
  };

  const soma = itens => Object.values(itens).reduce((a, b) => a + b, 0);
  const m3 = soma(agua);
  const kwh = soma(energia);

  return {
    agua, energia, m3, kwh,
    reaisAgua: m3 * d.tm,
    reaisEnergia: kwh * d.tk
  };
}

/* 6. Dicas ---------------------------------------------------------------- */

// Escolhe as 3 dicas de maior peso. Com variacao > 0, soma um fator
// pseudoaleatório ao peso para embaralhar a escolha.
function escolherDicas(d, variacao) {
  const aleatorio = i => {
    const x = Math.sin(i * 9301 + variacao * 49297) * 233280;
    return x - Math.floor(x);
  };

  return DICAS
    .map((dica, i) => ({ dica, nota: dica.peso(d) + (variacao ? aleatorio(i) * 0.5 : 0) }))
    .filter(item => item.nota > 0)
    .sort((a, b) => b.nota - a.nota)
    .slice(0, 3)
    .map(item => item.dica.texto(d));
}

/* 7. Tela ----------------------------------------------------------------- */
let variacaoDicas = 0; // aumenta a cada clique em "Outras dicas"

// Monta as linhas da tabela de detalhe, do maior gasto para o menor
function linhasDetalhe(d, r) {
  const linhas = [];
  for (const [nome, m3] of Object.entries(r.agua)) {
    if (m3 > 0) linhas.push({ nome, reais: m3 * d.tm, consumo: `${numero(m3)} m³` });
  }
  for (const [nome, kwh] of Object.entries(r.energia)) {
    if (kwh > 0) linhas.push({ nome, reais: kwh * d.tk, consumo: `${numero(kwh)} kWh` });
  }
  return linhas.sort((a, b) => b.reais - a.reais);
}

function atualizarTela() {
  const d = lerFormulario();
  const r = calcular(d);
  const total = r.reaisAgua + r.reaisEnergia;

  // Total e subtotais
  $("total").textContent = brl(total);
  $("rw").textContent = brl(r.reaisAgua);
  $("mw").textContent = ` · ${numero(r.m3)} m³`;
  $("re").textContent = brl(r.reaisEnergia);
  $("me").textContent = ` · ${numero(r.kwh)} kWh`;

  // Barra água x energia
  const pctAgua = total > 0 ? (r.reaisAgua / total) * 100 : 50;
  $("barw").style.width = pctAgua + "%";
  $("bare").style.width = 100 - pctAgua + "%";

  // Detalhe por item
  $("det").innerHTML = linhasDetalhe(d, r)
    .map(l => `<tr><td>${l.nome} <span class="mut">${l.consumo}</span></td><td>${brl(l.reais)}</td></tr>`)
    .join("");

  // Dicas
  $("tips").innerHTML = escolherDicas(d, variacaoDicas)
    .map(texto => `<div class="tip">${texto}</div>`)
    .join("");

  salvar(d);
}

/* 8. Armazenamento (Local Storage) ---------------------------------------- */
// Tudo dentro de try/catch: o navegador pode bloquear o armazenamento.

function salvar(dados) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
  } catch (e) { /* ignora */ }
}

function carregar() {
  try {
    const texto = localStorage.getItem(CHAVE_STORAGE);
    if (texto) preencherFormulario(JSON.parse(texto));
  } catch (e) { /* ignora */ }
}

/* 9. Eventos e início ----------------------------------------------------- */
$("f").addEventListener("input", () => {
  variacaoDicas = 0;
  atualizarTela();
});

$("more").addEventListener("click", () => {
  variacaoDicas++;
  atualizarTela();
});

$("reset").addEventListener("click", () => {
  preencherFormulario(PADROES);
  variacaoDicas = 0;
  atualizarTela();
});

carregar();
atualizarTela();