// Script que tira uma captura de tela da pauta de audiências, usando a
// página do JTe feita especificamente para exibição em painéis de TV
// (com rolagem automática já embutida pelo próprio CSJT).
// Roda automaticamente pelo GitHub Actions (veja .github/workflows/capturar-pauta.yml).
//
// O JTe bloqueia navegadores automatizados por padrão (detecção de robô),
// então este script disfarça o navegador para se parecer com um Chrome
// comum de um usuário real antes de acessar a página.

const { chromium } = require('playwright');

const URL_PAUTA = 'https://jte.csjt.jus.br/PautaDigitalPage?view=PautaDigitalPage&orgaos=12&regional=511&exibePartes=S&itensPorOrgao=10&destaque=S&exibeSala=S&alertaSonoro=S&autoRolagem=S';

const USER_AGENT_REAL = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

async function tentarCapturar(context, tentativa) {
  const page = await context.newPage();

  // remove o sinalizador que denuncia automação (navigator.webdriver)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log(`Tentativa ${tentativa}: abrindo a página da pauta...`);
  const resposta = await page.goto(URL_PAUTA, { waitUntil: 'networkidle', timeout: 60000 });
  console.log(`Status da resposta: ${resposta ? resposta.status() : 'sem resposta'}`);

  await page.waitForTimeout(10000);

  const temConteudo = await page.locator('table, mat-table, tr').count();
  console.log(`Elementos de tabela encontrados: ${temConteudo}`);

  return { page, sucesso: temConteudo > 0 };
}

(async () => {
  const browser = await chromium.launch({
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: USER_AGENT_REAL,
    locale: 'pt-BR',
    timezoneId: 'America/Manaus'
  });

  let { page, sucesso } = await tentarCapturar(context, 1);

  if (!sucesso) {
    console.log('Conteúdo não detectado na primeira tentativa, tentando mais uma vez...');
    await page.close();
    ({ page, sucesso } = await tentarCapturar(context, 2));
  }

  console.log('Tirando a captura...');
  await page.screenshot({ path: 'pauta.png', fullPage: true });

  await browser.close();
  console.log('Captura salva em pauta.png' + (sucesso ? '' : ' (aviso: conteúdo pode estar incompleto mesmo após 2 tentativas)'));
})();
