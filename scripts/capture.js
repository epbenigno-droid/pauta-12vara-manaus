// Script que tira uma captura de tela da pauta de audiências do PJe,
// aplicando o zoom e a ocultação de cabeçalho já testados no painel.
// Roda automaticamente pelo GitHub Actions (veja .github/workflows/capturar-pauta.yml).
//
// Reforços contra capturas em branco:
//  1) a nova tentativa RECARREGA de verdade a página (antes ela navegava para a
//     mesma URL com "#", o que o navegador trata como âncora e não recarrega);
//  2) só considera que deu certo quando o cabeçalho da tabela ("Índice") está visível;
//  3) se, mesmo após todas as tentativas, a tabela não aparecer e existir uma captura
//     recente, MANTÉM a captura anterior em vez de publicar uma imagem em branco.

const { chromium } = require('playwright');
const { execSync } = require('child_process');

const URL_PAUTA = 'https://pje.trt11.jus.br/consultaprocessual/pautas#VT12-1';
const MAX_TENTATIVAS = 3;
const HORAS_PARA_CONSIDERAR_RECENTE = 4;

const CSS_AJUSTE = `
  html { zoom: 1.0 !important; }
  mat-card:nth-of-type(1), mat-card:nth-of-type(2) { display: none !important; }
`;

async function tentarCapturar(page, tentativa) {
  console.log(`Tentativa ${tentativa}: abrindo a página da pauta...`);

  // passa por about:blank para garantir um carregamento completo
  await page.goto('about:blank');
  try {
    await page.goto(URL_PAUTA, { waitUntil: 'networkidle', timeout: 60000 });
  } catch (e) {
    console.log('Aviso ao carregar a página (seguindo mesmo assim):', e.message);
  }

  await page.addStyleTag({ content: CSS_AJUSTE });

  // espera o cabeçalho da tabela ("Índice") aparecer de verdade na tela
  let carregou = false;
  try {
    await page.waitForFunction(() => {
      // procura, entre os elementos visíveis, algum cujo texto PRÓPRIO seja
      // um dos títulos de coluna da tabela de audiências
      const marcadores = ['Índice', 'Horário', 'Situação'];
      return Array.from(document.querySelectorAll('*')).some(el => {
        if (el.offsetParent === null) return false; // escondido
        const proprio = Array.from(el.childNodes)
          .filter(n => n.nodeType === 3)
          .map(n => n.textContent)
          .join('')
          .trim();
        return marcadores.includes(proprio);
      });
    }, null, { timeout: 25000 });
    carregou = true;
  } catch (e) {
    carregou = false;
  }
  console.log(`Tabela visível: ${carregou}`);

  if (carregou) {
    // deixa as linhas terminarem de ser desenhadas
    await page.waitForTimeout(4000);
  }
  return carregou;
}

// há quantas horas o pauta.png foi atualizado pela última vez (ou null se não der para saber)
function horasDesdeUltimaAtualizacao() {
  try {
    execSync('git fetch --depth=100 origin main', { stdio: 'ignore' });
    const ts = execSync('git log -1 --format=%ct origin/main -- pauta.png', { encoding: 'utf8' }).trim();
    if (!ts) return null;
    return (Date.now() / 1000 - Number(ts)) / 3600;
  } catch (e) {
    console.log('Não foi possível consultar o histórico do git:', e.message);
    return null;
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  let sucesso = false;
  for (let i = 1; i <= MAX_TENTATIVAS && !sucesso; i++) {
    try {
      sucesso = await tentarCapturar(page, i);
    } catch (e) {
      console.log(`Tentativa ${i} falhou: ${e.message}`);
    }
    if (!sucesso && i < MAX_TENTATIVAS) {
      await page.waitForTimeout(5000);
    }
  }

  if (!sucesso) {
    const horas = horasDesdeUltimaAtualizacao();
    if (horas !== null && horas < HORAS_PARA_CONSIDERAR_RECENTE) {
      console.log(`Tabela não apareceu após ${MAX_TENTATIVAS} tentativas. Mantendo a captura anterior (atualizada há ${horas.toFixed(1)}h).`);
      await browser.close();
      return;
    }
    console.log('Tabela não apareceu e não há captura recente. Publicando a página como está (pode ser um dia sem audiências).');
  }

  console.log('Tirando a captura...');
  await page.screenshot({ path: 'pauta.png', fullPage: true });

  await browser.close();
  console.log('Captura salva em pauta.png');
})();
