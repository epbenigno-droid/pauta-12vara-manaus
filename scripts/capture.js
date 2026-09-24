// Script que tira uma captura de tela da pauta de audiências, usando a
// página do JTe feita especificamente para exibição em painéis de TV
// (com rolagem automática já embutida pelo próprio CSJT).
// Roda automaticamente pelo GitHub Actions (veja .github/workflows/capturar-pauta.yml).

const { chromium } = require('playwright');

const URL_PAUTA = 'https://jte.csjt.jus.br/PautaDigitalPage?view=PautaDigitalPage&orgaos=12&regional=511&exibePartes=S&itensPorOrgao=10&destaque=S&exibeSala=S&alertaSonoro=S&autoRolagem=S';

// tenta capturar até 2 vezes: se a página estiver lenta e a primeira
// tentativa sair "vazia" (sem nenhuma linha da tabela carregada), tenta de
// novo antes de desistir, em vez de publicar uma captura em branco.
async function tentarCapturar(page, tentativa) {
  console.log(`Tentativa ${tentativa}: abrindo a página da pauta...`);
  await page.goto(URL_PAUTA, { waitUntil: 'networkidle', timeout: 60000 });

  // espera a tabela (que carrega via JavaScript) terminar de desenhar
  await page.waitForTimeout(10000);

  // confere se pelo menos alguma linha de tabela apareceu na página, como
  // sinal de que o conteúdo carregou de verdade (e não só uma tela vazia)
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
