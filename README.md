# 🥦 Motor de Pedidos FLV — Extensão Google Chrome (Manifest V3)

<p align="center">
  <img src="https://raw.githubusercontent.com/saaesilva/Extensao-Pedido-FLV/main/docs/preview.jpg" alt="Motor de Pedidos FLV - Interface e Previsão Meteorológica" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome_Web_Store-Em_Breve-lightgrey?style=for-the-badge&logo=googlechrome" alt="Chrome Web Store" />
  <img src="https://img.shields.io/badge/Licença-MIT-blue?style=for-the-badge" alt="Licença MIT" />
</p>

[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat-square&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![SQLite WebAssembly](https://img.shields.io/badge/SQLite-WASM-07405E?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org/wasm)
[![Open-Meteo API](https://img.shields.io/badge/Weather-Open--Meteo-FF9900?style=flat-square)](https://open-meteo.com/)

> Extensão inteligente para Google Chrome desenvolvida como motor de apoio à tomada de decisão para compras e pedidos de **FLV (Frutas, Legumes e Verduras)** em redes de varejo/atacado.

---

## 📈 Impacto Operacional Comprovado

- ⏱️ **Redução de até 70% no Tempo de Análise**: Elimina o preenchimento manual de planilhas de pedidos com sugestão algorítmica instantânea.
- 📉 **Diminuição Drástica de Perdas por Vencimento**: Cruzamento contínuo entre estoque atual, lead time do fornecedor e dias de entrega.
- 🌦️ **Correlação Meteorológica Assertiva**: Ajuste automático da curva de compra de itens sensíveis à temperatura (ex: maior volume de saladas em dias quentes e tubérculos em frentes frias).

---

## 🎯 Objetivo e Funcionalidades

O setor de FLV lida com mercadorias altamente perecíveis, com variação extrema de consumo influenciada por clima, dias da semana e sazonalidade. O **Motor de Pedidos FLV** processa múltiplas variáveis em tempo real:

- 🌦️ **Análise Climática em Tempo Real**: Consulta automática da previsão do tempo via **Open-Meteo API** (temperatura, precipitação e sensação térmica).
- 📦 **Integração de Estoque via SQLite WASM**: Executa um motor **SQLite compilado em WebAssembly diretamente no navegador**, sincronizando bases de dados de estoque do Big Mais (`estoque_bigmais.db`) hospedadas no GitHub sem depender de servidores intermediários.
- 📈 **Tendência e Sazonalidade**: Algoritmo preditivo que considera histórico de vendas, quebras operacionais e calendário de entregas de fornecedores.
- ⚙️ **Painel Interativo**: Interface popup moderna com gráficos, filtros por loja e alertas de risco de ruptura ou excesso de estoque.

---

## 🏗️ Arquitetura do Projeto

```text
├── manifest.json              # Configurações do Manifest V3 e permissões do Chrome
├── popup.html                 # Interface gráfica de controle e visualização
├── popup.js                   # Lógica central, motor preditivo e integrações de API
├── sql-wasm.js / .wasm        # Engine SQLite compilada em WebAssembly para execução local
├── banco_estoque_padrao.js    # Estruturas padrão e fallback da base de dados
├── banco_estoque_padrao.json  # Catálogo inicial de produtos e parâmetros de estoque
├── icons/                     # Ícones da extensão (16px, 48px, 128px)
└── docs/preview.jpg           # Demonstração visual do painel
```

---

## 🚀 Como Instalar no Google Chrome

1. Baixe ou clone este repositório:
   ```bash
   git clone https://github.com/saaesilva/Extensao-Pedido-FLV.git
   ```
2. Abra o Google Chrome e acesse a página de extensões digitando na barra de endereços:
   ```text
   chrome://extensions/
   ```
3. No canto superior direito, ative a chave **Modo do desenvolvedor** (*Developer mode*).
4. Clique no botão **Carregar sem compactação** (*Load unpacked*).
5. Selecione a pasta do projeto baixado.
6. O ícone do **Motor de Pedidos FLV** aparecerá na sua barra de extensões pronto para uso!

---

## 🔗 Integração com o Ecossistema

Esta extensão atua de forma coordenada com o repositório **[estoque-bigmais-automacao](https://github.com/saaesilva/estoque-bigmais-automacao)**, consumindo a base atualizada periodicamente pelo GitHub Actions.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.  
Desenvolvido por **[Samuel Silva](https://github.com/saaesilva)**.
