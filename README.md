# ðŸ¥¦ Motor de Pedidos FLV â€” ExtensÃ£o Google Chrome (Manifest V3)

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![SQLite WebAssembly](https://img.shields.io/badge/SQLite-WASM-07405E?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/wasm)
[![Open-Meteo API](https://img.shields.io/badge/Weather-Open--Meteo-FF9900?style=flat-square)](https://open-meteo.com/)

> ExtensÃ£o inteligente para Google Chrome desenvolvida como motor de apoio Ã  tomada de decisÃ£o para compras e pedidos de **FLV (Frutas, Legumes e Verduras)** em redes de varejo/atacado.

---

## ðŸŽ¯ Objetivo e Funcionalidades

O setor de FLV lida com mercadorias altamente perecÃ­veis, com variaÃ§Ã£o extrema de consumo influenciada por clima, dias da semana e sazonalidade. O **Motor de Pedidos FLV** processa mÃºltiplas variÃ¡veis em tempo real para sugerir pedidos precisos:

- ðŸŒ¦ï¸ **AnÃ¡lise ClimÃ¡tica em Tempo Real**: Consulta automÃ¡tica da previsÃ£o do tempo via **Open-Meteo API** (temperatura, precipitaÃ§Ã£o e sensaÃ§Ã£o tÃ©rmica) para correlacionar impacto no consumo de saladas, frutas e legumes.
- ðŸ“¦ **IntegraÃ§Ã£o de Estoque via SQLite WASM**: Executa um motor **SQLite compilado em WebAssembly diretamente no navegador**, sincronizando bases de dados de estoque do Big Mais (`estoque_bigmais.db`) hospedadas no GitHub sem depender de servidores intermediÃ¡rios.
- ðŸ“ˆ **TendÃªncia e Sazonalidade**: Algoritmo preditivo que considera histÃ³rico de vendas, quebras operacionais e calendÃ¡rio de entregas de fornecedores.
- âš™ï¸ **Painel Interativo**: Interface popup moderna com grÃ¡ficos, filtros por loja e alertas de risco de ruptura ou excesso de estoque.

---

## ðŸ—ï¸ Arquitetura do Projeto

```text
â”œâ”€â”€ manifest.json              # ConfiguraÃ§Ãµes do Manifest V3 e permissÃµes do Chrome
â”œâ”€â”€ popup.html                 # Interface grÃ¡fica de controle e visualizaÃ§Ã£o
â”œâ”€â”€ popup.js                   # LÃ³gica central, motor preditivo e integraÃ§Ãµes de API
â”œâ”€â”€ sql-wasm.js / .wasm        # Engine SQLite compilada em WebAssembly para execuÃ§Ã£o local
â”œâ”€â”€ banco_estoque_padrao.js    # Estruturas padrÃ£o e fallback da base de dados
â”œâ”€â”€ banco_estoque_padrao.json  # CatÃ¡logo inicial de produtos e parÃ¢metros de estoque
â””â”€â”€ icons/                     # Ãcones da extensÃ£o (16px, 48px, 128px)
```

---

## ðŸš€ Como Instalar no Google Chrome

Como esta extensÃ£o foi desenvolvida para uso operacional, instale-a em modo desenvolvedor:

1. Baixe ou clone este repositÃ³rio:
   ```bash
   git clone https://github.com/saaesilva/Extensao-Pedido-FLV.git
   ```
2. Abra o Google Chrome e acesse a pÃ¡gina de extensÃµes digitando na barra de endereÃ§os:
   ```text
   chrome://extensions/
   ```
3. No canto superior direito, ative a chave **Modo do desenvolvedor** (*Developer mode*).
4. Clique no botÃ£o **Carregar sem compactaÃ§Ã£o** (*Load unpacked*).
5. Selecione a pasta do projeto baixado.
6. Pronto! O Ã­cone do **Motor de Pedidos FLV** aparecerÃ¡ na sua barra de extensÃµes do Chrome.

---

## ðŸ”— IntegraÃ§Ã£o com o Ecossistema

Esta extensÃ£o foi projetada para atuar em conjunto com o repositÃ³rio **[estoque-bigmais-automacao](https://github.com/saaesilva/estoque-bigmais-automacao)**, consumindo a base atualizada periodicamente pelo GitHub Actions.

---

## ðŸ‘¤ Autor

Desenvolvido por **[Samuel Silva](https://github.com/saaesilva)**.  
Todos os direitos reservados.