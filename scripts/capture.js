name: Capturar pauta de audiências

on:
  schedule:
    - cron: '0,30 11-19 * * 1-5'
  workflow_dispatch: {}

jobs:
  capturar:
    runs-on: ubuntu-latest
    steps:
      - name: Baixar o repositório
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Instalar o Playwright
        run: |
          npm install playwright
          npx playwright install --with-deps chromium

      - name: Rodar a captura
        run: node scripts/capture.js

      - name: Publicar a imagem atualizada
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add pauta.png
          git diff --quiet --cached || git commit -m "Atualiza captura da pauta"
          git push
