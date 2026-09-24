// Script que tira uma captura de tela da pauta de audiências do PJe,
// aplicando o mesmo zoom e ocultação de cabeçalho já testados no painel.
// Roda automaticamente pelo GitHub Actions (veja .github/workflows/capturar-pauta.yml).
//
// Nota: o JTe (jte.csjt.jus.br) tem uma página feita sob medida para TVs
// (com rolagem automática embutida), mas bloqueia navegadores automatizados
// mesmo com disfarce (user-agent, remoção de sinais de automação etc.) —
// por isso seguimos usando o PJe, que funciona de forma estável.

const { chromium } = require('playwright');

const URL_PAUTA = 'https://pje.trt11.jus.br/consultaprocessual/pautas#VT12-1';

const CSS_AJUSTE = `
  html { zoom: 1.0 !important; }
  mat-card:nth-of-type(1), mat-card:nth-of-type(2) { display: none !important; }
`;

async function tentarCapturar(page, tentativa) {
  console.log(`Tentativa ${tentativa}: abrindo a página da pauta...`);
  await page.goto(URL_PAUTA, { waitUntil: 'networkidle', timeout: 60000 });
  await page.addStyleTag({ content: CSS_AJUSTE });

  await page.waitForTimeout(10000);

  const temConteudo = await page.locator('table, mat-table, tr').count();
  console.log(`Elementos de tabela encontrados: ${temConteudo}`);

  return temConteudo > 0;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  let sucesso = await tentarCapturar(page, 1);

  if (!sucesso) {
    console.log('Conteúdo não detectado na primeira tentativa, tentando mais uma vez...');
    sucesso = await tentarCapturar(page, 2);
  }

  console.log('Tirando a captura...');
  await page.screenshot({ path: 'pauta.png', fullPage: true });

  await browser.close();
  console.log('Captura salva em pauta.png' + (sucesso ? '' : ' (aviso: conteúdo pode estar incompleto mesmo após 2 tentativas)'));
})();
