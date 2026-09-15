const { chromium } = require('playwright');

const URL_PAUTA = 'https://pje.trt11.jus.br/consultaprocessual/pautas#VT12-1';

const CSS_AJUSTE = `
  html { zoom: 1.0 !important; }
  mat-card:nth-of-type(1), mat-card:nth-of-type(2) { display: none !important; }
`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log('Abrindo a página da pauta...');
  await page.goto(URL_PAUTA, { waitUntil: 'networkidle', timeout: 60000 });

  await page.addStyleTag({ content: CSS_AJUSTE });

  await page.waitForTimeout(6000);

  console.log('Tirando a captura...');
  await page.screenshot({ path: 'pauta.png', fullPage: true });

  await browser.close();
  console.log('Captura salva em pauta.png');
})();
