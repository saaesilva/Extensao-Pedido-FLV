// ============================================================================
// Motor de Pedidos FLV - Arquitetura Profissional v1.4
// Sistema Inteligente de Apoio à Tomada de Decisão (Big Mais / Dext)
// Módulos: Curva ABC Dinâmica, Sazonalidade Fina, Alerta de Queima e Feedback Loop
// ============================================================================

// Configuração Oficial das Lojas Big Mais
const LOJAS_CONFIG = [
    { id: "01 PER", cod: "1", nome: "Jardim Pérola", alias: ["perola", "jardim perola", "per", "01", "loja 01", "lj 01", "lj 1"] },
    { id: "02 TRE", cod: "2", nome: "Treze de Maio", alias: ["treze", "treze de maio", "trevo", "tre", "02", "loja 02", "lj 02", "lj 2"] },
    { id: "04 LAG", cod: "4", nome: "Lagoa Santa", alias: ["lagoa", "lagoa santa", "lag", "04", "loja 04", "lj 04", "lj 4"] },
    { id: "05 ALT", cod: "5", nome: "Altinópolis", alias: ["altinopolis", "altinópolis", "alt", "05", "loja 05", "lj 05", "lj 5"] },
    { id: "08 ISA", cod: "8", nome: "Vila Isa", alias: ["vila isa", "isa", "ilha", "ilha dos araujos", "08", "loja 08", "lj 08", "lj 8"] },
    { id: "09 SPD", cod: "9", nome: "São Paulo", alias: ["sao paulo", "são paulo", "spd", "sp", "sao pedro", "09", "loja 09", "lj 09", "lj 9"] }
];

function obterLojaConfig(identificador) {
    if (!identificador) return null;
    const str = String(identificador).toLowerCase().trim();
    return LOJAS_CONFIG.find(l => 
        l.id.toLowerCase() === str ||
        l.cod === str ||
        l.nome.toLowerCase() === str ||
        l.alias.some(a => str.includes(a) || a === str)
    ) || null;
}

// Perfis Iniciais Calibrados por Loja (Governador Valadares - MG)
const PERFIS_PADRAO_LOJAS = {
    "01 PER": {
        id: "01 PER",
        nome: "Jardim Pérola",
        arquetipo: "Hiperloja & FDS",
        desc: "Grande concentração no fim de semana e ciclo de pagamento",
        fatorCalibracao: 1.05,
        pesosDias: [1.15, 0.85, 0.90, 0.95, 1.00, 1.10, 1.25],
        impulsoFDS: 1.18,
        impulsoQuarta: 0.95,
        amostras: 0,
        ultimaAtualizacao: "Inicial"
    },
    "02 TRE": {
        id: "02 TRE",
        nome: "Treze de Maio",
        arquetipo: "Centro & Quarta de Ofertas",
        desc: "Centro urbano: Pico forte na Quarta de Hortifrúti",
        fatorCalibracao: 1.02,
        pesosDias: [0.75, 1.05, 1.10, 1.30, 0.95, 1.15, 0.90],
        impulsoFDS: 1.03,
        impulsoQuarta: 1.30,
        amostras: 0,
        ultimaAtualizacao: "Inicial"
    },
    "04 LAG": {
        id: "04 LAG",
        nome: "Lagoa Santa",
        arquetipo: "Bairro Nobre & Especiais",
        desc: "Alta demanda de hidropônicos, folhas nobres e giro contínuo",
        fatorCalibracao: 1.00,
        pesosDias: [0.95, 0.95, 0.98, 1.05, 1.00, 1.12, 1.15],
        impulsoFDS: 1.14,
        impulsoQuarta: 1.05,
        amostras: 0,
        ultimaAtualizacao: "Inicial"
    },
    "05 ALT": {
        id: "05 ALT",
        nome: "Altinópolis",
        arquetipo: "Tradicional & Pagamento",
        desc: "Bairro familiar: Picos no sábado e dias de pagamento (05 e 20)",
        fatorCalibracao: 1.00,
        pesosDias: [1.05, 0.90, 0.92, 1.00, 1.02, 1.08, 1.22],
        impulsoFDS: 1.15,
        impulsoQuarta: 1.00,
        amostras: 0,
        ultimaAtualizacao: "Inicial"
    },
    "08 ISA": {
        id: "08 ISA",
        nome: "Vila Isa",
        arquetipo: "Giro Rápido & Preço",
        desc: "Compras diárias fracionadas e alta sensibilidade a promoções",
        fatorCalibracao: 0.98,
        pesosDias: [0.90, 0.95, 0.98, 1.20, 0.95, 1.10, 1.12],
        impulsoFDS: 1.11,
        impulsoQuarta: 1.20,
        amostras: 0,
        ultimaAtualizacao: "Inicial"
    },
    "09 SPD": {
        id: "09 SPD",
        nome: "São Paulo",
        arquetipo: "Avenida & Fluxo Pré-FDS",
        desc: "Corredor comercial: Forte pico de Sexta e Sábado",
        fatorCalibracao: 1.03,
        pesosDias: [0.90, 0.92, 0.95, 1.05, 1.02, 1.20, 1.16],
        impulsoFDS: 1.18,
        impulsoQuarta: 1.05,
        amostras: 0,
        ultimaAtualizacao: "Inicial"
    }
};

// Estado Global da Aplicação
const AppState = {
    dadosGrafico: null,
    estoqueTotal: 0,
    estoquesOutrasLojas: {},
    sincronismoInfo: null, // Auditoria de sincronismo oficial (Loja, Código e Descrição)
    clima: { 
        temperatura: 35.7, 
        fator: 1.08, 
        chuvaMm: 0, 
        probChuva: 0, 
        classificacao: "Calor extremo | Sem chuva" 
    },
    margemSeguranca: 0, // porcentagem extra opcional (ex: 5%)
    modoAbatimentoEstoque: "segunda", // 'segunda' ou 'hoje'
    modeloCiclos: "4ciclos", // '4ciclos', '3ciclos' ou '7ciclos'
    tipoArredondamento: "inteiro", // 'inteiro', 'multiplo5', 'multiplo10', 'caixa'
    
    // Pilares Avançados de Tomada de Decisão
    usarTendencia: true, // Pondera momentum das últimas 2-3 semanas
    modoFaseMes: "auto", // 'auto', 'pagamento', 'meio', 'fim', 'desativado'
    modoQuebraTecnica: "auto", // 'auto' (baseado em perecibilidade do item), '0', '5', '10'
    usarFiltroRuptura: true, // Expurga dias com venda 0 causados por falta de mercadoria na gôndola

    // Novos Módulos Estratégicos
    modoCurvaABC: "auto", // 'auto', 'A', 'B', 'C'
    usarSazonalidadeFina: true, // Modulação fina por dia da semana (Efeito Fim de Semana)
    usarAlertaQueima: true, // Monitora shelf-life de lote e sugere promoção de escoamento
    usarFeedbackLoop: true, // Auto-correção autônoma baseada em Erro Médio Absoluto (EMA)
    historicoPredicoes: {}, // Cache persistido de predições anteriores para cálculo de EMA
    
    // Modelo de Aprendizado de Perfil por Loja (IA Adaptativa)
    usarPerfilLoja: true, // Personalização inteligente da compra por filial
    perfisLojasAprendizado: JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS)),
    ultimoSalvoAprendizadoEm: null,
    _backupPendenteParaImportar: null,

    // Integração com Banco de Dados de Estoque Big Mais (GitHub Actions / SQLite)
    bancoEstoque: {
        ativo: true,
        repoGitHub: "saaesilva/estoque-bigmais-automacao",
        branchGitHub: "main",
        arquivoGitHub: "estoque_bigmais.db",
        tokenGitHub: "",
        dados: (typeof BANCO_ESTOQUE_PADRAO !== 'undefined' && BANCO_ESTOQUE_PADRAO) ? BANCO_ESTOQUE_PADRAO : null,
        ultimaAtualizacao: (typeof DATA_BANCO_ESTOQUE_PADRAO !== 'undefined' && DATA_BANCO_ESTOQUE_PADRAO) ? DATA_BANCO_ESTOQUE_PADRAO : "04/10/2026",
        carregado: typeof BANCO_ESTOQUE_PADRAO !== 'undefined',
        origem: "padrao" // "github", "arquivo", "padrao"
    },

    raioXAberto: false,
    abaAtiva: "tab-sugestoes"
};

document.addEventListener("DOMContentLoaded", async () => {
    inicializarDatas();
    await inicializarBancoEstoque();
    carregarPreferenciasSalvas();
    configurarEventos();
    autoDetectarDextNaAbertura();
});

// Inicializa valores de datas inteligentes
function inicializarDatas() {
    const hoje = new Date();
    const dataFinalPadrao = formatarDataIso(hoje);
    const dataInicioPadrao = formatarDataIso(new Date(hoje.getTime() - 60 * 24 * 60 * 60 * 1000));

    const inputInicio = document.getElementById("inputDataInicio");
    const inputFinal = document.getElementById("inputDataFinal");

    if (inputInicio && !inputInicio.value) inputInicio.value = dataInicioPadrao;
    // Regra de Negócio: Data Final SEMPRE tem que ser o Dia atual
    if (inputFinal) {
        inputFinal.value = dataFinalPadrao;
        inputFinal.max = dataFinalPadrao;
    }
}

function formatarDataIso(dataObj) {
    const ano = dataObj.getFullYear();
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dataObj.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Configuração de ouvintes de eventos da UI
function configurarEventos() {
    // Abas de navegação
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const targetTab = e.currentTarget.getAttribute("data-tab");
            mudarAba(targetTab);
        });
    });

    // Busca rápida de produtos no dropdown
    const inputBusca = document.getElementById("inputFiltroBusca");
    if (inputBusca) {
        inputBusca.addEventListener("input", filtrarProdutosDropdown);
    }

    // Mudança de campos do formulário
    document.getElementById("selectLoja").addEventListener("change", () => {
        salvarEstadoFormulario();
        aplicarEstoqueDoBancoAoProdutoSelecionado();
    });
    document.getElementById("inputDataInicio").addEventListener("change", salvarEstadoFormulario);

    const inputFinalEl = document.getElementById("inputDataFinal");
    if (inputFinalEl) {
        inputFinalEl.addEventListener("change", () => {
            const hojeIso = formatarDataIso(new Date());
            if (inputFinalEl.value !== hojeIso) {
                inputFinalEl.value = hojeIso;
                exibirToast("Data Final mantida sempre no dia atual.");
            }
            salvarEstadoFormulario();
        });
    }

    // Botões de ação
    document.getElementById("selectProduto").addEventListener("change", () => {
        salvarEstadoFormulario();
        aplicarEstoqueDoBancoAoProdutoSelecionado();
        executarAutomacaoDext();
    });

    document.getElementById("btnAplicarDext").addEventListener("click", () => {
        salvarEstadoFormulario();
        aplicarEstoqueDoBancoAoProdutoSelecionado();
        executarAutomacaoDext();
    });

    document.getElementById("btnAtualizar").addEventListener("click", () => {
        recalcularTelaAtual();
    });

    // Ouvintes delegados para ações do Banco de Dados
    document.addEventListener("click", async (e) => {
        // Sincronizar Nuvem (GitHub)
        const btnSyncGitHub = e.target.closest("#btnSyncGitHub");
        if (btnSyncGitHub) {
            await sincronizarBancoGitHub();
            return;
        }

        // Carregar arquivo .db local (fallback)
        const btnArquivo = e.target.closest("#btnCarregarArquivoDb");
        if (btnArquivo) {
            let inputFl = document.getElementById("inputFileDb");
            if (!inputFl) {
                inputFl = document.createElement("input");
                inputFl.type = "file";
                inputFl.id = "inputFileDb";
                inputFl.accept = ".db,.sqlite,.sqlite3";
                inputFl.style.display = "none";
                document.body.appendChild(inputFl);
                inputFl.addEventListener("change", (ev) => {
                    const f = ev.target.files?.[0];
                    if (f) carregarBancoDeArquivoLocal(f);
                });
            }
            inputFl.click();
            return;
        }

        // Puxar estoque do banco manualmente no card
        const btnPuxar = e.target.closest("#btnPuxarEstoqueBanco");
        if (btnPuxar) {
            const selProd = document.getElementById("selectProduto");
            const cod = selProd?.value || AppState.dadosGrafico?.produtoDetectado;
            if (cod) {
                aplicarEstoqueDoBancoAoProduto(cod, true);
                if (AppState.dadosGrafico) {
                    renderizarPainelResultados();
                }
                exibirToast("Estoque preenchido do Banco de Dados!");
            } else {
                exibirAlerta("Produto Não Selecionado", "Selecione um produto primeiro para carregar o estoque do banco.");
            }
            return;
        }
    });

    document.addEventListener("change", (e) => {
        if (e.target.id === "checkUsarBancoEstoque") {
            AppState.bancoEstoque.ativo = e.target.checked;
            salvarEstadoFormulario();
            aplicarEstoqueDoBancoAoProdutoSelecionado();
            exibirToast(AppState.bancoEstoque.ativo ? "Estoque do Banco ativado!" : "Estoque do Banco desativado.");
        }
        if (e.target.id === "inputRepoGitHub") {
            AppState.bancoEstoque.repoGitHub = e.target.value.trim();
            salvarEstadoFormulario();
        }
        if (e.target.id === "inputTokenGitHub") {
            AppState.bancoEstoque.tokenGitHub = e.target.value.trim();
            salvarEstadoFormulario();
        }
        if (e.target.id === "inputFileDb") {
            const f = e.target.files?.[0];
            if (f) carregarBancoDeArquivoLocal(f);
        }
    });
}

function mudarAba(tabId) {
    AppState.abaAtiva = tabId;
    document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
    });
    const contents = document.querySelectorAll(".tab-content");
    if (contents.length === 0) {
        renderizarPainelResultados();
    } else {
        contents.forEach(content => {
            content.classList.toggle("active", content.id === tabId);
        });
    }
}

// Filtro rápido de produtos em tempo real
function filtrarProdutosDropdown() {
    const termo = (document.getElementById("inputFiltroBusca").value || "").toLowerCase().trim();
    const select = document.getElementById("selectProduto");
    const options = select.querySelectorAll("option");

    let primeiroVisivel = null;
    options.forEach(opt => {
        if (!opt.value) return;
        const match = opt.text.toLowerCase().includes(termo) || opt.value.includes(termo);
        opt.style.display = match ? "" : "none";
        if (match && !primeiroVisivel) primeiroVisivel = opt;
    });

    select.querySelectorAll("optgroup").forEach(group => {
        const visiveis = Array.from(group.querySelectorAll("option")).filter(o => o.style.display !== "none");
        group.style.display = visiveis.length > 0 ? "" : "none";
    });
}

// Carrega preferências do Chrome Storage
function carregarPreferenciasSalvas() {
    chrome.storage.local.get([
        "lojaSalva", "dataInicioSalva", "dataFinalSalva", "produtoSalvo",
        "resultadoSalvo", "margemSeguranca", "modoAbatimento", "modeloCiclos", 
        "tipoArredondamento", "usarTendencia", "modoFaseMes", "modoQuebraTecnica", "usarFiltroRuptura",
        "modoCurvaABC", "usarSazonalidadeFina", "usarAlertaQueima", "usarFeedbackLoop", "historicoPredicoes",
        "usarPerfilLoja", "perfisLojasAprendizado", "ultimoSalvoAprendizadoEm",
        "bancoEstoqueRepoGitHub", "bancoEstoqueBranchGitHub", "bancoEstoqueArquivoGitHub", 
        "bancoEstoqueTokenGitHub", "bancoEstoqueAtivo", "bancoEstoqueOrigem"
    ], (res) => {
        if (res.bancoEstoqueRepoGitHub) AppState.bancoEstoque.repoGitHub = res.bancoEstoqueRepoGitHub;
        if (res.bancoEstoqueBranchGitHub) AppState.bancoEstoque.branchGitHub = res.bancoEstoqueBranchGitHub;
        if (res.bancoEstoqueArquivoGitHub) AppState.bancoEstoque.arquivoGitHub = res.bancoEstoqueArquivoGitHub;
        if (res.bancoEstoqueTokenGitHub !== undefined) AppState.bancoEstoque.tokenGitHub = res.bancoEstoqueTokenGitHub;
        if (res.bancoEstoqueAtivo !== undefined) AppState.bancoEstoque.ativo = res.bancoEstoqueAtivo;
        if (res.bancoEstoqueOrigem) AppState.bancoEstoque.origem = res.bancoEstoqueOrigem;

        if (res.lojaSalva) {
            const selectLoja = document.getElementById("selectLoja");
            if (selectLoja) {
                const optExiste = Array.from(selectLoja.options).some(o => o.value === res.lojaSalva);
                if (optExiste) {
                    selectLoja.value = res.lojaSalva;
                } else {
                    const lojaCorrespondente = LOJAS_CONFIG.find(l => res.lojaSalva.includes(l.cod) || res.lojaSalva.includes(l.id.split(' ')[1]));
                    if (lojaCorrespondente) selectLoja.value = lojaCorrespondente.id;
                }
            }
        }
        if (res.dataInicioSalva) document.getElementById("inputDataInicio").value = res.dataInicioSalva;

        // Regra de Negócio: Data Final SEMPRE tem que ser o Dia atual
        const inputFinal = document.getElementById("inputDataFinal");
        const hojeIso = formatarDataIso(new Date());
        if (inputFinal) {
            inputFinal.value = hojeIso;
            inputFinal.max = hojeIso;
        }

        if (res.produtoSalvo) document.getElementById("selectProduto").value = res.produtoSalvo;
        if (res.margemSeguranca !== undefined) AppState.margemSeguranca = res.margemSeguranca;
        if (res.modoAbatimento) AppState.modoAbatimentoEstoque = res.modoAbatimento;
        if (res.modeloCiclos) AppState.modeloCiclos = res.modeloCiclos;
        if (res.tipoArredondamento) AppState.tipoArredondamento = res.tipoArredondamento;
        if (res.usarTendencia !== undefined) AppState.usarTendencia = res.usarTendencia;
        if (res.modoFaseMes) AppState.modoFaseMes = res.modoFaseMes;
        if (res.modoQuebraTecnica) AppState.modoQuebraTecnica = res.modoQuebraTecnica;
        if (res.usarFiltroRuptura !== undefined) AppState.usarFiltroRuptura = res.usarFiltroRuptura;
        if (res.modoCurvaABC) AppState.modoCurvaABC = res.modoCurvaABC;
        if (res.usarSazonalidadeFina !== undefined) AppState.usarSazonalidadeFina = res.usarSazonalidadeFina;
        if (res.usarAlertaQueima !== undefined) AppState.usarAlertaQueima = res.usarAlertaQueima;
        if (res.usarFeedbackLoop !== undefined) AppState.usarFeedbackLoop = res.usarFeedbackLoop;
        if (res.historicoPredicoes) AppState.historicoPredicoes = res.historicoPredicoes;
        if (res.usarPerfilLoja !== undefined) AppState.usarPerfilLoja = res.usarPerfilLoja;
        if (res.perfisLojasAprendizado) {
            AppState.perfisLojasAprendizado = Object.assign({}, JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS)), res.perfisLojasAprendizado);
        }
        if (res.ultimoSalvoAprendizadoEm) {
            AppState.ultimoSalvoAprendizadoEm = res.ultimoSalvoAprendizadoEm;
        }

        if (res.resultadoSalvo) {
            document.getElementById("resultado").innerHTML = res.resultadoSalvo;
            reativarBotoesDoResultado();
        } else {
            renderizarPainelResultados();
        }

        // Aplica e sincroniza o estoque do banco para o produto selecionado
        aplicarEstoqueDoBancoAoProdutoSelecionado();
    });
}

function salvarEstadoFormulario() {
    const hojeIso = formatarDataIso(new Date());
    const inputFinal = document.getElementById("inputDataFinal");
    if (inputFinal) {
        inputFinal.value = hojeIso;
    }

    chrome.storage.local.set({
        lojaSalva: document.getElementById("selectLoja")?.value || "",
        dataInicioSalva: document.getElementById("inputDataInicio")?.value || "",
        dataFinalSalva: hojeIso,
        produtoSalvo: document.getElementById("selectProduto")?.value || "",
        margemSeguranca: AppState.margemSeguranca,
        modoAbatimento: AppState.modoAbatimentoEstoque,
        modeloCiclos: AppState.modeloCiclos,
        tipoArredondamento: AppState.tipoArredondamento,
        usarTendencia: AppState.usarTendencia,
        modoFaseMes: AppState.modoFaseMes,
        modoQuebraTecnica: AppState.modoQuebraTecnica,
        usarFiltroRuptura: AppState.usarFiltroRuptura,
        modoCurvaABC: AppState.modoCurvaABC,
        usarSazonalidadeFina: AppState.usarSazonalidadeFina,
        usarAlertaQueima: AppState.usarAlertaQueima,
        usarFeedbackLoop: AppState.usarFeedbackLoop,
        historicoPredicoes: AppState.historicoPredicoes,
        usarPerfilLoja: AppState.usarPerfilLoja,
        perfisLojasAprendizado: AppState.perfisLojasAprendizado,
        ultimoSalvoAprendizadoEm: AppState.ultimoSalvoAprendizadoEm,
        bancoEstoqueRepoGitHub: AppState.bancoEstoque.repoGitHub,
        bancoEstoqueBranchGitHub: AppState.bancoEstoque.branchGitHub,
        bancoEstoqueArquivoGitHub: AppState.bancoEstoque.arquivoGitHub,
        bancoEstoqueTokenGitHub: AppState.bancoEstoque.tokenGitHub,
        bancoEstoqueAtivo: AppState.bancoEstoque.ativo,
        bancoEstoqueOrigem: AppState.bancoEstoque.origem
    });
}

// Auto-detecta loja e produto atuais se o usuário já estiver com o Dext aberto
async function autoDetectarDextNaAbertura() {
    try {
        const tab = await obterAbaAtiva();
        if (!tab || !tab.url || !tab.url.includes("bigmais.dext.com.br")) return;

        const res = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: () => {
                let codProd = null;
                const elDesc = document.getElementById("iddescricaoproduto");
                if (elDesc && elDesc.innerText) {
                    const match = elDesc.innerText.match(/\b(\d{3,6})\b/);
                    if (match) codProd = match[1];
                }
                if (!codProd) {
                    const elCod = document.getElementById("idcod_produto");
                    if (elCod && elCod.value) codProd = elCod.value.trim();
                }
                const elLoja = document.getElementById("idcod_local_abastecimento");
                const codLoja = elLoja ? elLoja.value.trim() : null;
                const descProd = elDesc?.innerText?.trim() || null;
                return { codProd, codLoja, descProd };
            }
        });

        const dados = res?.[0]?.result;
        if (!dados) return;

        if (dados.codLoja) {
            const lojaObj = obterLojaConfig(dados.codLoja);
            if (lojaObj) {
                const selectLoja = document.getElementById("selectLoja");
                if (selectLoja && selectLoja.value !== lojaObj.id) {
                    selectLoja.value = lojaObj.id;
                    salvarEstadoFormulario();
                }
            }
        }

        if (dados.codProd) {
            const selectProd = document.getElementById("selectProduto");
            if (selectProd) {
                const opt = Array.from(selectProd.options).find(o => o.value === dados.codProd || (dados.descProd && o.text.includes(dados.descProd)));
                if (opt && selectProd.value !== opt.value) {
                    selectProd.value = opt.value;
                    salvarEstadoFormulario();
                    aplicarEstoqueDoBancoAoProdutoSelecionado();
                } else if (!selectProd.value) {
                    selectProd.value = dados.codProd;
                    salvarEstadoFormulario();
                    aplicarEstoqueDoBancoAoProdutoSelecionado();
                }
            }
        }
    } catch (e) { }
}

// Função de Arredondamento Aplicada
function aplicarArredondamento(valor) {
    if (isNaN(valor)) return 0;
    switch (AppState.tipoArredondamento) {
        case "multiplo5":
            return Math.round(valor / 5) * 5;
        case "multiplo10":
            return Math.round(valor / 10) * 10;
        case "caixa":
            return Math.ceil(valor / 10) * 10;
        case "inteiro":
        default:
            return Math.round(valor);
    }
}

// Toast de notificação profissional
function exibirToast(mensagem) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = mensagem;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2200);
}

function exibirStatus(mensagemHtml) {
    const div = document.getElementById("resultado");
    if (div) {
        div.innerHTML = `
            <div class="status-loading">
                <div class="spinner"></div>
                <div>${mensagemHtml}</div>
            </div>
        `;
    }
}

function exibirAlerta(titulo, mensagemHtml, tipo = "aviso") {
    const div = document.getElementById("resultado");
    if (div) {
        const classe = tipo === "erro" ? "alerta-caixa erro" : "alerta-caixa";
        div.innerHTML = `
            <div class="${classe}">
                <strong>${titulo}</strong><br>
                ${mensagemHtml}
            </div>
            <button id="btnTentarNovamente" class="btn btn-secondary" style="width:100%; margin-top:6px;">
                🔄 Tentar Novamente
            </button>
        `;
        const btn = document.getElementById("btnTentarNovamente");
        if (btn) btn.addEventListener("click", recalcularTelaAtual);
    }
}

async function obterAbaAtiva() {
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab || !tab.id) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = tabs?.[0];
    }
    if (!tab || !tab.id) {
        throw new Error("Nenhuma aba ativa encontrada no navegador.");
    }
    if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("about:"))) {
        throw new Error("Por favor, abra a aba do sistema Dext no navegador.");
    }
    return tab;
}

// ============================================================================
// Algoritmo de Inteligência de Decisão e Análise de Demanda Avançada
// ============================================================================

function analisarDemandaAvancada(dadosGrafico, produtoTexto, lojaSelecionadaId, codigoProduto) {
    if (!dadosGrafico || !dadosGrafico.todosPontos) {
        return {
            classeScore: "badge-score score-c",
            textoScore: "Sem Dados",
            classeABC: "badge-abc abc-c",
            fatorClima: 1.0,
            estoque: 0,
            diasCobertura: 0,
            fatorTendencia: 1.0,
            descTendencia: "Estável",
            fatorFaseMes: 1.0,
            descFaseMes: "Padrão",
            mediasAjustadas: [0, 0, 0, 0, 0, 0, 0],
            sugestaoBase: 0,
            sugestaoFinal: 0,
            pedidosSugeridos: [],
            totalSugerido: 0,
            perfilLoja: null,
            alertaQueima: false,
            multiplicadorComposto: 1.0,
            impulsoFimDeSemana: 1.0
        };
    }
    const pontos = dadosGrafico.todosPontos || [];
    const statsOriginais = dadosGrafico.estatisticasDias || {};

    // 1. FILTRO DE SANEAMENTO DE RUPTURAS HISTÓRICAS
    let mediasAjustadas = {};
    let totalRupturasDetectadas = 0;

    for (let d = 0; d <= 6; d++) {
        const pontosDia = pontos.filter(p => p.diaSemana === d);
        if (pontosDia.length === 0) {
            mediasAjustadas[d] = 0;
            continue;
        }

        const valoresValidos = pontosDia.map(p => p.valor).sort((a, b) => a - b);
        const mediana = valoresValidos[Math.floor(valoresValidos.length / 2)] || 0;

        let soma = 0;
        let contagem = 0;

        pontosDia.forEach(p => {
            if (AppState.usarFiltroRuptura && p.valor === 0 && mediana >= 5 && pontosDia.length >= 3) {
                totalRupturasDetectadas++;
            } else {
                soma += p.valor;
                contagem++;
            }
        });

        mediasAjustadas[d] = contagem > 0 ? (soma / contagem) : (statsOriginais[d]?.media || 0);
    }

    const mediaGeralDiaria = Object.values(mediasAjustadas).reduce((a, b) => a + b, 0) / 7;

    // 2. MÓDULO 1: CURVA ABC DINÂMICA POR PERECIBILIDADE E MARGEM
    const textoProdUpper = (produtoTexto || "").toUpperCase();
    let classeABC = "B";
    let descCurvaABC = "Classe B (Giro Médio / Equilibrado)";
    let fatorCurvaABC = 1.00;

    // Identificação de itens de Alto Giro / Essenciais (Classe A+)
    const isClasseA = textoProdUpper.includes("ALFACE") || textoProdUpper.includes("TOMATE") ||
                      textoProdUpper.includes("BATATA") || textoProdUpper.includes("BANANA") ||
                      textoProdUpper.includes("CEBOLA") || textoProdUpper.includes("CENOURA") ||
                      mediaGeralDiaria >= 20;

    // Identificação de itens especiais/baixo giro/altíssima perecibilidade (Classe C/Risco)
    const isClasseC = textoProdUpper.includes("ALECRIM") || textoProdUpper.includes("TOMILHO") ||
                      textoProdUpper.includes("MANJERICAO") || textoProdUpper.includes("AZEDINHA") ||
                      textoProdUpper.includes("SALSAO") || textoProdUpper.includes("COGUMELO") ||
                      (mediaGeralDiaria < 5 && !isClasseA);

    if (AppState.modoCurvaABC === "A" || (AppState.modoCurvaABC === "auto" && isClasseA)) {
        classeABC = "A+";
        fatorCurvaABC = 1.07; // +7% de estoque de segurança contra ruptura
        descCurvaABC = "Classe A+ (Alto Giro / Zero Ruptura)";
    } else if (AppState.modoCurvaABC === "C" || (AppState.modoCurvaABC === "auto" && isClasseC)) {
        classeABC = "C";
        fatorCurvaABC = 0.88; // -12% Just-in-Time estrito para evitar perda total
        descCurvaABC = "Classe C (Risco / JIT Estrito)";
    } else {
        classeABC = "B";
        fatorCurvaABC = 1.00;
        descCurvaABC = "Classe B (Equilibrado)";
    }

    // 3. MÓDULO 2: SAZONALIDADE FINA POR DIA DA SEMANA (EFEITO FIM DE SEMANA)
    let indicesDias = {};
    for (let d = 0; d <= 6; d++) {
        indicesDias[d] = mediaGeralDiaria > 0 ? (mediasAjustadas[d] / mediaGeralDiaria) : 1.00;
    }

    // Calcula impulso de fim de semana (Sexta + Sábado)
    let impulsoFimDeSemana = 1.00;
    const mediaSexSab = ((mediasAjustadas[5] || 0) + (mediasAjustadas[6] || 0)) / 2;
    if (mediaGeralDiaria > 0) {
        impulsoFimDeSemana = Number((mediaSexSab / mediaGeralDiaria).toFixed(2));
    }

    // 4. FATOR DE TENDÊNCIA RECENTE (MOMENTUM - Últimos 14 a 21 dias)
    let fatorTendencia = 1.00;
    let descTendencia = "Estável (Sem variação)";
    let pctTendencia = 0;

    if (AppState.usarTendencia && pontos.length >= 14) {
        const corteRecente = Math.min(21, Math.floor(pontos.length * 0.35));
        const pontosRecentes = pontos.slice(-corteRecente);
        const pontosAnteriores = pontos.slice(0, pontos.length - corteRecente);

        const mediaRecente = pontosRecentes.reduce((acc, p) => acc + p.valor, 0) / pontosRecentes.length;
        const mediaAnterior = pontosAnteriores.reduce((acc, p) => acc + p.valor, 0) / pontosAnteriores.length;

        if (mediaAnterior > 0.5) {
            const razao = mediaRecente / mediaAnterior;
            if (razao >= 1.05) {
                fatorTendencia = Math.min(1.15, Number((1 + (razao - 1) * 0.55).toFixed(2)));
                pctTendencia = Math.round((razao - 1) * 100);
                descTendencia = `Alta Recente (+${pctTendencia}%)`;
            } else if (razao <= 0.95) {
                fatorTendencia = Math.max(0.88, Number((1 - (1 - razao) * 0.55).toFixed(2)));
                pctTendencia = Math.round((1 - razao) * 100);
                descTendencia = `Queda Recente (-${pctTendencia}%)`;
            } else {
                fatorTendencia = 1.00;
                descTendencia = "Estável (Neutro)";
            }
        }
    }

    // 5. FATOR FASE DO MÊS / QUINTO DIA ÚTIL
    let fatorFaseMes = 1.00;
    let descFaseMes = "Normal / Estável";
    const hoje = new Date();
    const diaMes = hoje.getDate();

    if (AppState.modoFaseMes === "auto") {
        if (diaMes >= 1 && diaMes <= 10) {
            fatorFaseMes = 1.12;
            descFaseMes = "Início/Pagto (+12%)";
        } else if (diaMes >= 11 && diaMes <= 20) {
            fatorFaseMes = 1.00;
            descFaseMes = "Meio de Mês (1.00x)";
        } else {
            fatorFaseMes = 0.94;
            descFaseMes = "Fim de Mês (-6%)";
        }
    } else if (AppState.modoFaseMes === "pagamento") {
        fatorFaseMes = 1.12;
        descFaseMes = "Pagamento Forçado (+12%)";
    } else if (AppState.modoFaseMes === "fim") {
        fatorFaseMes = 0.94;
        descFaseMes = "Fim de Mês Forçado (-6%)";
    } else if (AppState.modoFaseMes === "meio") {
        fatorFaseMes = 1.00;
        descFaseMes = "Meio de Mês (1.00x)";
    }

    // 6. PERFIL DE PERECIBILIDADE & QUEBRA TÉCNICA
    let categoriaProduto = "folhagem";
    let taxaQuebra = 0.08;
    let shelfLifeDias = 2.5;

    if (textoProdUpper.includes("HIDROPONIC")) {
        categoriaProduto = "hidroponico";
        taxaQuebra = 0.06;
        shelfLifeDias = 2.0;
    } else if (textoProdUpper.includes("ACELGA") || textoProdUpper.includes("BROCOLIS") || textoProdUpper.includes("RABANETE") || textoProdUpper.includes("TAIOBA")) {
        categoriaProduto = "legume";
        taxaQuebra = 0.05;
        shelfLifeDias = 4.0;
    } else if (isClasseC) {
        categoriaProduto = "especial";
        taxaQuebra = 0.12;
        shelfLifeDias = 1.8;
    } else {
        categoriaProduto = "folhagem";
        taxaQuebra = 0.09;
        shelfLifeDias = 2.5;
    }

    let fatorQuebra = 1.00;
    let descQuebra = "0%";
    if (AppState.modoQuebraTecnica === "auto") {
        fatorQuebra = 1 + taxaQuebra;
        descQuebra = `+${Math.round(taxaQuebra * 100)}% (${categoriaProduto})`;
    } else if (AppState.modoQuebraTecnica === "5") {
        fatorQuebra = 1.05;
        descQuebra = "+5%";
    } else if (AppState.modoQuebraTecnica === "10") {
        fatorQuebra = 1.10;
        descQuebra = "+10%";
    }

    // 7. MÓDULO 4: FEEDBACK LOOP E AUTO-CORREÇÃO (APRENDIZADO POR EMA)
    let fatorFeedbackLoop = 1.00;
    let descFeedbackLoop = "Sem histórico de ajuste";
    let logFeedbackItem = null;

    if (AppState.usarFeedbackLoop && codigoProduto) {
        const historicoItem = AppState.historicoPredicoes[codigoProduto];
        if (historicoItem && historicoItem.amostras >= 3) {
            const vies = historicoItem.bias || 0; // Se positivo, motor subestimou; se negativo, superestimou
            if (vies > 0.05) {
                fatorFeedbackLoop = Math.min(1.12, Number((1 + vies * 0.45).toFixed(2)));
                descFeedbackLoop = `Ajuste Autônomo (+${Math.round((fatorFeedbackLoop - 1) * 100)}% / Viés de Subestimação)`;
            } else if (vies < -0.05) {
                fatorFeedbackLoop = Math.max(0.90, Number((1 + vies * 0.45).toFixed(2)));
                descFeedbackLoop = `Ajuste Autônomo (${Math.round((fatorFeedbackLoop - 1) * 100)}% / Evitando Sobra)`;
            } else {
                fatorFeedbackLoop = 1.00;
                descFeedbackLoop = "Calibrado (EMA < 5%)";
            }
            logFeedbackItem = {
                sku: codigoProduto,
                amostras: historicoItem.amostras,
                ema: (historicoItem.ema * 100).toFixed(1) + "%",
                fator: fatorFeedbackLoop
            };
        }
    }

    // 7.1. MÓDULO DE APRENDIZADO DE PERFIL POR LOJA (GOVERNADOR VALADARES)
    let perfilLoja = null;
    let fatorPerfilLoja = 1.00;
    let descPerfilLoja = "Padrão neutro (1.00x)";

    if (AppState.usarPerfilLoja && lojaSelecionadaId) {
        const lojaObj = obterLojaConfig(lojaSelecionadaId);
        const idPadrao = lojaObj ? lojaObj.id : lojaSelecionadaId;
        perfilLoja = AppState.perfisLojasAprendizado?.[idPadrao] || PERFIS_PADRAO_LOJAS[idPadrao];
        if (perfilLoja) {
            fatorPerfilLoja = perfilLoja.fatorCalibracao || 1.00;
            const qtdAmostras = perfilLoja.amostras || 0;
            descPerfilLoja = `${perfilLoja.arquetipo} (x${fatorPerfilLoja.toFixed(2)} | ${qtdAmostras > 0 ? qtdAmostras + 'x análises' : 'Calibração Inicial'})`;
        }
    }

    // 8. FATOR CLIMÁTICO COMBINADO
    const clima = AppState.clima;
    const fatorClima = clima.fator || 1.00;

    // 9. MULTIPLICADOR GERAL COMPOSTO
    const margemExtraFator = 1 + (AppState.margemSeguranca / 100);
    const multiplicadorComposto = Number((
        fatorClima * 
        fatorTendencia * 
        fatorFaseMes * 
        fatorQuebra * 
        fatorCurvaABC * 
        fatorFeedbackLoop * 
        fatorPerfilLoja * 
        margemExtraFator
    ).toFixed(3));

    // 10. MÓDULO 3: GESTÃO PREDITIVA DE LOTE E ALERTA DE QUEIMA (PEPS)
    const diasCoberturaNum = mediaGeralDiaria > 0 ? (AppState.estoqueTotal / mediaGeralDiaria) : 0;
    const diasCobertura = diasCoberturaNum.toFixed(1);
    let alertaQueima = null;

    if (AppState.usarAlertaQueima && AppState.estoqueTotal > 0 && mediaGeralDiaria > 0) {
        // Se a cobertura de estoque excede 75% da vida útil do produto, o lote antigo corre sério risco de vencer
        if (diasCoberturaNum >= (shelfLifeDias * 0.75)) {
            const sobraProvavel = Math.max(1, Math.round(AppState.estoqueTotal - (mediaGeralDiaria * 1.0)));
            alertaQueima = {
                produto: produtoTexto,
                estoque: AppState.estoqueTotal,
                diasCobertura: diasCobertura,
                shelfLife: shelfLifeDias,
                sobraProvavel,
                sugestaoDesconto: diasCoberturaNum >= shelfLifeDias ? "30% a 40%" : "20% a 25%"
            };
        }
    }

    // 11. OPORTUNIDADE DE REMANEJAMENTO ENTRE LOJAS
    let remanejamentoSugerido = null;
    if (AppState.estoquesOutrasLojas && Object.keys(AppState.estoquesOutrasLojas).length > 0) {
        for (const lj of LOJAS_CONFIG) {
            if (lj.id !== lojaSelecionadaId) {
                const estOutra = AppState.estoquesOutrasLojas[lj.id];
                if (estOutra && estOutra >= 35 && estOutra > (AppState.estoqueTotal + 15)) {
                    remanejamentoSugerido = {
                        lojaOrigem: `${lj.id} - ${lj.nome}`,
                        estoqueOrigem: estOutra,
                        qtdSugerida: Math.round(estOutra * 0.4)
                    };
                    break;
                }
            }
        }
    }

    // 12. SCORE DE CONFIANÇA / ACURÁCIA (0 a 100%)
    let score = 50;
    if (pontos.length >= 45) score += 20;
    else if (pontos.length >= 25) score += 12;
    else score += 5;

    if (dadosGrafico.totalOcorrencias >= 20) score += 10;
    if (AppState.estoqueTotal > 0 || (AppState.estoquesOutrasLojas && Object.keys(AppState.estoquesOutrasLojas).length > 0)) score += 10;
    if (AppState.usarFeedbackLoop && logFeedbackItem) score += 8; // Bônus por ter feedback loop ativo
    score = Math.min(98, score);

    const classeScore = score >= 85 ? "score-badge" : "score-badge atencao";
    const textoScore = score >= 85 ? `🎯 Confiança: ${score}% (Alta Precisão)` : `⚠️ Confiança: ${score}% (Moderada)`;

    return {
        mediasAjustadas,
        mediaGeralDiaria,
        indicesDias,
        impulsoFimDeSemana,
        classeABC,
        descCurvaABC,
        fatorCurvaABC,
        fatorClima,
        fatorTendencia,
        descTendencia,
        fatorFaseMes,
        descFaseMes,
        fatorQuebra,
        descQuebra,
        categoriaProduto,
        shelfLifeDias,
        fatorFeedbackLoop,
        descFeedbackLoop,
        logFeedbackItem,
        perfilLoja,
        fatorPerfilLoja,
        descPerfilLoja,
        alertaQueima,
        multiplicadorComposto,
        diasCobertura,
        remanejamentoSugerido,
        totalRupturasDetectadas,
        score,
        classeScore,
        textoScore
    };
}

// ============================================================================
// Fluxos de Execução e Automação Dext com Auditoria de Sincronismo
// ============================================================================

// Função injetada na aba do Dext para inspecionar Loja, Código, Descrição e estado da página
function capturarEstadoDextNaPagina() {
    let codLoja = null;
    let nomeLoja = null;
    let codProduto = null;
    let descProduto = null;

    // 1. Loja ativa no Dext
    const elLoja = document.getElementById("idcod_local_abastecimento") ||
                   document.getElementById("idempresa") ||
                   document.getElementById("idcod_empresa") ||
                   document.getElementById("idlocal") ||
                   document.querySelector('select[name="idcod_local_abastecimento"]') ||
                   document.querySelector('select[name*="empresa"]');
    if (elLoja) {
        codLoja = elLoja.value ? elLoja.value.trim() : null;
        if (elLoja.options && elLoja.selectedIndex >= 0) {
            nomeLoja = elLoja.options[elLoja.selectedIndex]?.text?.trim() || null;
        }
    }

    // 2. Descrição e Código do Produto REALMENTE carregado no Dext (#iddescricaoproduto)
    // No Dext, o produto ativo na tela é exibido no cabeçalho #iddescricaoproduto
    // Exemplo real: "02 TRE\n9760 - AGRIAO HIDROPONICO S VDE UN" ou "9812 - ALFACE HIDROPONICA S VDE UN"
    const elDesc = document.getElementById("iddescricaoproduto");
    if (elDesc && elDesc.innerText) {
        const rawTxt = elDesc.innerText.trim();
        if (rawTxt && !rawTxt.toLowerCase().includes("informações do produto") && !rawTxt.toLowerCase().includes("informacoes do produto")) {
            const mCodDesc = rawTxt.match(/\b(\d{3,6})\s*[-–]\s*([^\n\r]+)/i);
            if (mCodDesc) {
                codProduto = mCodDesc[1].trim();
                descProduto = mCodDesc[2].trim();
            } else {
                const mCod = rawTxt.match(/\b(\d{3,6})\b/);
                if (mCod) codProduto = mCod[1].trim();
                descProduto = rawTxt;
            }
        }
    }

    // Fallback de código apenas se o cabeçalho não tiver sido preenchido
    if (!codProduto) {
        const elCodProd = document.getElementById("idcod_produto");
        if (elCodProd && elCodProd.value && elCodProd.value.trim()) {
            codProduto = elCodProd.value.trim();
        }
    }

    // Fallback para descrição
    if (!descProduto) {
        const elNomProd = document.getElementById("idnom_produto") || document.getElementById("iddesc_produto");
        if (elNomProd) {
            descProduto = (elNomProd.value || elNomProd.innerText || "").trim();
        }
    }

    // 3. Status de Carregamento (Detecção Robusta contra overlays e position: fixed)
    let carregando = false;
    const telaLoad = document.getElementById("tela_carregamento");
    if (telaLoad) {
        const style = window.getComputedStyle(telaLoad);
        if (style.display !== "none" && style.visibility !== "hidden" && parseFloat(style.opacity || "1") > 0.05) {
            carregando = true;
        }
    }
    if (!carregando) {
        const elLoaders = document.querySelectorAll('.loading, .carregando, .spinner, .blockUI, [id*="carregamento"]');
        for (const el of elLoaders) {
            const s = window.getComputedStyle(el);
            if (s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity || "1") > 0.05 && el.getBoundingClientRect().height > 0) {
                carregando = true;
                break;
            }
        }
    }
    if (!carregando) {
        const todosEl = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6, strong, b'));
        for (const el of todosEl) {
            if (el.children.length <= 2 && /carregando\.\.\./i.test(el.textContent || "")) {
                const s = window.getComputedStyle(el);
                if (s.display !== "none" && s.visibility !== "hidden" && parseFloat(s.opacity || "1") > 0.05 && el.getBoundingClientRect().height > 0) {
                    carregando = true;
                    break;
                }
            }
        }
    }

    // 4. Gráfico de Vendas
    const canvas = document.getElementById("canvasvendaprojecao") || document.querySelector("canvas");
    let graficoPronto = false;
    let pontosGrafico = 0;
    if (window.Chart) {
        let chartInstance = null;
        if (typeof Chart.getChart === 'function' && canvas) {
            chartInstance = Chart.getChart(canvas);
        }
        if (!chartInstance && Chart.instances) {
            let instances = Chart.instances instanceof Map ? Array.from(Chart.instances.values()) : Object.values(Chart.instances);
            chartInstance = instances[0];
        }
        if (chartInstance && chartInstance.data && chartInstance.data.labels) {
            pontosGrafico = chartInstance.data.labels.length;
            graficoPronto = pontosGrafico > 0;
        }
    }

    return {
        codLoja,
        nomeLoja,
        codProduto,
        descProduto,
        carregando,
        graficoPronto,
        pontosGrafico
    };
}

// Avalia matematicamente e textual se o Dext está sincronizado com a seleção do usuário
function avaliarSincronismoComDext(estadoDext, lojaEsperadaId, codigoEsperado, produtoTextoEsperado) {
    if (!estadoDext) {
        return {
            sincronizado: false,
            motivoDivergencia: "Não foi possível ler as informações da página do Dext.",
            lojaOk: false,
            codigoOk: false,
            descricaoOk: false,
            lojaEsperada: lojaEsperadaId,
            lojaDext: "Não detectada",
            codigoEsperado,
            codigoDext: "Não detectado",
            descricaoEsperada: produtoTextoEsperado,
            descricaoDext: "Não detectada"
        };
    }

    const lojaEsperadaObj = obterLojaConfig(lojaEsperadaId);
    const lojaEsperadaCod = lojaEsperadaObj ? lojaEsperadaObj.cod : lojaEsperadaId;
    const lojaEsperadaNome = lojaEsperadaObj ? `${lojaEsperadaObj.id} - ${lojaEsperadaObj.nome}` : lojaEsperadaId;

    // 1. Identificar loja do Dext
    let lojaDextIdentificada = null;
    if (estadoDext.codLoja) {
        const ljPorCod = LOJAS_CONFIG.find(l => l.cod === estadoDext.codLoja || l.id.startsWith(`0${estadoDext.codLoja}`) || l.id === estadoDext.codLoja);
        if (ljPorCod) lojaDextIdentificada = ljPorCod;
    }
    if (!lojaDextIdentificada && estadoDext.nomeLoja) {
        lojaDextIdentificada = obterLojaConfig(estadoDext.nomeLoja);
    }

    const lojaOk = !!(
        (lojaDextIdentificada && lojaEsperadaObj && lojaDextIdentificada.id === lojaEsperadaObj.id) ||
        (estadoDext.codLoja && (estadoDext.codLoja === lojaEsperadaCod || `0${estadoDext.codLoja}` === lojaEsperadaCod))
    );

    const lojaDextExibicao = lojaDextIdentificada 
        ? `${lojaDextIdentificada.id} - ${lojaDextIdentificada.nome}`
        : (estadoDext.nomeLoja || (estadoDext.codLoja ? `Loja ${estadoDext.codLoja}` : "Não detectada"));

    // 2. Verificar código do produto (Rigoroso, sem falsos positivos)
    const codLimpoEsperado = String(codigoEsperado || "").trim();
    const codLimpoDext = String(estadoDext.codProduto || "").trim();
    
    let codigoOk = false;
    if (codLimpoDext && codLimpoEsperado) {
        codigoOk = (codLimpoDext === codLimpoEsperado);
    } else if (estadoDext.descProduto && codLimpoEsperado) {
        const matchOutroCod = estadoDext.descProduto.match(/\b(\d{3,6})\b/);
        if (matchOutroCod) {
            codigoOk = (matchOutroCod[1] === codLimpoEsperado);
        } else {
            codigoOk = estadoDext.descProduto.includes(codLimpoEsperado);
        }
    }

    // 3. Verificar descrição do produto
    function normalizarTexto(txt) {
        return (txt || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, " ").trim();
    }

    const descDextNorm = normalizarTexto(estadoDext.descProduto || "");
    const descEspNorm = normalizarTexto(produtoTextoEsperado || "");
    
    let descricaoOk = false;
    if (estadoDext.descProduto && produtoTextoEsperado) {
        const descEspSemCod = descEspNorm.replace(new RegExp(`^${codLimpoEsperado}\\s*`), '').trim();
        const descDextSemCod = descDextNorm.replace(new RegExp(`^${codLimpoDext}\\s*`), '').trim();

        // Palavras genéricas desconsideradas
        const stopWords = ['hidroponico', 'hidroponica', 'verde', 'vde', 'un', 'und', 'maco', 'band', 'bdj', 'pct', 'pacote', 'cx', 'caixa', 'kg', 'organico', 'organica', 'comum', 'extra', 'selecionado', 'primeira', 'tipo', 'tradicional', 'especial', 'qualidade'];

        // Palavras substantivas do produto esperado (ex: ["alface"], ["agriao"], etc.)
        const palavrasChaveEsp = descEspSemCod.split(/\s+/).filter(p => p.length >= 3 && !stopWords.includes(p));

        const temTodasPalavrasChave = palavrasChaveEsp.length > 0 && palavrasChaveEsp.every(p => descDextNorm.includes(p));
        const matchFraseDireta = (descEspSemCod.length >= 3 && descDextNorm.includes(descEspSemCod)) ||
                                 (descDextSemCod.length >= 3 && descEspNorm.includes(descDextSemCod));

        // Rejeição direta se o Dext possui um vegetal diferente (ex: Agrião vs Alface)
        const listaVegetais = ['alface', 'agriao', 'rucula', 'couve', 'espinafre', 'brocolis', 'repolho', 'acelga', 'chicoria', 'mostarda', 'coentro', 'salsa', 'cebolinha'];
        let ehVegetalDiferente = false;
        for (const veg of listaVegetais) {
            if (palavrasChaveEsp.includes(veg) && !descDextNorm.includes(veg)) {
                ehVegetalDiferente = true;
                break;
            }
            if (!palavrasChaveEsp.includes(veg) && !descEspNorm.includes(veg) && descDextNorm.includes(veg)) {
                ehVegetalDiferente = true;
                break;
            }
        }

        if (ehVegetalDiferente) {
            descricaoOk = false;
        } else {
            descricaoOk = (temTodasPalavrasChave || matchFraseDireta);
        }
    }

    let motivos = [];
    if (!lojaOk) motivos.push(`Loja no Dext (${lojaDextExibicao}) difere da selecionada (${lojaEsperadaNome})`);
    if (!codigoOk) motivos.push(`Código no Dext (${codLimpoDext || 'Pendente'}) difere do selecionado (${codLimpoEsperado})`);
    if (!descricaoOk) motivos.push(`Descrição no Dext (${estadoDext.descProduto || 'vazia'}) não confere com "${produtoTextoEsperado}"`);
    if (estadoDext.carregando) motivos.push(`Dext ainda está processando/carregando os dados na tela`);
    if (!estadoDext.graficoPronto) motivos.push(`Gráfico de vendas do Dext ainda não foi renderizado`);

    const sincronizado = lojaOk && codigoOk && descricaoOk && !estadoDext.carregando && estadoDext.graficoPronto;

    return {
        sincronizado,
        lojaOk,
        codigoOk,
        descricaoOk,
        lojaEsperada: lojaEsperadaNome,
        lojaDext: lojaDextExibicao,
        codigoEsperado: codLimpoEsperado,
        codigoDext: codLimpoDext || (codigoOk ? codLimpoEsperado : "Pendente"),
        descricaoEsperada: produtoTextoEsperado,
        descricaoDext: estadoDext.descProduto || (descricaoOk ? produtoTextoEsperado : "Carregando..."),
        motivoDivergencia: motivos.join(". ")
    };
}

async function executarAutomacaoDext() {
    const lojaSelecionada = document.getElementById("selectLoja").value;
    const dataInicio = document.getElementById("inputDataInicio").value;

    // Regra de Negócio: Data Final SEMPRE tem que ser o Dia atual
    const inputFinal = document.getElementById("inputDataFinal");
    const hojeIso = formatarDataIso(new Date());
    if (inputFinal) {
        inputFinal.value = hojeIso;
        inputFinal.max = hojeIso;
    }
    const dataFinal = inputFinal?.value || hojeIso;

    const selectProduto = document.getElementById("selectProduto");
    const codigoProduto = selectProduto.value;
    const produtoTexto = selectProduto.options[selectProduto.selectedIndex]?.text || "";

    if (!codigoProduto) {
        exibirAlerta("Atenção", "Selecione um produto na lista antes de sincronizar.");
        return;
    }

    salvarEstadoFormulario();

    try {
        const tab = await obterAbaAtiva();
        const lojaObj = obterLojaConfig(lojaSelecionada);
        const lojaExibicao = lojaObj ? `${lojaObj.id} - ${lojaObj.nome}` : lojaSelecionada;

        exibirStatus(`Sincronizando no Dext:<br><b>${produtoTexto}</b><br><small style="color:var(--muted);">${lojaExibicao}</small>...`);

        // Dispara o preenchimento e seleção segura no Dext
        const resAutomacao = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: 'MAIN',
            func: preencherFiltrosDextCompleto,
            args: [lojaSelecionada, codigoProduto, dataInicio, dataFinal]
        });

        const statusAuto = resAutomacao?.[0]?.result;
        console.log("[Motor FLV] Retorno preencherFiltrosDextCompleto:", statusAuto);

        exibirStatus(`Validando sincronismo com o Dext (Loja, Código e Descrição)...`);
        let sincronismoValido = null;
        let pronto = false;

        // Loop ativo de validação: aguarda a página confirmar Loja, Código, Descrição e fim do carregamento
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 600));

            const resEstado = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',
                func: capturarEstadoDextNaPagina
            });

            const estadoAtual = resEstado?.[0]?.result;
            if (estadoAtual) {
                sincronismoValido = avaliarSincronismoComDext(estadoAtual, lojaSelecionada, codigoProduto, produtoTexto);
                
                if (estadoAtual.carregando) {
                    exibirStatus(`Dext processando consulta de <b>${produtoTexto}</b>...<br><small style="color:var(--muted);">Aguardando finalização do carregamento...</small>`);
                    continue;
                }

                if (sincronismoValido.sincronizado) {
                    pronto = true;
                    break;
                }

                // Reforço se o Dext ainda não chaveou o código
                if (!sincronismoValido.codigoOk && (i === 3 || i === 7 || i === 12)) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        world: 'MAIN',
                        func: (cod) => {
                            const botoes = Array.from(document.querySelectorAll('button, input[type="button"], a'));
                            const btn = botoes.find(b => /c[oó]d\.?\s*prod/i.test((b.innerText || b.value || '').trim()));
                            
                            const inps = [];
                            if (btn && btn.parentElement) {
                                inps.push(...btn.parentElement.querySelectorAll('input[type="text"], input:not([type="hidden"])'));
                            }
                            const inpGeral = document.querySelector('input[placeholder*="Pesquisa" i], input[placeholder*="Produto" i]');
                            if (inpGeral && !inps.includes(inpGeral)) inps.push(inpGeral);
                            
                            inps.forEach(inp => {
                                inp.focus();
                                inp.value = cod;
                                inp.dispatchEvent(new Event('input', { bubbles: true }));
                                inp.dispatchEvent(new Event('change', { bubbles: true }));
                            });

                            if (btn) btn.click();
                            if (typeof window.jaxon_fn_buscaprodutolist === 'function') {
                                try { window.jaxon_fn_buscaprodutolist(cod, 'idcod_produto', 'COD'); } catch (e) {}
                            }

                            const trs = Array.from(document.querySelectorAll('tr[ondblclick], .modal tr, .ui-dialog tr, table tr, tbody tr'));
                            const tr = trs.find(t => t.innerText && t.innerText.includes(cod) && !t.closest('thead'));
                            if (tr) {
                                if (typeof tr.ondblclick === 'function') {
                                    try { tr.ondblclick(); } catch (e) {}
                                }
                                const ondbl = tr.getAttribute('ondblclick') || '';
                                const m = ondbl.match(/(?:jaxon_fn_setbuscaproduto|setbuscaproduto)\s*\(\s*['"]?([a-zA-Z0-9_-]+)['"]?(?:\s*,\s*['"]([^'"]+)['"])?/);
                                if (m && typeof window.jaxon_fn_setbuscaproduto === 'function') {
                                    window.jaxon_fn_setbuscaproduto(m[1], m[2] || 'idcod_produto');
                                } else {
                                    tr.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                                    tr.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                                }
                                const btnLinha = tr.querySelector('button, a, input[type="button"]');
                                if (btnLinha) btnLinha.click();

                                setTimeout(() => {
                                    const btnFiltro = document.getElementById("idbuttonpesquisadata");
                                    if (btnFiltro) btnFiltro.click();
                                }, 300);
                            }
                        },
                        args: [codigoProduto]
                    });
                }
            }
        }

        AppState.sincronismoInfo = {
            status: pronto ? "sucesso" : "erro",
            timestamp: (new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            ...(sincronismoValido || {})
        };

        if (pronto) {
            await recalcularTelaAtual();
            exibirToast("Sincronizado e auditado com o Dext com sucesso!");
        } else {
            renderizarPainelResultados();
            exibirAlerta("Divergência de Sincronismo", `
                Não foi possível sincronizar o produto <b>${produtoTexto}</b> no Dext.<br><br>
                <b>Detalhes da auditoria:</b><br>
                ${sincronismoValido?.motivoDivergencia || "O Dext permaneceu em outro produto ou está ocupado."}<br><br>
                O cálculo de pedidos foi pausado para evitar recomendações incorretas.
            `, "erro");
        }
    } catch (err) {
        console.error("Erro na automação:", err);
        exibirAlerta("Erro de Comunicação", err.message || "Não foi possível comunicar com o Dext.", "erro");
    }
}

async function recalcularTelaAtual() {
    salvarEstadoFormulario();
    exibirStatus(`Auditando tela atual do Dext...`);

    try {
        const tab = await obterAbaAtiva();
        const lojaSelecionada = document.getElementById("selectLoja").value;
        const selectProduto = document.getElementById("selectProduto");
        let codigoProduto = selectProduto?.value || "";
        const produtoTexto = selectProduto?.options[selectProduto?.selectedIndex]?.text || "";

        // Auditoria ativa do que está atualmente na tela do Dext
        let sincronismoValido = null;
        try {
            const resEstado = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',
                func: capturarEstadoDextNaPagina
            });
            const estadoAtual = resEstado?.[0]?.result;
            if (estadoAtual) {
                sincronismoValido = avaliarSincronismoComDext(estadoAtual, lojaSelecionada, codigoProduto, produtoTexto);
                AppState.sincronismoInfo = {
                    status: sincronismoValido.sincronizado ? "sucesso" : (sincronismoValido.lojaOk && sincronismoValido.codigoOk ? "alerta" : "erro"),
                    timestamp: (new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    ...sincronismoValido
                };
            }
        } catch (e) {
            console.warn("Erro ao auditar sincronismo na tela atual:", e);
        }

        // Se houver divergência crítica entre o produto selecionado na extensão e a tela do Dext,
        // bloqueia o cálculo para não gerar recomendação do produto errado!
        if (codigoProduto && sincronismoValido && (!sincronismoValido.codigoOk || !sincronismoValido.lojaOk)) {
            renderizarPainelResultados();
            exibirAlerta("Atenção: Produto Divergente no Dext", `
                O Dext está exibindo: <b>${sincronismoValido.codigoDext} - ${sincronismoValido.descricaoDext}</b><br>
                Mas você selecionou na extensão: <b>${codigoProduto} - ${produtoTexto}</b><br><br>
                O cálculo foi bloqueado para evitar gerar pedidos com dados de outro produto.<br>
                Clique no botão <b>"Aplicar & Sincronizar no Dext"</b> para carregar o produto correto.
            `, "alerta");
            return;
        }

        const resultadoGrafico = await executarExtracaoNaPagina(tab.id);
        if (!resultadoGrafico || !resultadoGrafico.sucesso) {
            exibirAlerta("Gráfico Não Detectado", `
                ${resultadoGrafico?.motivo || "Não foi possível ler o gráfico de vendas."}<br><br>
                <b>Dica:</b> Certifique-se de que o relatório de vendas está gerado e visível na aba de <b>Consulta Produto</b> no Dext.
            `, "erro");
            return;
        }

        if (resultadoGrafico.totalOcorrencias === 0) {
            exibirAlerta("Sem Vendas", "O gráfico foi detectado, mas não há vendas registradas no período selecionado.");
            return;
        }

        AppState.dadosGrafico = resultadoGrafico;

        if (selectProduto && !selectProduto.value && resultadoGrafico.produtoDetectado) {
            selectProduto.value = resultadoGrafico.produtoDetectado;
        }

        if (!codigoProduto) {
            codigoProduto = selectProduto?.value || resultadoGrafico?.produtoDetectado || "";
        }

        let estoque = 0;
        let estoquesPorLoja = {};
        try {
            const resEstoque = await chrome.scripting.executeScript({
                target: { tabId: tab.id, allFrames: true },
                world: 'MAIN',
                func: capturarEstoqueAtualDext,
                args: [lojaSelecionada]
            });

            if (Array.isArray(resEstoque)) {
                // Prioriza resultado que encontrou o container oficial de estoques (#idlistaestlj)
                const item = resEstoque.find(r => r.result && r.result.temContainerOficial) ||
                             resEstoque.find(r => r.result && r.result.estoquesPorLoja && Object.keys(r.result.estoquesPorLoja).length > 0) ||
                             resEstoque.find(r => r.result && typeof r.result.estoque === 'number');
                if (item && item.result) {
                    estoque = item.result.estoque;
                    estoquesPorLoja = item.result.estoquesPorLoja || {};
                    if (item.result.produtoDescricao && selectProduto && !selectProduto.value) {
                        const opt = Array.from(selectProduto.options).find(o => item.result.produtoDescricao.includes(o.value));
                        if (opt) selectProduto.value = opt.value;
                    }
                } else {
                    const fallbackNum = resEstoque.find(r => typeof r.result === 'number');
                    if (fallbackNum) estoque = fallbackNum.result;
                }
            }
        } catch (e) {
            console.warn("Falha ao capturar estoque:", e);
        }

        AppState.estoqueTotal = estoque;
        AppState.estoquesOutrasLojas = estoquesPorLoja;
        if (estoque > 0 && (AppState.estoquesOutrasLojas[lojaSelecionada] === undefined || AppState.estoquesOutrasLojas[lojaSelecionada] === null)) {
            AppState.estoquesOutrasLojas[lojaSelecionada] = estoque;
        }

        // INTEGRAÇÃO: Completa o estoque de todas as lojas Big Mais a partir do Banco de Dados
        if (AppState.bancoEstoque.ativo) {
            const prodBanco = obterProdutoNoBanco(codigoProduto, produtoTexto || resultadoGrafico?.produtoDetectado);
            if (prodBanco && prodBanco.lojas) {
                LOJAS_CONFIG.forEach(lj => {
                    const estBanco = obterEstoqueLojaNoBanco(prodBanco.lojas, lj);
                    if (estBanco !== undefined) {
                        // Se a loja não tem estoque lido da tela do Dext, preenche com o estoque do banco
                        if (AppState.estoquesOutrasLojas[lj.id] === undefined || AppState.estoquesOutrasLojas[lj.id] === null) {
                            AppState.estoquesOutrasLojas[lj.id] = estBanco;
                        }
                    }
                });
                // Se a loja selecionada também não tinha estoque detectado no Dext, usa o do banco:
                if (AppState.estoqueTotal === 0 && AppState.estoquesOutrasLojas[lojaSelecionada] !== undefined) {
                    AppState.estoqueTotal = AppState.estoquesOutrasLojas[lojaSelecionada];
                }
            }
        }

        await atualizarClima();

        // Atualiza modelo de aprendizado de perfil por loja com IA adaptativa
        const prodTextoAtual = selectProduto?.options[selectProduto?.selectedIndex]?.text || "";
        const analiseParaAprendizado = analisarDemandaAvancada(resultadoGrafico, prodTextoAtual, lojaSelecionada, codigoProduto);
        atualizarPerfilLojaAprendizado(lojaSelecionada, resultadoGrafico, analiseParaAprendizado);

        // Atualiza feedback loop se houver histórico de predição anterior para auditoria
        atualizarFeedbackLoopAutomatico(codigoProduto, resultadoGrafico);

        renderizarPainelResultados();
    } catch (err) {
        console.error("Erro ao recalcular:", err);
        exibirAlerta("Falha ao Processar", err.message || "Erro inesperado ao ler a página.", "erro");
    }
}

// Atualiza o Modelo de Aprendizado de Perfil por Loja (IA Adaptativa por Filial)
function atualizarPerfilLojaAprendizado(lojaId, dadosGrafico, analise) {
    if (!AppState.usarPerfilLoja || !lojaId || !dadosGrafico || !analise) return;
    try {
        const lojaObj = obterLojaConfig(lojaId);
        const idPadrao = lojaObj ? lojaObj.id : lojaId;

        if (!AppState.perfisLojasAprendizado) {
            AppState.perfisLojasAprendizado = JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS));
        }

        if (!AppState.perfisLojasAprendizado[idPadrao]) {
            AppState.perfisLojasAprendizado[idPadrao] = JSON.parse(JSON.stringify(
                PERFIS_PADRAO_LOJAS[idPadrao] || {
                    id: idPadrao,
                    nome: lojaObj ? lojaObj.nome : idPadrao,
                    arquetipo: "Bairro Residencial",
                    desc: "Perfil em calibração",
                    fatorCalibracao: 1.00,
                    pesosDias: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
                    impulsoFDS: 1.00,
                    impulsoQuarta: 1.00,
                    amostras: 0,
                    ultimaAtualizacao: "-"
                }
            ));
        }

        const perfil = AppState.perfisLojasAprendizado[idPadrao];
        const medias = analise.mediasAjustadas;
        const mediaGeral = analise.mediaGeralDiaria || 1;

        if (mediaGeral > 0) {
            const alfa = 0.18; // Fator de amortecimento e suavização exponencial (EMA)

            if (!Array.isArray(perfil.pesosDias) || perfil.pesosDias.length !== 7) {
                perfil.pesosDias = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0];
            }

            // Atualiza a distribuição normalizada dos 7 dias da semana
            for (let d = 0; d <= 6; d++) {
                const pesoObs = (medias[d] || 0) / mediaGeral;
                const pesoAntigo = perfil.pesosDias[d] || 1.0;
                perfil.pesosDias[d] = Number(((pesoAntigo * (1 - alfa)) + (pesoObs * alfa)).toFixed(2));
            }

            // Atualiza impulsos empíricos
            const mediaSexSab = ((medias[5] || 0) + (medias[6] || 0)) / 2;
            const impulsoFDSObs = Number((mediaSexSab / mediaGeral).toFixed(2));
            perfil.impulsoFDS = Number((((perfil.impulsoFDS || 1.0) * (1 - alfa)) + (impulsoFDSObs * alfa)).toFixed(2));

            const impulsoQuaObs = Number(((medias[3] || 0) / mediaGeral).toFixed(2));
            perfil.impulsoQuarta = Number((((perfil.impulsoQuarta || 1.0) * (1 - alfa)) + (impulsoQuaObs * alfa)).toFixed(2));

            // Ajuste fino do viés/calibração da loja
            if (analise.fatorTendencia && analise.fatorTendencia !== 1.0) {
                const ajusteBias = (analise.fatorTendencia - 1.0) * 0.12;
                perfil.fatorCalibracao = Math.min(1.20, Math.max(0.85, Number(((perfil.fatorCalibracao || 1.0) + ajusteBias).toFixed(2))));
            }

            // Reclassifica o arquétipo da loja com base nas evidências empíricas aprendidas
            if (perfil.impulsoQuarta >= 1.20) {
                perfil.arquetipo = "Centro & Quarta de Ofertas";
                perfil.desc = "Pico acentuado de compras na Quarta de Hortifrúti";
            } else if (perfil.impulsoFDS >= 1.16) {
                perfil.arquetipo = "Pico Fim de Semana (Sex+Sáb)";
                perfil.desc = "Forte concentração no abastecimento de fim de semana";
            } else if (perfil.pesosDias[1] >= 1.10 && perfil.pesosDias[2] >= 1.05) {
                perfil.arquetipo = "Fluxo Diário / Comercial";
                perfil.desc = "Consumo linear ao longo dos dias úteis";
            } else if (idPadrao.includes("LAG")) {
                perfil.arquetipo = "Bairro Nobre & Especiais";
                perfil.desc = "Alta demanda de hidropônicos, folhas nobres e giro contínuo";
            } else if (idPadrao.includes("ISA")) {
                perfil.arquetipo = "Giro Rápido & Preço";
                perfil.desc = "Compras fracionadas com alta sensibilidade a ofertas";
            } else {
                perfil.arquetipo = "Bairro Tradicional & Família";
                perfil.desc = "Padrão de reposição equilibrado";
            }

            perfil.amostras = (perfil.amostras || 0) + 1;
            perfil.ultimaAtualizacao = new Date().toLocaleDateString('pt-BR');

            salvarEstadoFormulario();
        }
    } catch (e) {
        console.warn("Falha ao atualizar perfil da loja:", e);
    }
}

// Atualiza o Feedback Loop de Aprendizado Autônomo com EMA
function atualizarFeedbackLoopAutomatico(codigoProduto, resultadoGrafico) {
    if (!codigoProduto || !resultadoGrafico || !resultadoGrafico.todosPontos) return;
    try {
        const pontos = resultadoGrafico.todosPontos;
        if (pontos.length < 7) return;

        // Venda média real recente dos últimos 7 dias
        const ultimos7 = pontos.slice(-7);
        const vendaRealMedia7 = ultimos7.reduce((a, b) => a + b.valor, 0) / ultimos7.length;

        if (!AppState.historicoPredicoes[codigoProduto]) {
            AppState.historicoPredicoes[codigoProduto] = {
                amostras: 1,
                ultimaVendaMedia: vendaRealMedia7,
                ema: 0.05,
                bias: 0.0,
                atualizadoEm: new Date().toLocaleDateString('pt-BR')
            };
        } else {
            const hist = AppState.historicoPredicoes[codigoProduto];
            const desvio = vendaRealMedia7 > 0 ? (vendaRealMedia7 - hist.ultimaVendaMedia) / hist.ultimaVendaMedia : 0;
            hist.amostras = (hist.amostras || 1) + 1;
            // Suavização exponencial do erro (alfa = 0.3)
            hist.ema = Number(((hist.ema * 0.7) + (Math.abs(desvio) * 0.3)).toFixed(3));
            hist.bias = Number(((hist.bias * 0.7) + (desvio * 0.3)).toFixed(3));
            hist.ultimaVendaMedia = vendaRealMedia7;
            hist.atualizadoEm = new Date().toLocaleDateString('pt-BR');
        }
        salvarEstadoFormulario();
    } catch (e) {
        console.warn("Falha ao atualizar feedback loop:", e);
    }
}

// Atualiza clima via Open-Meteo com temperatura e precipitação de chuva para Governador Valadares
async function atualizarClima() {
    try {
        const resp = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-18.8511&longitude=-41.9597&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=auto");
        if (resp.ok) {
            const dados = await resp.json();
            const temp = Number(dados?.daily?.temperature_2m_max?.[0]) || 28;
            const chuvaMm = Number(dados?.daily?.precipitation_sum?.[0]) || 0;
            const probChuva = Number(dados?.daily?.precipitation_probability_max?.[0]) || 0;

            let fatorTemp = 1.00;
            let descTemp = "Normal";
            if (temp >= 35) { fatorTemp = 1.08; descTemp = "Calor extremo"; }
            else if (temp >= 32) { fatorTemp = 1.05; descTemp = "Muito quente"; }
            else if (temp >= 28) { fatorTemp = 1.02; descTemp = "Quente"; }

            let fatorChuva = 1.00;
            let descChuva = "Sem chuva";
            if (chuvaMm >= 15 || probChuva >= 75) {
                fatorChuva = 0.92;
                descChuva = `Chuva intensa (${chuvaMm.toFixed(0)}mm)`;
            } else if (chuvaMm >= 4 || probChuva >= 45) {
                fatorChuva = 0.96;
                descChuva = `Chuva leve (${chuvaMm.toFixed(0)}mm)`;
            }

            const fatorFinal = Number((fatorTemp * fatorChuva).toFixed(2));
            AppState.clima = {
                temperatura: temp,
                fator: fatorFinal,
                fatorTemp,
                fatorChuva,
                chuvaMm,
                probChuva,
                classificacao: `${descTemp} | ${descChuva}`
            };
        }
    } catch (e) {
        console.warn("Clima indisponível, usando padrão:", e);
    }
}

async function executarExtracaoNaPagina(tabId) {
    try {
        const resMain = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: 'MAIN',
            func: extrairDadosGraficoDext
        });
        if (resMain && resMain[0]?.result?.sucesso) return resMain[0].result;
    } catch (e) { }

    try {
        const resFrames = await chrome.scripting.executeScript({
            target: { tabId: tabId, allFrames: true },
            world: 'MAIN',
            func: extrairDadosGraficoDext
        });
        if (Array.isArray(resFrames)) {
            const item = resFrames.find(r => r.result && r.result.sucesso && r.result.totalOcorrencias > 0);
            if (item) return item.result;
            const comResultado = resFrames.find(r => r.result);
            if (comResultado) return comResultado.result;
        }
    } catch (e) { }

    return null;
}

// ============================================================================
// MÓDULO DE BACKUP, SALVAMENTO E ALIMENTAÇÃO DO APRENDIZADO DA IA
// ============================================================================

function gerarObjetoBackupAprendizado() {
    const perfis = AppState.perfisLojasAprendizado || PERFIS_PADRAO_LOJAS;
    const historico = AppState.historicoPredicoes || {};
    
    let totalAmostras = 0;
    Object.values(perfis).forEach(p => { totalAmostras += (p.amostras || 0); });

    return {
        versao: "2.1.0",
        sistema: "Motor de Pedidos FLV Big Mais",
        exportadoEm: new Date().toISOString(),
        dataLegivel: new Date().toLocaleString("pt-BR"),
        estatisticas: {
            totalLojas: Object.keys(perfis).length,
            totalAmostrasLojas: totalAmostras,
            totalSkusComFeedback: Object.keys(historico).length
        },
        perfisLojasAprendizado: JSON.parse(JSON.stringify(perfis)),
        historicoPredicoes: JSON.parse(JSON.stringify(historico)),
        configuracoesMotor: {
            modeloCiclos: AppState.modeloCiclos,
            usarPerfilLoja: AppState.usarPerfilLoja,
            modoCurvaABC: AppState.modoCurvaABC,
            usarSazonalidadeFina: AppState.usarSazonalidadeFina,
            usarAlertaQueima: AppState.usarAlertaQueima,
            usarFeedbackLoop: AppState.usarFeedbackLoop,
            usarTendencia: AppState.usarTendencia,
            modoFaseMes: AppState.modoFaseMes,
            modoQuebraTecnica: AppState.modoQuebraTecnica,
            usarFiltroRuptura: AppState.usarFiltroRuptura,
            tipoArredondamento: AppState.tipoArredondamento,
            margemSeguranca: AppState.margemSeguranca,
            modoAbatimentoEstoque: AppState.modoAbatimentoEstoque
        }
    };
}

function baixarBackupAprendizado() {
    try {
        const dados = gerarObjetoBackupAprendizado();
        const jsonStr = JSON.stringify(dados, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const dataHoje = new Date().toISOString().slice(0, 10);
        const link = document.createElement("a");
        link.href = url;
        link.download = `backup_aprendizado_motor_flv_${dataHoje}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        AppState.ultimoSalvoAprendizadoEm = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        salvarEstadoFormulario();
        atualizarTextoUltimoSalvo();
        exibirToast("📥 Arquivo de backup exportado com sucesso!");
    } catch (e) {
        console.error("Erro ao baixar backup:", e);
        exibirToast("Erro ao exportar arquivo de backup.");
    }
}

function copiarBackupAprendizadoJson() {
    try {
        const dados = gerarObjetoBackupAprendizado();
        const jsonStr = JSON.stringify(dados, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            AppState.ultimoSalvoAprendizadoEm = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
            salvarEstadoFormulario();
            atualizarTextoUltimoSalvo();
            exibirToast("📋 JSON do aprendizado copiado para a área de transferência!");
        }).catch(err => {
            console.error("Falha ao copiar:", err);
            exibirToast("Erro ao copiar JSON.");
        });
    } catch (e) {
        console.error("Erro:", e);
        exibirToast("Erro ao gerar cópia do backup.");
    }
}

function salvarAprendizadoManual() {
    try {
        AppState.ultimoSalvoAprendizadoEm = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        salvarEstadoFormulario();
        atualizarTextoUltimoSalvo();
        exibirToast("💾 Aprendizado salvo com sucesso no armazenamento local!");
    } catch (e) {
        console.error("Erro ao salvar aprendizado:", e);
        exibirToast("Erro ao salvar aprendizado.");
    }
}

function atualizarTextoUltimoSalvo() {
    const el = document.getElementById("statusUltimoSalvoAprendizado");
    if (el) {
        el.textContent = AppState.ultimoSalvoAprendizadoEm ? `Salvo às ${AppState.ultimoSalvoAprendizadoEm}` : "Não salvo nesta sessão";
    }
}

function processarArquivoBackupLido(conteudoTexto) {
    try {
        const dados = JSON.parse(conteudoTexto);
        if (!dados || (typeof dados !== "object")) {
            throw new Error("Arquivo JSON inválido ou vazio.");
        }

        const temPerfis = dados.perfisLojasAprendizado && typeof dados.perfisLojasAprendizado === "object";
        const temFeedback = dados.historicoPredicoes && typeof dados.historicoPredicoes === "object";
        const temConfigs = dados.configuracoesMotor && typeof dados.configuracoesMotor === "object";

        if (!temPerfis && !temFeedback && !temConfigs) {
            throw new Error("O arquivo não contém dados de aprendizado compatíveis com o Motor FLV.");
        }

        AppState._backupPendenteParaImportar = dados;

        const totalLojasBkp = temPerfis ? Object.keys(dados.perfisLojasAprendizado).length : 0;
        let totalAmostrasBkp = 0;
        if (temPerfis) {
            Object.values(dados.perfisLojasAprendizado).forEach(p => { totalAmostrasBkp += (p.amostras || 0); });
        }
        const totalSkusBkp = temFeedback ? Object.keys(dados.historicoPredicoes).length : 0;
        const dataExportBkp = dados.dataLegivel || dados.exportadoEm || "Desconhecida";

        const corpoModal = document.getElementById("corpoModalImportar");
        if (corpoModal) {
            corpoModal.innerHTML = `
                <div style="font-size:11px; color:#334155; line-height:1.5;">
                    <div style="margin-bottom:8px; background:#f1f5f9; padding:8px 10px; border-radius:6px; border:1px solid #cbd5e1;">
                        <div>📅 <b>Exportado em:</b> ${dataExportBkp}</div>
                        <div>🏛️ <b>Lojas no backup:</b> ${totalLojasBkp} (${totalAmostrasBkp} análises acumuladas)</div>
                        <div>📦 <b>SKUs com feedback:</b> ${totalSkusBkp} produtos</div>
                        <div>⚙️ <b>Configurações do motor:</b> ${temConfigs ? 'Incluídas' : 'Não'}</div>
                    </div>
                    <div style="margin-bottom:6px;">Escolha como deseja importar este backup:</div>
                    <ul style="margin:0 0 10px 18px; padding:0; font-size:10.5px; color:#475569;">
                        <li><b>Mesclar Aprendizado (Recomendado):</b> Soma as amostras e faz a média ponderada com seu aprendizado atual sem perder nenhum dado.</li>
                        <li><b>Substituir Tudo:</b> Substitui integralmente todos os perfis, feedbacks e configurações atuais pelos do arquivo.</li>
                    </ul>
                </div>
            `;
        }

        const modal = document.getElementById("modalImportarBackup");
        if (modal) modal.style.display = "flex";
    } catch (e) {
        console.error("Erro ao ler arquivo de backup:", e);
        exibirAlerta("Arquivo Inválido", `Falha ao interpretar o arquivo: ${e.message}`, "erro");
    }
}

function executarImportacaoBackup(modo = "mesclar") {
    const backup = AppState._backupPendenteParaImportar;
    if (!backup) return;

    try {
        if (modo === "mesclar") {
            // Mescla Perfis de Lojas
            if (backup.perfisLojasAprendizado) {
                if (!AppState.perfisLojasAprendizado) {
                    AppState.perfisLojasAprendizado = JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS));
                }
                for (const [idLoja, bkpPerfil] of Object.entries(backup.perfisLojasAprendizado)) {
                    if (!AppState.perfisLojasAprendizado[idLoja]) {
                        AppState.perfisLojasAprendizado[idLoja] = JSON.parse(JSON.stringify(bkpPerfil));
                    } else {
                        const atual = AppState.perfisLojasAprendizado[idLoja];
                        const pesoAtual = Math.max(1, atual.amostras || 1);
                        const pesoBkp = Math.max(1, bkpPerfil.amostras || 1);
                        const somaPesos = pesoAtual + pesoBkp;

                        atual.fatorCalibracao = Number((((atual.fatorCalibracao || 1) * pesoAtual + (bkpPerfil.fatorCalibracao || 1) * pesoBkp) / somaPesos).toFixed(2));
                        atual.impulsoFDS = Number((((atual.impulsoFDS || 1) * pesoAtual + (bkpPerfil.impulsoFDS || 1) * pesoBkp) / somaPesos).toFixed(2));
                        atual.impulsoQuarta = Number((((atual.impulsoQuarta || 1) * pesoAtual + (bkpPerfil.impulsoQuarta || 1) * pesoBkp) / somaPesos).toFixed(2));

                        if (Array.isArray(bkpPerfil.pesosDias) && bkpPerfil.pesosDias.length === 7) {
                            if (!Array.isArray(atual.pesosDias) || atual.pesosDias.length !== 7) {
                                atual.pesosDias = [1, 1, 1, 1, 1, 1, 1];
                            }
                            for (let d = 0; d < 7; d++) {
                                const vAtu = atual.pesosDias[d] || 1;
                                const vBkp = bkpPerfil.pesosDias[d] || 1;
                                atual.pesosDias[d] = Number(((vAtu * pesoAtual + vBkp * pesoBkp) / somaPesos).toFixed(2));
                            }
                        }

                        atual.amostras = (atual.amostras || 0) + (bkpPerfil.amostras || 0);
                        if (bkpPerfil.arquetipo && bkpPerfil.amostras > (atual.amostras || 0)) {
                            atual.arquetipo = bkpPerfil.arquetipo;
                            atual.desc = bkpPerfil.desc || atual.desc;
                        }
                        atual.ultimaAtualizacao = new Date().toLocaleDateString("pt-BR");
                    }
                }
            }

            // Mescla Histórico de Predições dos SKUs
            if (backup.historicoPredicoes) {
                if (!AppState.historicoPredicoes) AppState.historicoPredicoes = {};
                for (const [sku, bkpHist] of Object.entries(backup.historicoPredicoes)) {
                    if (!AppState.historicoPredicoes[sku]) {
                        AppState.historicoPredicoes[sku] = JSON.parse(JSON.stringify(bkpHist));
                    } else {
                        const hAtu = AppState.historicoPredicoes[sku];
                        hAtu.amostras = (hAtu.amostras || 1) + (bkpHist.amostras || 1);
                        hAtu.ema = Number((((hAtu.ema || 0.05) + (bkpHist.ema || 0.05)) / 2).toFixed(3));
                        hAtu.bias = Number((((hAtu.bias || 0) + (bkpHist.bias || 0)) / 2).toFixed(3));
                        hAtu.ultimaVendaMedia = bkpHist.ultimaVendaMedia || hAtu.ultimaVendaMedia;
                        hAtu.atualizadoEm = new Date().toLocaleDateString("pt-BR");
                    }
                }
            }
        } else {
            // Substituição Integral
            if (backup.perfisLojasAprendizado) {
                AppState.perfisLojasAprendizado = JSON.parse(JSON.stringify(backup.perfisLojasAprendizado));
            }
            if (backup.historicoPredicoes) {
                AppState.historicoPredicoes = JSON.parse(JSON.stringify(backup.historicoPredicoes));
            }
            if (backup.configuracoesMotor) {
                const cfg = backup.configuracoesMotor;
                if (cfg.modeloCiclos) AppState.modeloCiclos = cfg.modeloCiclos;
                if (cfg.usarPerfilLoja !== undefined) AppState.usarPerfilLoja = cfg.usarPerfilLoja;
                if (cfg.modoCurvaABC) AppState.modoCurvaABC = cfg.modoCurvaABC;
                if (cfg.usarSazonalidadeFina !== undefined) AppState.usarSazonalidadeFina = cfg.usarSazonalidadeFina;
                if (cfg.usarAlertaQueima !== undefined) AppState.usarAlertaQueima = cfg.usarAlertaQueima;
                if (cfg.usarFeedbackLoop !== undefined) AppState.usarFeedbackLoop = cfg.usarFeedbackLoop;
                if (cfg.usarTendencia !== undefined) AppState.usarTendencia = cfg.usarTendencia;
                if (cfg.modoFaseMes) AppState.modoFaseMes = cfg.modoFaseMes;
                if (cfg.modoQuebraTecnica) AppState.modoQuebraTecnica = cfg.modoQuebraTecnica;
                if (cfg.usarFiltroRuptura !== undefined) AppState.usarFiltroRuptura = cfg.usarFiltroRuptura;
                if (cfg.tipoArredondamento) AppState.tipoArredondamento = cfg.tipoArredondamento;
                if (cfg.margemSeguranca !== undefined) AppState.margemSeguranca = cfg.margemSeguranca;
                if (cfg.modoAbatimentoEstoque) AppState.modoAbatimentoEstoque = cfg.modoAbatimentoEstoque;
            }
        }

        AppState.ultimoSalvoAprendizadoEm = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        AppState._backupPendenteParaImportar = null;

        salvarEstadoFormulario();
        renderizarPainelResultados();

        const modal = document.getElementById("modalImportarBackup");
        if (modal) modal.style.display = "none";

        exibirToast(modo === "mesclar" ? "🌟 Aprendizado mesclado e atualizado com sucesso!" : "🔄 Aprendizado restaurado com sucesso!");
    } catch (e) {
        console.error("Erro ao aplicar importação:", e);
        exibirAlerta("Erro na Importação", `Falha ao aplicar dados: ${e.message}`, "erro");
    }
}

function injetarAprendizadoLoja(lojaId, valores7Dias) {
    if (!lojaId || !Array.isArray(valores7Dias) || valores7Dias.length !== 7) {
        throw new Error("Informe a loja e os 7 valores numéricos correspondentes aos dias da semana (Dom a Sáb).");
    }

    const lojaObj = obterLojaConfig(lojaId);
    const idPadrao = lojaObj ? lojaObj.id : lojaId;

    if (!AppState.perfisLojasAprendizado) {
        AppState.perfisLojasAprendizado = JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS));
    }
    if (!AppState.perfisLojasAprendizado[idPadrao]) {
        AppState.perfisLojasAprendizado[idPadrao] = JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS[idPadrao] || {
            id: idPadrao,
            nome: lojaObj ? lojaObj.nome : idPadrao,
            arquetipo: "Bairro Residencial",
            desc: "Perfil calibrado manualmente",
            fatorCalibracao: 1.00,
            pesosDias: [1, 1, 1, 1, 1, 1, 1],
            impulsoFDS: 1.00,
            impulsoQuarta: 1.00,
            amostras: 0,
            ultimaAtualizacao: "-"
        }));
    }

    const perfil = AppState.perfisLojasAprendizado[idPadrao];
    const valoresNum = valores7Dias.map(v => Math.max(0, Number(v) || 0));
    const soma = valoresNum.reduce((a, b) => a + b, 0);
    const mediaDiaria = soma > 0 ? soma / 7 : 1;

    // Pesos observados
    const pesosObs = valoresNum.map(v => Number((v / mediaDiaria).toFixed(2)));
    const mediaSexSab = (valoresNum[5] + valoresNum[6]) / 2;
    const impulsoFDSObs = Number((mediaSexSab / mediaDiaria).toFixed(2));
    const impulsoQuaObs = Number((valoresNum[3] / mediaDiaria).toFixed(2));

    const alfa = 0.25; // Peso na calibração
    if (!Array.isArray(perfil.pesosDias) || perfil.pesosDias.length !== 7) {
        perfil.pesosDias = pesosObs;
    } else {
        for (let d = 0; d < 7; d++) {
            perfil.pesosDias[d] = Number(((perfil.pesosDias[d] * (1 - alfa)) + (pesosObs[d] * alfa)).toFixed(2));
        }
    }

    perfil.impulsoFDS = Number((((perfil.impulsoFDS || 1.0) * (1 - alfa)) + (impulsoFDSObs * alfa)).toFixed(2));
    perfil.impulsoQuarta = Number((((perfil.impulsoQuarta || 1.0) * (1 - alfa)) + (impulsoQuaObs * alfa)).toFixed(2));
    perfil.amostras = (perfil.amostras || 0) + 1;
    perfil.ultimaAtualizacao = new Date().toLocaleDateString("pt-BR");

    // Identificação de Arquétipo
    if (perfil.impulsoQuarta >= 1.20) {
        perfil.arquetipo = "Centro & Quarta de Ofertas";
        perfil.desc = "Forte pico concentrado na Quarta-feira de Hortifrúti";
    } else if (perfil.impulsoFDS >= 1.16) {
        perfil.arquetipo = "Pico Fim de Semana (Sex+Sáb)";
        perfil.desc = "Alta concentração nas compras de Sexta e Sábado";
    } else if (perfil.pesosDias[1] >= 1.10) {
        perfil.arquetipo = "Fluxo Diário / Comercial";
        perfil.desc = "Consumo linear ao longo dos dias úteis";
    } else {
        perfil.arquetipo = "Bairro Tradicional & Família";
        perfil.desc = "Padrão equilibrado de reposição diária";
    }

    AppState.ultimoSalvoAprendizadoEm = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    salvarEstadoFormulario();
    renderizarPainelResultados();
    exibirToast(`🎯 Loja ${idPadrao} calibrada com sucesso (${perfil.amostras}x análises)!`);
}

function injetarFeedbackSku(sku, sugestaoRecomendada, vendaObservada, tipoEvento = "normal") {
    if (!sku) throw new Error("Código do SKU é obrigatório.");
    const cod = String(sku).trim();
    const sug = Math.max(0, Number(sugestaoRecomendada) || 0);
    const vReal = Math.max(0, Number(vendaObservada) || 0);

    if (!AppState.historicoPredicoes) AppState.historicoPredicoes = {};
    if (!AppState.historicoPredicoes[cod]) {
        AppState.historicoPredicoes[cod] = {
            amostras: 0,
            ultimaVendaMedia: vReal,
            ema: 0.05,
            bias: 0.0,
            atualizadoEm: "-"
        };
    }

    const hist = AppState.historicoPredicoes[cod];
    hist.amostras = (hist.amostras || 0) + 1;

    let erroRelativo = 0;
    if (sug > 0) {
        erroRelativo = (vReal - sug) / sug;
    } else if (vReal > 0) {
        erroRelativo = 0.5;
    }

    // Penalidade adaptativa se faltou ou sobrou produto
    if (tipoEvento === "ruptura") {
        erroRelativo = Math.max(erroRelativo, 0.20); // Motor comprou menos do que a demanda real
    } else if (tipoEvento === "sobra") {
        erroRelativo = Math.min(erroRelativo, -0.20); // Motor comprou a mais
    }

    const alfa = 0.35;
    hist.ema = Number(((hist.ema * (1 - alfa)) + (Math.abs(erroRelativo) * alfa)).toFixed(3));
    hist.bias = Number(((hist.bias * (1 - alfa)) + (erroRelativo * alfa)).toFixed(3));
    hist.ultimaVendaMedia = vReal;
    hist.atualizadoEm = new Date().toLocaleDateString("pt-BR");

    AppState.ultimoSalvoAprendizadoEm = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    salvarEstadoFormulario();
    renderizarPainelResultados();
    exibirToast(`📈 Feedback gravado para SKU ${cod}! Viés ajustado para ${((hist.bias || 0) * 100).toFixed(1)}%`);
}

function processarTextoRapidoAlimentacao(textoBruto, lojaId) {
    if (!textoBruto || !textoBruto.trim()) {
        throw new Error("Cole o texto, relatório ou saída do script de histórico.");
    }
    const txt = textoBruto.trim();

    // 1. Tenta parsear JSON
    try {
        const parsed = JSON.parse(txt);
        if (Array.isArray(parsed) && parsed.length >= 7) {
            const vals = parsed.slice(0, 7).map(Number);
            injetarAprendizadoLoja(lojaId, vals);
            return;
        }
        if (parsed.resultadoFinal && Array.isArray(parsed.resultadoFinal) && parsed.resultadoFinal.length >= 7) {
            const vals = parsed.resultadoFinal.slice(0, 7).map(v => typeof v === "object" ? (v.valor || v.media || 0) : Number(v));
            injetarAprendizadoLoja(lojaId, vals);
            return;
        }
        if (parsed.medias && Array.isArray(parsed.medias) && parsed.medias.length >= 7) {
            injetarAprendizadoLoja(lojaId, parsed.medias.slice(0, 7).map(Number));
            return;
        }
        const chavesDias = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];
        const valoresObj = chavesDias.map(c => {
            const k = Object.keys(parsed).find(k => k.toLowerCase().startsWith(c));
            return k !== undefined ? Number(parsed[k]) : null;
        });
        if (valoresObj.every(v => v !== null && !isNaN(v))) {
            injetarAprendizadoLoja(lojaId, valoresObj);
            return;
        }
    } catch (e) {
        // Não é JSON puro, continua com regex
    }

    // 2. Extração de 7 números separados por vírgula, espaço, quebra de linha ou traço
    const numerosEncontrados = txt.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (numerosEncontrados && numerosEncontrados.length >= 7) {
        const vals = numerosEncontrados.slice(0, 7).map(Number);
        injetarAprendizadoLoja(lojaId, vals);
        return;
    }

    throw new Error("Não foi possível identificar 7 valores numéricos correspondentes aos dias da semana. Forneça números separados por vírgula (ex: 15, 12, 10, 25, 14, 28, 30).");
}

function gerarHtmlCentralAprendizado(lojaSelecionadaId) {
    const perfis = AppState.perfisLojasAprendizado || PERFIS_PADRAO_LOJAS;
    const historico = AppState.historicoPredicoes || {};
    const totalLojas = Object.keys(perfis).length;
    let totalAmostrasLojas = 0;
    Object.values(perfis).forEach(p => { totalAmostrasLojas += (p.amostras || 0); });
    const totalSkus = Object.keys(historico).length;

    const opcoesLojas = LOJAS_CONFIG.map(l => 
        `<option value="${l.id}" ${l.id === lojaSelecionadaId ? 'selected' : ''}>${l.id} - ${l.nome}</option>`
    ).join('');

    const statusSalvo = AppState.ultimoSalvoAprendizadoEm 
        ? `Salvo às ${AppState.ultimoSalvoAprendizadoEm}` 
        : 'Não salvo nesta sessão';

    return `
        <div class="card-aprendizado-container">
            <div class="card-aprendizado-header">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:13px;">🧠</span>
                    <span style="font-size:11px; font-weight:700; color:#1e293b;">Central de Aprendizado & IA</span>
                </div>
                <span class="badge-status-aprendizado" id="statusUltimoSalvoAprendizado">
                    ${statusSalvo}
                </span>
            </div>

            <!-- Resumo das Estatísticas do Aprendizado -->
            <div class="status-aprendizado-metricas">
                <div class="item-metrica" title="Lojas Big Mais calibradas com IA adaptativa">
                    <span class="rotulo">Lojas Calibradas</span>
                    <span class="valor">🏛️ ${totalLojas} (${totalAmostrasLojas}x)</span>
                </div>
                <div class="item-metrica" title="Produtos com calibração contínua por Feedback Loop">
                    <span class="rotulo">SKUs c/ Feedback</span>
                    <span class="valor">📦 ${totalSkus} itens</span>
                </div>
            </div>

            <!-- Grid de Ações Rápidas: Salvar, Backup, Copiar, Restaurar -->
            <div class="acoes-backup-grid">
                <button type="button" id="btnSalvarAprendizado" class="btn btn-primary" title="Salva imediatamente o aprendizado e parâmetros no armazenamento local">
                    <span>💾</span> Salvar Agora
                </button>
                <button type="button" id="btnBaixarBackup" class="btn btn-secondary" title="Exporta um arquivo .json completo com todo o aprendizado">
                    <span>📥</span> Exportar Backup
                </button>
                <button type="button" id="btnCopiarBackupJson" class="btn btn-outline" title="Copia o conteúdo do backup como texto JSON">
                    <span>📋</span> Copiar JSON
                </button>
                <button type="button" id="btnImportarBackup" class="btn btn-outline" title="Restaura ou mescla aprendizado de um arquivo .json">
                    <span>📤</span> Restaurar Backup
                </button>
            </div>

            <!-- Painel Expansível de Alimentação do Motor -->
            <div class="painel-alimentar-motor">
                <div class="painel-alimentar-header" id="btnToggleAlimentarMotor">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span>➕</span>
                        <span>Alimentar o Motor (Aumentar Precisão)</span>
                    </div>
                    <span id="setaAlimentarMotor" style="font-size:10px; font-weight:700; color:var(--primary);">
                        ${AppState.alimentarMotorAberto ? '▲ Fechar' : '▼ Expandir'}
                    </span>
                </div>

                <div class="painel-alimentar-corpo ${AppState.alimentarMotorAberto ? 'open' : ''}" id="corpoAlimentarMotor">
                    <div class="subtabs-alimentar">
                        <button type="button" class="subtab-btn-alimentar active" data-subtab="subtab-loja">🏛️ Calibrar Loja</button>
                        <button type="button" class="subtab-btn-alimentar" data-subtab="subtab-sku">📦 Feedback SKU</button>
                        <button type="button" class="subtab-btn-alimentar" data-subtab="subtab-texto">⚡ Colar do Script</button>
                    </div>

                    <!-- SUBTAB 1: CALIBRAR LOJA (7 DIAS) -->
                    <div id="subtab-loja" class="subtab-painel active">
                        <div class="info-dica">
                            💡 Insira as vendas médias ou totais de cada dia da semana para calibrar os pesos e arquétipo da loja.
                        </div>
                        <div class="form-row" style="margin-bottom:6px;">
                            <label for="selectLojaAlimentar">Filial Big Mais:</label>
                            <select id="selectLojaAlimentar" style="font-size:11px; padding:4px 6px;">
                                ${opcoesLojas}
                            </select>
                        </div>
                        <div class="grid-dias-semana">
                            <div class="dia-input-box">
                                <label>Dom</label>
                                <input type="number" id="inputDiaDom" placeholder="0" min="0" step="any">
                            </div>
                            <div class="dia-input-box">
                                <label>Seg</label>
                                <input type="number" id="inputDiaSeg" placeholder="0" min="0" step="any">
                            </div>
                            <div class="dia-input-box">
                                <label>Ter</label>
                                <input type="number" id="inputDiaTer" placeholder="0" min="0" step="any">
                            </div>
                            <div class="dia-input-box">
                                <label>Qua</label>
                                <input type="number" id="inputDiaQua" placeholder="0" min="0" step="any">
                            </div>
                            <div class="dia-input-box">
                                <label>Qui</label>
                                <input type="number" id="inputDiaQui" placeholder="0" min="0" step="any">
                            </div>
                            <div class="dia-input-box">
                                <label>Sex</label>
                                <input type="number" id="inputDiaSex" placeholder="0" min="0" step="any">
                            </div>
                            <div class="dia-input-box">
                                <label>Sáb</label>
                                <input type="number" id="inputDiaSab" placeholder="0" min="0" step="any">
                            </div>
                        </div>
                        <button type="button" id="btnSalvarAlimentacaoLoja" class="btn btn-primary btn-full" style="padding:6px; font-size:11px; margin-top:8px;">
                            ⚡ Injetar Calibração na Loja
                        </button>
                    </div>

                    <!-- SUBTAB 2: FEEDBACK POR SKU -->
                    <div id="subtab-sku" class="subtab-painel">
                        <div class="info-dica">
                            🎯 Ensine o motor informando o que foi recomendado vs a venda real para auto-calibrar o viés (EMA).
                        </div>
                        <div class="form-row" style="margin-bottom:6px;">
                            <label for="inputSkuFeedback">Produto (SKU):</label>
                            <input type="text" id="inputSkuFeedback" placeholder="Ex: 10871 ou CEBOLINHA" style="font-size:11px; padding:4px 6px;">
                        </div>
                        <div class="form-grid-2" style="gap:6px; margin-bottom:6px;">
                            <div>
                                <label for="inputQtdRecomendada">Sugerido (un):</label>
                                <input type="number" id="inputQtdRecomendada" placeholder="Ex: 25" min="0" style="font-size:11px; padding:4px 6px;">
                            </div>
                            <div>
                                <label for="inputQtdReal">Venda Real (un):</label>
                                <input type="number" id="inputQtdReal" placeholder="Ex: 30" min="0" style="font-size:11px; padding:4px 6px;">
                            </div>
                        </div>
                        <div class="form-row" style="margin-bottom:8px;">
                            <label for="selectTipoEventoFeedback">Ocorrência em Loja:</label>
                            <select id="selectTipoEventoFeedback" style="font-size:11px; padding:4px 6px;">
                                <option value="normal">Normal (Venda acompanhou demanda)</option>
                                <option value="ruptura">Ruptura / Faltou Produto (Demanda reprimida)</option>
                                <option value="sobra">Sobra / Excesso (Risco de quebra/descarte)</option>
                            </select>
                        </div>
                        <button type="button" id="btnSalvarFeedbackSku" class="btn btn-primary btn-full" style="padding:6px; font-size:11px;">
                            🎯 Injetar Feedback do SKU
                        </button>
                    </div>

                    <!-- SUBTAB 3: COLAR DO SCRIPT (Historico.py) -->
                    <div id="subtab-texto" class="subtab-painel">
                        <div class="info-dica">
                            🚀 Cole a saída do seu script <b>Historico.py</b>, JSON de médias ou 7 números separados por vírgula (Dom a Sáb).
                        </div>
                        <div class="form-row" style="margin-bottom:6px;">
                            <label for="selectLojaTextoRapido">Filial Destino:</label>
                            <select id="selectLojaTextoRapido" style="font-size:11px; padding:4px 6px;">
                                ${opcoesLojas}
                            </select>
                        </div>
                        <div class="form-row" style="margin-bottom:8px;">
                            <label for="txtEntradaRapidaHistorico">Saída / Médias:</label>
                            <textarea id="txtEntradaRapidaHistorico" rows="3" placeholder="Ex: 15, 12, 10, 25, 14, 28, 30 ou cole o JSON do Historico.py" style="width:100%; font-size:11px; padding:6px; border-radius:var(--radius); border:1px solid var(--border); font-family:monospace; resize:vertical;"></textarea>
                        </div>
                        <button type="button" id="btnProcessarTextoRapido" class="btn btn-primary btn-full" style="padding:6px; font-size:11px;">
                            🚀 Processar & Calibrar Motor
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function gerarHtmlAbaConfig(lojaSelecionadaId) {
    const htmlCentralAprendizado = gerarHtmlCentralAprendizado(lojaSelecionadaId);

    // Grid de Perfis Aprendidos das 6 Lojas Big Mais (Governador Valadares)
    const perfis = AppState.perfisLojasAprendizado || PERFIS_PADRAO_LOJAS;
    const cardsPerfisLojas = LOJAS_CONFIG.map(lj => {
        const p = perfis[lj.id] || PERFIS_PADRAO_LOJAS[lj.id] || {
            arquetipo: "Bairro Residencial",
            fatorCalibracao: 1.00,
            amostras: 0,
            desc: "Padrão de reposição equilibrado"
        };
        const isAtiva = lj.id === lojaSelecionadaId;
        const fatorExib = (p.fatorCalibracao || 1.00).toFixed(2);
        const ocsAmostras = p.amostras || 0;
        return `
            <div class="loja-perfil-card ${isAtiva ? 'ativa' : ''}">
                <div class="loja-perfil-top">
                    <span class="loja-perfil-id">${lj.id} - ${lj.nome} ${isAtiva ? '⭐' : ''}</span>
                    <span class="loja-perfil-fator">x${fatorExib}</span>
                </div>
                <div class="loja-perfil-mid">
                    <span class="badge-arquetipo">${p.arquetipo}</span>
                    <span class="loja-perfil-amostras">${ocsAmostras > 0 ? ocsAmostras + 'x análises' : 'Calibração Inicial'}</span>
                </div>
                <div class="loja-perfil-desc">${p.desc}</div>
            </div>
        `;
    }).join('');

    const htmlPerfisLojas = `
        <div class="loja-perfil-grid">
            ${cardsPerfisLojas}
        </div>
        <div style="display:flex; gap:6px; margin-top:8px;">
            <button id="btnRecalibrarLojaAtual" class="btn btn-secondary" style="flex:1; font-size:10px; padding:5px 6px;">
                🔄 Recalibrar Loja Atual
            </button>
            <button id="btnResetarPerfisLojas" class="btn-reset-aprendizado" style="flex:1; margin-top:0; padding:5px 6px; text-align:center;">
                🗑️ Resetar Perfis Lojas
            </button>
        </div>
    `;

    // Renderiza Logs de Auditoria na Aba de Ajustes
    let htmlTabelaLogs = '';
    const logsChaves = Object.keys(AppState.historicoPredicoes || {});
    if (logsChaves.length > 0) {
        htmlTabelaLogs = `
            <table class="tabela-logs-auditoria">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Amostras</th>
                        <th>EMA</th>
                        <th>Viés</th>
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    ${logsChaves.slice(0, 5).map(sku => {
                        const h = AppState.historicoPredicoes[sku];
                        return `
                            <tr>
                                <td><b>${sku}</b></td>
                                <td>${h.amostras || 1}x</td>
                                <td>${((h.ema || 0) * 100).toFixed(1)}%</td>
                                <td style="color:${(h.bias || 0) >= 0 ? '#059669' : '#dc2626'}">${((h.bias || 0) * 100).toFixed(1)}%</td>
                                <td>${h.atualizadoEm || '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <button id="btnLimparLogsAprendizado" class="btn-reset-aprendizado">
                🗑️ Resetar Histórico de Aprendizado
            </button>
        `;
    } else {
        htmlTabelaLogs = `<div style="font-size:10px; color:var(--muted); margin-top:4px;">Nenhuma auditoria acumulada ainda. Os logs serão gravados conforme os produtos forem sincronizados ou alimentados.</div>`;
    }

    return `
        <!-- CENTRAL DE APRENDIZADO & BACKUP -->
        ${htmlCentralAprendizado}

        <!-- BANCO DE DADOS DE ESTOQUE (GITHUB ACTIONS / SQLITE) -->
        <div style="font-size:11px; font-weight:700; color:#1e293b; margin-bottom:6px; display:flex; align-items:center; justify-content:space-between;">
            <span>☁️ Estoque na Nuvem (GitHub Actions)</span>
            <span class="badge-status" style="margin:0; font-size:8.5px; padding:2px 5px;">
                ${AppState.bancoEstoque.dados ? `${Object.keys(AppState.bancoEstoque.dados).length} Itens OK` : 'Pendente'}
            </span>
        </div>

        <div style="background:#f8fafc; padding:8px 10px; border-radius:6px; margin-bottom:12px; border:1px solid #cbd5e1;">
            <div style="font-size:10px; color:#475569; margin-bottom:6px; line-height:1.4;">
                Atualizado a cada 30 minutos pelo robô no GitHub Actions.<br>
                <b>Origem:</b> ${AppState.bancoEstoque.origem === 'github' ? '☁️ Nuvem GitHub' : (AppState.bancoEstoque.origem === 'arquivo' ? '📁 Arquivo .db Local' : 'Padrão Integrado')} | 
                <b>Coleta:</b> ${AppState.bancoEstoque.ultimaAtualizacao || 'Recente'}
            </div>

            <div class="form-row" style="margin-bottom:6px;">
                <label for="inputRepoGitHub" style="font-size:9.5px;">Repositório GitHub:</label>
                <input type="text" id="inputRepoGitHub" value="${AppState.bancoEstoque.repoGitHub || 'saaesilva/estoque-bigmais-automacao'}" placeholder="usuario/repositorio" style="font-size:11px; padding:4px 6px;">
            </div>

            <div class="form-row" style="margin-bottom:6px;">
                <label for="inputTokenGitHub" style="font-size:9.5px;">Token GitHub (apenas se for privado):</label>
                <input type="password" id="inputTokenGitHub" value="${AppState.bancoEstoque.tokenGitHub || ''}" placeholder="Deixe em branco se o repositório for público" style="font-size:11px; padding:4px 6px;">
            </div>

            <div style="display:grid; grid-template-columns: 1fr auto; gap:6px; margin-top:8px;">
                <button type="button" id="btnSyncGitHub" class="btn btn-primary" style="padding:6px 10px; font-size:11px; font-weight:700;">
                    <span>☁️</span> Sincronizar Nuvem (GitHub)
                </button>
                <button type="button" id="btnCarregarArquivoDb" class="btn btn-secondary" title="Carregar arquivo .db localmente como alternativa" style="padding:6px 8px; font-size:10px; font-weight:600;">
                    <span>📁</span> .db Local
                </button>
            </div>

            <div style="margin-top:8px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:10.5px; text-transform:none; font-weight:600; cursor:pointer; color:#1e293b;">
                    <input type="checkbox" id="checkUsarBancoEstoque" ${AppState.bancoEstoque.ativo ? 'checked' : ''} style="width:auto; cursor:pointer;">
                    Ativar preenchimento de estoque pelo Banco
                </label>
            </div>
        </div>

        <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:8px;">
            Parametrização da Tomada de Decisão
        </div>
        
        <div class="form-row">
            <label for="selectModeloCiclos">Modelo de Ciclos:</label>
            <select id="selectModeloCiclos">
                <option value="4ciclos" ${AppState.modeloCiclos === '4ciclos' ? 'selected' : ''}>4 Ciclos (Dom+Seg, Ter+Qua, Qui, Sex+Sáb)</option>
                <option value="3ciclos" ${AppState.modeloCiclos === '3ciclos' ? 'selected' : ''}>3 Ciclos Clássico (Seg, Qua, Sex)</option>
                <option value="7ciclos" ${AppState.modeloCiclos === '7ciclos' ? 'selected' : ''}>7 Ciclos Diário (Seg, Ter, Qua, Qui, Sex, Sáb, Dom)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectPerfilLoja">Modelo de Aprendizado de Perfil por Loja (IA Adaptativa):</label>
            <select id="selectPerfilLoja">
                <option value="sim" ${AppState.usarPerfilLoja ? 'selected' : ''}>Ativado (Aprende comportamento e picos de cada filial)</option>
                <option value="nao" ${!AppState.usarPerfilLoja ? 'selected' : ''}>Desativado (Multiplicador neutro 1.00x)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectCurvaABC">Classificação Curva ABC:</label>
            <select id="selectCurvaABC">
                <option value="auto" ${AppState.modoCurvaABC === 'auto' ? 'selected' : ''}>Automático Inteligente (Baseado no Item & Giro)</option>
                <option value="A" ${AppState.modoCurvaABC === 'A' ? 'selected' : ''}>Classe A+ (Alto Giro / Zero Ruptura +7%)</option>
                <option value="B" ${AppState.modoCurvaABC === 'B' ? 'selected' : ''}>Classe B (Giro Médio / Equilibrado 1.00x)</option>
                <option value="C" ${AppState.modoCurvaABC === 'C' ? 'selected' : ''}>Classe C / Risco (JIT Estrito -12%)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectSazonalidadeFina">Efeito Fim de Semana (Sex+Sáb):</label>
            <select id="selectSazonalidadeFina">
                <option value="sim" ${AppState.usarSazonalidadeFina ? 'selected' : ''}>Ativado (Impulso específico no ciclo de Sexta/Sábado)</option>
                <option value="nao" ${!AppState.usarSazonalidadeFina ? 'selected' : ''}>Desativado (Média linear sem impulso de pico)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectAlertaQueima">Gestão Preditiva de Lote (Alerta de Queima PEPS):</label>
            <select id="selectAlertaQueima">
                <option value="sim" ${AppState.usarAlertaQueima ? 'selected' : ''}>Ativado (Monitora shelf-life e sugere preço promocional)</option>
                <option value="nao" ${!AppState.usarAlertaQueima ? 'selected' : ''}>Desativado</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectFeedbackLoop">Feedback Loop (Auto-Correção com EMA):</label>
            <select id="selectFeedbackLoop">
                <option value="sim" ${AppState.usarFeedbackLoop ? 'selected' : ''}>Ativado (Aprende desvios e auto-calibra coeficientes)</option>
                <option value="nao" ${!AppState.usarFeedbackLoop ? 'selected' : ''}>Desativado</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectTendencia">Ponderar Tendência Recente (14 dias):</label>
            <select id="selectTendencia">
                <option value="sim" ${AppState.usarTendencia ? 'selected' : ''}>Sim (Reage a picos e quedas recentes)</option>
                <option value="nao" ${!AppState.usarTendencia ? 'selected' : ''}>Não (Média histórica pura e estática)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectFaseMes">Sazonalidade do Ciclo de Pagamento:</label>
            <select id="selectFaseMes">
                <option value="auto" ${AppState.modoFaseMes === 'auto' ? 'selected' : ''}>Automático (Detecta dias 01-10 Quinto Dia Útil)</option>
                <option value="pagamento" ${AppState.modoFaseMes === 'pagamento' ? 'selected' : ''}>Forçar Início / Pagamento (+12%)</option>
                <option value="meio" ${AppState.modoFaseMes === 'meio' ? 'selected' : ''}>Forçar Meio de Mês (1.00x)</option>
                <option value="fim" ${AppState.modoFaseMes === 'fim' ? 'selected' : ''}>Forçar Fim de Mês (-6%)</option>
                <option value="desativado" ${AppState.modoFaseMes === 'desativado' ? 'selected' : ''}>Desativar ajuste de fase do mês</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectQuebraTecnica">Compensação de Quebra Técnica & Perecibilidade:</label>
            <select id="selectQuebraTecnica">
                <option value="auto" ${AppState.modoQuebraTecnica === 'auto' ? 'selected' : ''}>Automática por Tipo (Hidropônico 6%, Folha 9%, Legume 5%)</option>
                <option value="0" ${AppState.modoQuebraTecnica === '0' ? 'selected' : ''}>Zero (Sem quebra técnica adicional)</option>
                <option value="5" ${AppState.modoQuebraTecnica === '5' ? 'selected' : ''}>+5% de quebra padrão</option>
                <option value="10" ${AppState.modoQuebraTecnica === '10' ? 'selected' : ''}>+10% de quebra alta</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectFiltroRuptura">Filtro Antifalha de Rupturas (Venda 0 Atípica):</label>
            <select id="selectFiltroRuptura">
                <option value="sim" ${AppState.usarFiltroRuptura ? 'selected' : ''}>Ativado (Expurga dias onde faltou produto)</option>
                <option value="nao" ${!AppState.usarFiltroRuptura ? 'selected' : ''}>Desativado (Inclui dias zerados na média)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectArredondamento">Tipo de Arredondamento:</label>
            <select id="selectArredondamento">
                <option value="inteiro" ${AppState.tipoArredondamento === 'inteiro' ? 'selected' : ''}>Número Inteiro (Ex: 15, 22)</option>
                <option value="multiplo5" ${AppState.tipoArredondamento === 'multiplo5' ? 'selected' : ''}>Múltiplos de 5 (Ex: 15, 20, 25)</option>
                <option value="multiplo10" ${AppState.tipoArredondamento === 'multiplo10' ? 'selected' : ''}>Múltiplos de 10 (Ex: 20, 30, 40)</option>
                <option value="caixa" ${AppState.tipoArredondamento === 'caixa' ? 'selected' : ''}>Caixa Fechada (Arredonda p/ cima em 10)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectMargemExtra">Margem de Segurança Manual Extra:</label>
            <select id="selectMargemExtra">
                <option value="0" ${AppState.margemSeguranca === 0 ? 'selected' : ''}>0% (Padrão exato)</option>
                <option value="5" ${AppState.margemSeguranca === 5 ? 'selected' : ''}>+5% (Margem leve)</option>
                <option value="10" ${AppState.margemSeguranca === 10 ? 'selected' : ''}>+10% (Segurança alta)</option>
                <option value="15" ${AppState.margemSeguranca === 15 ? 'selected' : ''}>+15% (Pico promocional)</option>
            </select>
        </div>

        <div class="form-row">
            <label for="selectAbatimento">Abater Estoque Onde:</label>
            <select id="selectAbatimento">
                <option value="segunda" ${AppState.modoAbatimentoEstoque === 'segunda' ? 'selected' : ''}>Sempre no primeiro ciclo</option>
                <option value="hoje" ${AppState.modoAbatimentoEstoque === 'hoje' ? 'selected' : ''}>No ciclo correspondente a hoje</option>
            </select>
        </div>

        <div style="margin-top:12px; border-top:1px solid var(--border); padding-top:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <div style="font-size:11px; font-weight:700; color:#334155;">
                    🏛️ Perfis de Comportamento por Loja (IA Adaptativa)
                </div>
                <span style="font-size:9px; color:var(--primary); font-weight:700;">6 Lojas Big Mais</span>
            </div>
            ${htmlPerfisLojas}
        </div>

        <div style="margin-top:12px; border-top:1px solid var(--border); padding-top:8px;">
            <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:4px;">
                Auditoria de Aprendizado (Feedback Loop)
            </div>
            ${htmlTabelaLogs}
        </div>
    `;
}

function configurarEventosCentralAprendizado() {
    // Salvar Manual
    const btnSalvar = document.getElementById("btnSalvarAprendizado");
    if (btnSalvar) {
        btnSalvar.addEventListener("click", salvarAprendizadoManual);
    }

    // Baixar Backup (.json)
    const btnBaixar = document.getElementById("btnBaixarBackup");
    if (btnBaixar) {
        btnBaixar.addEventListener("click", baixarBackupAprendizado);
    }

    // Copiar JSON
    const btnCopiarJson = document.getElementById("btnCopiarBackupJson");
    if (btnCopiarJson) {
        btnCopiarJson.addEventListener("click", copiarBackupAprendizadoJson);
    }

    // Abrir seletor de arquivo de backup
    const btnImportar = document.getElementById("btnImportarBackup");
    const inputArquivo = document.getElementById("inputArquivoBackup");
    if (btnImportar && inputArquivo) {
        btnImportar.addEventListener("click", () => {
            inputArquivo.value = "";
            inputArquivo.click();
        });
        inputArquivo.onchange = (e) => {
            const f = e.target.files?.[0];
            if (f) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    processarArquivoBackupLido(evt.target.result);
                };
                reader.readAsText(f);
            }
        };
    }

    // Modal de Importação - Fechar e Ações
    const btnFecharModal = document.getElementById("btnFecharModalImportar");
    if (btnFecharModal) {
        btnFecharModal.addEventListener("click", () => {
            const modal = document.getElementById("modalImportarBackup");
            if (modal) modal.style.display = "none";
            AppState._backupPendenteParaImportar = null;
        });
    }

    const btnConfirmarMesclar = document.getElementById("btnConfirmarMesclar");
    if (btnConfirmarMesclar) {
        btnConfirmarMesclar.addEventListener("click", () => {
            executarImportacaoBackup("mesclar");
        });
    }

    const btnConfirmarSubstituir = document.getElementById("btnConfirmarSubstituir");
    if (btnConfirmarSubstituir) {
        btnConfirmarSubstituir.addEventListener("click", () => {
            executarImportacaoBackup("substituir");
        });
    }

    // Toggle Acordeão Alimentar Motor
    const btnToggleAlimentar = document.getElementById("btnToggleAlimentarMotor");
    if (btnToggleAlimentar) {
        btnToggleAlimentar.addEventListener("click", () => {
            AppState.alimentarMotorAberto = !AppState.alimentarMotorAberto;
            const corpo = document.getElementById("corpoAlimentarMotor");
            const seta = document.getElementById("setaAlimentarMotor");
            if (corpo) corpo.classList.toggle("open", AppState.alimentarMotorAberto);
            if (seta) seta.textContent = AppState.alimentarMotorAberto ? '▲ Fechar' : '▼ Expandir';
        });
    }

    // Subtabs de Alimentação
    const subtabsBtns = document.querySelectorAll(".subtab-btn-alimentar");
    subtabsBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            subtabsBtns.forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".subtab-painel").forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const tabId = btn.getAttribute("data-subtab");
            const targetPainel = document.getElementById(tabId);
            if (targetPainel) targetPainel.classList.add("active");
        });
    });

    // Subtab 1: Injetar Calibração na Loja
    const btnSalvarLoja = document.getElementById("btnSalvarAlimentacaoLoja");
    if (btnSalvarLoja) {
        btnSalvarLoja.addEventListener("click", () => {
            const lj = document.getElementById("selectLojaAlimentar")?.value;
            const dDom = document.getElementById("inputDiaDom")?.value;
            const dSeg = document.getElementById("inputDiaSeg")?.value;
            const dTer = document.getElementById("inputDiaTer")?.value;
            const dQua = document.getElementById("inputDiaQua")?.value;
            const dQui = document.getElementById("inputDiaQui")?.value;
            const dSex = document.getElementById("inputDiaSex")?.value;
            const dSab = document.getElementById("inputDiaSab")?.value;

            const vals = [dDom, dSeg, dTer, dQua, dQui, dSex, dSab].map(v => Number(v) || 0);
            if (vals.every(v => v === 0)) {
                exibirToast("Informe ao menos um valor de venda para calibrar a loja.");
                return;
            }

            try {
                injetarAprendizadoLoja(lj, vals);
            } catch (err) {
                exibirToast(err.message);
            }
        });
    }

    // Subtab 2: Injetar Feedback do SKU
    const btnSalvarSku = document.getElementById("btnSalvarFeedbackSku");
    if (btnSalvarSku) {
        btnSalvarSku.addEventListener("click", () => {
            const sku = document.getElementById("inputSkuFeedback")?.value;
            const sug = document.getElementById("inputQtdRecomendada")?.value;
            const real = document.getElementById("inputQtdReal")?.value;
            const tipo = document.getElementById("selectTipoEventoFeedback")?.value || "normal";

            if (!sku || !sku.trim()) {
                exibirToast("Informe o código ou descrição do SKU.");
                return;
            }
            if (sug === "" && real === "") {
                exibirToast("Informe a quantidade recomendada ou venda real.");
                return;
            }

            try {
                injetarFeedbackSku(sku, sug, real, tipo);
            } catch (err) {
                exibirToast(err.message);
            }
        });
    }

    // Subtab 3: Processar Texto / Historico.py
    const btnProcessarTexto = document.getElementById("btnProcessarTextoRapido");
    if (btnProcessarTexto) {
        btnProcessarTexto.addEventListener("click", () => {
            const lj = document.getElementById("selectLojaTextoRapido")?.value;
            const txt = document.getElementById("txtEntradaRapidaHistorico")?.value;

            try {
                processarTextoRapidoAlimentacao(txt, lj);
            } catch (err) {
                exibirToast(err.message);
            }
        });
    }
}

// ============================================================================
// Renderização do Painel de Decisão Profissional
// ============================================================================

function renderizarPainelResultados() {
    const dados = AppState.dadosGrafico;
    const clima = AppState.clima || { temperatura: 28, fator: 1.0, classificacao: "Normal" };
    const estoque = AppState.estoqueTotal || 0;
    const selectLoja = document.getElementById("selectLoja");
    const selectProduto = document.getElementById("selectProduto");

    const lojaSelecionadaId = selectLoja ? selectLoja.value : "02 TRE";
    const lojaObj = obterLojaConfig(lojaSelecionadaId);
    const lojaNomeFormatado = lojaObj ? `${lojaObj.id} - ${lojaObj.nome}` : lojaSelecionadaId;

    const codigoProduto = selectProduto?.value || "";
    const produtoTexto = selectProduto?.options[selectProduto?.selectedIndex]?.text || (codigoProduto ? `Produto ${codigoProduto}` : (dados?.produtoDetectado ? `Produto ${dados.produtoDetectado}` : ""));

    // Se ainda não temos dados do gráfico ou ocorreu divergência antes de carregar
    if (!dados || !dados.todosPontos || dados.todosPontos.length === 0) {
        let htmlCardSincronismo = '';
        if (AppState.sincronismoInfo) {
            const sinc = AppState.sincronismoInfo;
            const ehOk = sinc.status === "sucesso";
            const classeCard = ehOk ? "sinc-ok" : (sinc.status === "alerta" ? "sinc-alerta" : "sinc-erro");
            const textoBadge = ehOk ? "🟢 Sincronizado com Dext" : (sinc.status === "alerta" ? "⚠️ Sincronismo Parcial" : "🔴 Divergência de Sincronismo");

            htmlCardSincronismo = `
                <div class="sincronismo-card ${classeCard}">
                    <div class="sinc-card-header">
                        <span class="sinc-badge-status">${textoBadge}</span>
                        <span class="sinc-card-time">${sinc.timestamp ? 'Checado às ' + sinc.timestamp : ''}</span>
                    </div>
                    <div class="sinc-card-grid">
                        <div class="sinc-card-item ${sinc.lojaOk ? 'item-ok' : 'item-erro'}" title="${sinc.lojaDext || sinc.lojaEsperada}">
                            <span class="sinc-rotulo">Loja</span>
                            <span class="sinc-valor">${sinc.lojaDext || sinc.lojaEsperada}</span>
                            <span class="sinc-check">${sinc.lojaOk ? '✓ Loja OK' : '✗ Diverge'}</span>
                        </div>
                        <div class="sinc-card-item ${sinc.codigoOk ? 'item-ok' : 'item-erro'}">
                            <span class="sinc-rotulo">Código</span>
                            <span class="sinc-valor">${sinc.codigoDext || sinc.codigoEsperado}</span>
                            <span class="sinc-check">${sinc.codigoOk ? '✓ Cód OK' : '✗ Diverge'}</span>
                        </div>
                        <div class="sinc-card-item ${sinc.descricaoOk ? 'item-ok' : 'item-erro'}" title="${sinc.descricaoDext || sinc.descricaoEsperada}">
                            <span class="sinc-rotulo">Descrição</span>
                            <span class="sinc-valor">${sinc.descricaoDext || sinc.descricaoEsperada}</span>
                            <span class="sinc-check">${sinc.descricaoOk ? '✓ Desc OK' : '✗ Diverge'}</span>
                        </div>
                    </div>
                    ${!ehOk && sinc.motivoDivergencia ? `
                        <div class="sinc-alerta-msg">
                            <b>Aviso de Auditoria:</b> ${sinc.motivoDivergencia}
                            <button id="btnCorrigirSincronismo" class="btn btn-primary" style="margin-top:6px; width:100%; font-size:10px; padding:4px 6px;">
                                🚀 Ressincronizar Loja & Produto no Dext Agora
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const divResultado = document.getElementById("resultado");
        if (divResultado) {
            const htmlConteudo = `
                <!-- ABA 1: SUGESTÕES (INICIAL) -->
                <div id="tab-sugestoes" class="tab-content ${AppState.abaAtiva === 'tab-sugestoes' ? 'active' : ''}">
                    ${htmlCardSincronismo}
                    <div style="text-align: center; color: var(--muted); padding: 25px 15px;">
                        <div style="font-size: 26px; margin-bottom: 8px;">🛒</div>
                        <div style="font-weight: 600; color: #1e293b; font-size: 12px; margin-bottom: 4px;">Aguardando Análise do Dext</div>
                        <div style="font-size: 11px; line-height: 1.4;">Selecione a loja e o produto acima e clique em <b>"Aplicar & Sincronizar no Dext"</b> ou <b>"Recalcular"</b> para gerar as sugestões.</div>
                    </div>
                </div>

                <!-- ABA 2: MÉDIAS DETALHADAS (INICIAL) -->
                <div id="tab-medias" class="tab-content ${AppState.abaAtiva === 'tab-medias' ? 'active' : ''}">
                    <div style="text-align: center; color: var(--muted); padding: 25px 15px;">
                        <div style="font-size: 26px; margin-bottom: 8px;">📊</div>
                        <div style="font-weight: 600; color: #1e293b; font-size: 12px; margin-bottom: 4px;">Médias Semanais Pendentes</div>
                        <div style="font-size: 11px; line-height: 1.4;">Sincronize as vendas no Dext para visualizar a distribuição dos 7 dias da semana e saneamento de rupturas.</div>
                    </div>
                </div>

                <!-- ABA 3: AJUSTES E CENTRAL DE APRENDIZADO -->
                <div id="tab-config" class="tab-content ${AppState.abaAtiva === 'tab-config' ? 'active' : ''}">
                    ${gerarHtmlAbaConfig(lojaSelecionadaId)}
                </div>
            `;
            divResultado.innerHTML = htmlConteudo;
            reativarBotoesDoResultado();
        }
        return;
    }

    // Processa a inteligência multivariável de decisão (com os 4 novos módulos)
    const analise = analisarDemandaAvancada(dados, produtoTexto, lojaSelecionadaId, codigoProduto);
    const medias = analise.mediasAjustadas;
    const stats = dados.estatisticasDias || {};
    const multiplicador = analise.multiplicadorComposto;

    let htmlTabelaPedidos = '';
    let dadosWhatsApp = {};

    // Modulação fina por dia da semana (Efeito Fim de Semana)
    const fdsFator = AppState.usarSazonalidadeFina ? Math.max(1.0, analise.impulsoFimDeSemana * 0.95) : 1.0;

    // CENÁRIO 1: 4 CICLOS (DOM+SEG, TER+QUA, QUI, SEX+SÁB)
    if (AppState.modeloCiclos === "4ciclos") {
        const cicloDomSegBruto = (medias[0] + medias[1]) * multiplicador;
        const cicloTerQuaBruto = (medias[2] + medias[3]) * multiplicador;
        const cicloQuintaBruto = medias[4] * multiplicador;
        // Sexta + Sábado recebe o impulso calibrado de fim de semana
        const cicloSexSabBruto = (medias[5] + medias[6]) * multiplicador * fdsFator;

        let pedDomSeg = aplicarArredondamento(cicloDomSegBruto);
        let pedTerQua = aplicarArredondamento(cicloTerQuaBruto);
        let pedQuinta = aplicarArredondamento(cicloQuintaBruto);
        let pedSexSab = aplicarArredondamento(cicloSexSabBruto);

        const estoqueFisico = Math.max(0, estoque);
        if (AppState.modoAbatimentoEstoque === "segunda") {
            pedDomSeg = aplicarArredondamento(Math.max(0, cicloDomSegBruto - estoqueFisico));
        } else {
            const diaSemanaHoje = (new Date()).getDay();
            if (diaSemanaHoje === 2 || diaSemanaHoje === 3) {
                pedTerQua = aplicarArredondamento(Math.max(0, cicloTerQuaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 4) {
                pedQuinta = aplicarArredondamento(Math.max(0, cicloQuintaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 5 || diaSemanaHoje === 6) {
                pedSexSab = aplicarArredondamento(Math.max(0, cicloSexSabBruto - estoqueFisico));
            } else {
                pedDomSeg = aplicarArredondamento(Math.max(0, cicloDomSegBruto - estoqueFisico));
            }
        }

        dadosWhatsApp = {
            tipo: "4ciclos",
            linhas: [
                { nome: "Domingo + Segunda", desc: `Demanda est.: ${aplicarArredondamento(cicloDomSegBruto)} un`, qtd: `${pedDomSeg} un` },
                { nome: "Terça + Quarta", desc: `Demanda est.: ${aplicarArredondamento(cicloTerQuaBruto)} un`, qtd: `${pedTerQua} un` },
                { nome: "Quinta-feira", desc: `Demanda est.: ${aplicarArredondamento(cicloQuintaBruto)} un`, qtd: `${pedQuinta} un` },
                { nome: "Sexta + Sábado (Pico)", desc: `Demanda est.: ${aplicarArredondamento(cicloSexSabBruto)} un (Impulso FDS x${fdsFator.toFixed(2)})`, qtd: `${pedSexSab} un` }
            ]
        };

        htmlTabelaPedidos = `
            <table class="tabela-pedidos">
                <thead>
                    <tr>
                        <th>Ciclo (4 Blocos Otimizados)</th>
                        <th style="text-align:right;">Compra Recomendada</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosWhatsApp.linhas.map(l => `
                        <tr>
                            <td>
                                <span class="ciclo-nome">${l.nome}</span>
                                <span class="ciclo-sub">${l.desc}</span>
                            </td>
                            <td class="compra-destaque">${l.qtd}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    // CENÁRIO 2: 7 CICLOS DIÁRIOS (SEG, TER, QUA, QUI, SEX, SÁB, DOM)
    else if (AppState.modeloCiclos === "7ciclos") {
        const cicloSegundaBruto = medias[1] * multiplicador;
        const cicloTercaBruto = medias[2] * multiplicador;
        const cicloQuartaBruto = medias[3] * multiplicador;
        const cicloQuintaBruto = medias[4] * multiplicador;
        const cicloSextaBruto = medias[5] * multiplicador * fdsFator;
        const cicloSabadoBruto = medias[6] * multiplicador * fdsFator;
        const cicloDomingoBruto = medias[0] * multiplicador;

        let pedSegunda = aplicarArredondamento(cicloSegundaBruto);
        let pedTerca = aplicarArredondamento(cicloTercaBruto);
        let pedQuarta = aplicarArredondamento(cicloQuartaBruto);
        let pedQuinta = aplicarArredondamento(cicloQuintaBruto);
        let pedSexta = aplicarArredondamento(cicloSextaBruto);
        let pedSabado = aplicarArredondamento(cicloSabadoBruto);
        let pedDomingo = aplicarArredondamento(cicloDomingoBruto);

        const estoqueFisico = Math.max(0, estoque);
        if (AppState.modoAbatimentoEstoque === "segunda") {
            pedSegunda = aplicarArredondamento(Math.max(0, cicloSegundaBruto - estoqueFisico));
        } else {
            const diaSemanaHoje = (new Date()).getDay();
            if (diaSemanaHoje === 1) {
                pedSegunda = aplicarArredondamento(Math.max(0, cicloSegundaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 2) {
                pedTerca = aplicarArredondamento(Math.max(0, cicloTercaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 3) {
                pedQuarta = aplicarArredondamento(Math.max(0, cicloQuartaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 4) {
                pedQuinta = aplicarArredondamento(Math.max(0, cicloQuintaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 5) {
                pedSexta = aplicarArredondamento(Math.max(0, cicloSextaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 6) {
                pedSabado = aplicarArredondamento(Math.max(0, cicloSabadoBruto - estoqueFisico));
            } else { // 0: Domingo
                pedDomingo = aplicarArredondamento(Math.max(0, cicloDomingoBruto - estoqueFisico));
            }
        }

        dadosWhatsApp = {
            tipo: "7ciclos",
            linhas: [
                { nome: "Segunda-feira", desc: `Demanda est.: ${aplicarArredondamento(cicloSegundaBruto)} un`, qtd: `${pedSegunda} un` },
                { nome: "Terça-feira", desc: `Demanda est.: ${aplicarArredondamento(cicloTercaBruto)} un`, qtd: `${pedTerca} un` },
                { nome: "Quarta-feira", desc: `Demanda est.: ${aplicarArredondamento(cicloQuartaBruto)} un`, qtd: `${pedQuarta} un` },
                { nome: "Quinta-feira", desc: `Demanda est.: ${aplicarArredondamento(cicloQuintaBruto)} un`, qtd: `${pedQuinta} un` },
                { nome: "Sexta-feira (Pico)", desc: `Demanda est.: ${aplicarArredondamento(cicloSextaBruto)} un${fdsFator > 1.0 ? ` (Impulso FDS x${fdsFator.toFixed(2)})` : ''}`, qtd: `${pedSexta} un` },
                { nome: "Sábado (Pico)", desc: `Demanda est.: ${aplicarArredondamento(cicloSabadoBruto)} un${fdsFator > 1.0 ? ` (Impulso FDS x${fdsFator.toFixed(2)})` : ''}`, qtd: `${pedSabado} un` },
                { nome: "Domingo", desc: `Demanda est.: ${aplicarArredondamento(cicloDomingoBruto)} un`, qtd: `${pedDomingo} un` }
            ]
        };

        htmlTabelaPedidos = `
            <table class="tabela-pedidos">
                <thead>
                    <tr>
                        <th>Ciclo de Compra Diário (Seg a Dom)</th>
                        <th style="text-align:right;">Compra Recomendada</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosWhatsApp.linhas.map(l => `
                        <tr>
                            <td>
                                <span class="ciclo-nome">${l.nome}</span>
                                <span class="ciclo-sub">${l.desc}</span>
                            </td>
                            <td class="compra-destaque">${l.qtd}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    // CENÁRIO 3: 3 CICLOS (CLÁSSICO)
    else {
        const cicloSegundaBruto = (medias[1] + medias[2]) * multiplicador;
        const cicloQuartaBruto = (medias[3] + medias[4]) * multiplicador;
        const cicloSextaBruto = (medias[5] + medias[6] + medias[0]) * multiplicador * fdsFator;

        let pedSegunda = aplicarArredondamento(cicloSegundaBruto);
        let pedQuarta = aplicarArredondamento(cicloQuartaBruto);
        let pedSexta = aplicarArredondamento(cicloSextaBruto);

        const estoqueFisico = Math.max(0, estoque);
        if (AppState.modoAbatimentoEstoque === "segunda") {
            pedSegunda = aplicarArredondamento(Math.max(0, cicloSegundaBruto - estoqueFisico));
        } else {
            const diaSemanaHoje = (new Date()).getDay();
            if (diaSemanaHoje === 3 || diaSemanaHoje === 4) {
                pedQuarta = aplicarArredondamento(Math.max(0, cicloQuartaBruto - estoqueFisico));
            } else if (diaSemanaHoje === 5 || diaSemanaHoje === 6 || diaSemanaHoje === 0) {
                pedSexta = aplicarArredondamento(Math.max(0, cicloSextaBruto - estoqueFisico));
            } else {
                pedSegunda = aplicarArredondamento(Math.max(0, cicloSegundaBruto - estoqueFisico));
            }
        }

        dadosWhatsApp = {
            tipo: "3ciclos",
            linhas: [
                { nome: "Segunda-feira", desc: `Abastece Seg+Ter (Demanda: ${aplicarArredondamento(cicloSegundaBruto)} un)`, qtd: `${pedSegunda} un` },
                { nome: "Quarta-feira", desc: `Abastece Qua+Qui (Demanda: ${aplicarArredondamento(cicloQuartaBruto)} un)`, qtd: `${pedQuarta} un` },
                { nome: "Sexta-feira (FDS)", desc: `Abastece Sex+Sáb+Dom (Demanda: ${aplicarArredondamento(cicloSextaBruto)} un)`, qtd: `${pedSexta} un` }
            ]
        };

        htmlTabelaPedidos = `
            <table class="tabela-pedidos">
                <thead>
                    <tr>
                        <th>Ciclo de Abastecimento (Clássico)</th>
                        <th style="text-align:right;">Compra Recomendada</th>
                    </tr>
                </thead>
                <tbody>
                    ${dadosWhatsApp.linhas.map(l => `
                        <tr>
                            <td>
                                <span class="ciclo-nome">${l.nome}</span>
                                <span class="ciclo-sub">${l.desc}</span>
                            </td>
                            <td class="compra-destaque">${l.qtd}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    const maiorMedia = Math.max(...Object.values(medias), 1);

    // Grid de Estoque nas outras Lojas Big Mais
    let htmlOutrasLojas = '';
    const prodBanco = obterProdutoNoBanco(codigoProduto, produtoTexto || dados?.produtoDetectado);
    const temDadosBanco = AppState.bancoEstoque.ativo && !!prodBanco;

    // Se temos dados do produto no banco, preenche estoques das outras lojas imediatamente no state
    if (prodBanco && prodBanco.lojas) {
        LOJAS_CONFIG.forEach(lj => {
            if (AppState.estoquesOutrasLojas[lj.id] === undefined || AppState.estoquesOutrasLojas[lj.id] === null) {
                const estBanco = obterEstoqueLojaNoBanco(prodBanco.lojas, lj);
                if (estBanco !== undefined) {
                    AppState.estoquesOutrasLojas[lj.id] = estBanco;
                }
            }
        });
    }

    const deveExibirGridLojas = (AppState.estoquesOutrasLojas && Object.keys(AppState.estoquesOutrasLojas).length > 0) || temDadosBanco;

    if (deveExibirGridLojas) {
        const itensLojas = LOJAS_CONFIG.map(lj => {
            const isAtiva = lj.id === lojaSelecionadaId;
            let qtd = AppState.estoquesOutrasLojas[lj.id];
            if (qtd === undefined && prodBanco && prodBanco.lojas) {
                qtd = obterEstoqueLojaNoBanco(prodBanco.lojas, lj);
                if (qtd !== undefined) AppState.estoquesOutrasLojas[lj.id] = qtd;
            }
            if (qtd === undefined && isAtiva && AppState.estoqueTotal !== undefined) {
                qtd = AppState.estoqueTotal;
            }

            const valExibicao = qtd !== undefined ? `${qtd} un` : '-';
            const isZero = qtd === 0;
            const isNegativo = typeof qtd === 'number' && qtd < 0;
            const classeTag = isAtiva 
                ? 'tag-loja ativa' 
                : (isNegativo ? 'tag-loja negativo' : (isZero ? 'tag-loja zerado' : 'tag-loja'));
            const sigla = lj.id.split(' ')[1] || lj.cod;
            return `
                <div class="${classeTag}" title="${lj.id} - ${lj.nome}">
                    <span class="lj-cod">${sigla}</span>
                    <span class="lj-val">${valExibicao}</span>
                </div>
            `;
        }).join('');

        htmlOutrasLojas = `
            <div class="estoque-lojas-box">
                <div class="estoque-lojas-header">
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span>Estoque nas Lojas Big Mais</span>
                        ${temDadosBanco ? `<span class="badge-origem-estoque" title="Estoque preenchido do Banco de Dados (${AppState.bancoEstoque.ultimaAtualizacao || 'Recente'})">🗄️ Banco</span>` : ''}
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${temDadosBanco ? `
                        <button type="button" id="btnPuxarEstoqueBanco" class="btn-mini-acao" title="Recarregar estoque do Banco de Dados para todas as lojas">
                            🔄 Puxar do Banco
                        </button>` : ''}
                        <span style="color:var(--primary); font-weight:700;">${lojaObj?.nome || ''}</span>
                    </div>
                </div>
                <div class="estoque-lojas-grid">
                    ${itensLojas}
                </div>
            </div>
        `;
    }

    // MÓDULO 3: Alerta de Queima de Estoque / Lote PEPS
    let htmlAlertaQueima = '';
    if (analise.alertaQueima) {
        htmlAlertaQueima = `
            <div class="alerta-queima-box">
                <strong>🔥 Alerta de Queima de Lote (PEPS):</strong>
                O estoque de <b>${analise.alertaQueima.estoque} un</b> tem cobertura de <b>${analise.alertaQueima.diasCobertura} dias</b> (excede o shelf-life de ${analise.alertaQueima.shelfLife}d). 
                Previsão de <b>~${analise.alertaQueima.sobraProvavel} un</b> em risco de descarte. 
                <br><b>Ação Recomendada:</b> Ativar <b>preço promocional de escoamento (${analise.alertaQueima.sugestaoDesconto})</b> no final da tarde para liquidar o lote e preservar margem!
            </div>
        `;
    }

    // Alerta de Remanejamento entre Lojas
    let htmlRemanejamento = '';
    if (analise.remanejamentoSugerido) {
        htmlRemanejamento = `
            <div class="alerta-remanejamento">
                <strong>💡 Oportunidade de Remanejamento:</strong>
                A <b>${analise.remanejamentoSugerido.lojaOrigem}</b> possui <b>${analise.remanejamentoSugerido.estoqueOrigem} un</b> em estoque. 
                Considere transferir <b>~${analise.remanejamentoSugerido.qtdSugerida} un</b> para evitar sobra e reduzir compra externa!
            </div>
        `;
    }

    // Badge visual da Curva ABC
    const classeBadgeABC = analise.classeABC === "A+" ? "badge-abc classe-a" : (analise.classeABC === "C" ? "badge-abc classe-c" : "badge-abc classe-b");

    // Card do Raio-X da Tomada de Decisão (Expandido com Curva ABC, Sazonalidade Fina e Feedback Loop)
    const htmlRaioX = `
        <div class="raio-x-container">
            <div class="raio-x-header" id="btnToggleRaioX">
                <span>🧠 Raio-X da Tomada de Decisão</span>
                <span id="setaRaioX">${AppState.raioXAberto ? '▲ Fechar' : '▼ Ver Fatores'}</span>
            </div>
            <div class="raio-x-content ${AppState.raioXAberto ? 'open' : ''}" id="corpoRaioX">
                <div class="raio-x-row">
                    <span class="raio-x-label">📊 Curva ABC & Margem:</span>
                    <span class="raio-x-val">${analise.descCurvaABC} (x${analise.fatorCurvaABC})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">📅 Impulso Fim de Semana (Sex+Sáb):</span>
                    <span class="raio-x-val" style="color:#0284c7;">x${analise.impulsoFimDeSemana.toFixed(2)} (Pico Semanal)</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">☀️ Clima Previsto (Gov. Valadares):</span>
                    <span class="raio-x-val">${clima.temperatura}°C (x${analise.fatorClima})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">📈 Tendência Recente (Últimos 14d):</span>
                    <span class="raio-x-val">${analise.descTendencia} (x${analise.fatorTendencia})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">💳 Fase do Mês (Salário / Pagto):</span>
                    <span class="raio-x-val">${analise.descFaseMes} (x${analise.fatorFaseMes})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">🥬 Quebra Técnica & Perecibilidade:</span>
                    <span class="raio-x-val">${analise.descQuebra} (x${analise.fatorQuebra})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">🤖 Feedback Loop (Auto-Ajuste EMA):</span>
                    <span class="raio-x-val" style="color:#8b5cf6;">x${analise.fatorFeedbackLoop} (${analise.descFeedbackLoop})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">🏛️ Perfil Aprendido da Loja (${lojaSelecionadaId}):</span>
                    <span class="raio-x-val" style="color:#0f766e;">x${analise.fatorPerfilLoja.toFixed(2)} (${analise.descPerfilLoja})</span>
                </div>
                <div class="raio-x-row">
                    <span class="raio-x-label">🛡️ Margem Extra Manual:</span>
                    <span class="raio-x-val">+${AppState.margemSeguranca}%</span>
                </div>
                ${analise.totalRupturasDetectadas > 0 ? `
                <div class="raio-x-row">
                    <span class="raio-x-label">🛡️ Rupturas Saneadas (Venda 0 expurgada):</span>
                    <span class="raio-x-val" style="color:#059669;">${analise.totalRupturasDetectadas} dia(s) corrigido(s)</span>
                </div>` : ''}
                <div class="raio-x-row">
                    <span class="raio-x-label">🎯 Multiplicador Composto da Compra:</span>
                    <span class="raio-x-val destaque">x${analise.multiplicadorComposto}</span>
                </div>
            </div>
        </div>
    `;

    // (Perfis de Lojas e Logs de Auditoria são renderizados via gerarHtmlAbaConfig)

    // Card de Auditoria e Validação de Sincronismo Dext (Loja, Código e Descrição)
    let htmlCardSincronismo = '';
    if (AppState.sincronismoInfo) {
        const sinc = AppState.sincronismoInfo;
        const ehOk = sinc.status === "sucesso";
        const classeCard = ehOk ? "sinc-ok" : (sinc.status === "alerta" ? "sinc-alerta" : "sinc-erro");
        const textoBadge = ehOk ? "🟢 Sincronizado com Dext" : (sinc.status === "alerta" ? "⚠️ Sincronismo Parcial" : "🔴 Divergência de Sincronismo");

        htmlCardSincronismo = `
            <div class="sincronismo-card ${classeCard}">
                <div class="sinc-card-header">
                    <span class="sinc-badge-status">${textoBadge}</span>
                    <span class="sinc-card-time">${sinc.timestamp ? 'Checado às ' + sinc.timestamp : ''}</span>
                </div>
                <div class="sinc-card-grid">
                    <div class="sinc-card-item ${sinc.lojaOk ? 'item-ok' : 'item-erro'}" title="${sinc.lojaDext || sinc.lojaEsperada}">
                        <span class="sinc-rotulo">Loja</span>
                        <span class="sinc-valor">${sinc.lojaDext || sinc.lojaEsperada}</span>
                        <span class="sinc-check">${sinc.lojaOk ? '✓ Loja OK' : '✗ Diverge'}</span>
                    </div>
                    <div class="sinc-card-item ${sinc.codigoOk ? 'item-ok' : 'item-erro'}">
                        <span class="sinc-rotulo">Código</span>
                        <span class="sinc-valor">${sinc.codigoDext || sinc.codigoEsperado}</span>
                        <span class="sinc-check">${sinc.codigoOk ? '✓ Cód OK' : '✗ Diverge'}</span>
                    </div>
                    <div class="sinc-card-item ${sinc.descricaoOk ? 'item-ok' : 'item-erro'}" title="${sinc.descricaoDext || sinc.descricaoEsperada}">
                        <span class="sinc-rotulo">Descrição</span>
                        <span class="sinc-valor">${sinc.descricaoDext || sinc.descricaoEsperada}</span>
                        <span class="sinc-check">${sinc.descricaoOk ? '✓ Desc OK' : '✗ Diverge'}</span>
                    </div>
                </div>
                ${!ehOk && sinc.motivoDivergencia ? `
                    <div class="sinc-alerta-msg">
                        <b>Aviso de Auditoria:</b> ${sinc.motivoDivergencia}
                        <button id="btnCorrigirSincronismo" class="btn btn-primary" style="margin-top:6px; width:100%; font-size:10px; padding:4px 6px;">
                            🚀 Ressincronizar Loja & Produto no Dext Agora
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    const htmlConteudo = `
        <!-- ABA 1: SUGESTÕES -->
        <div id="tab-sugestoes" class="tab-content ${AppState.abaAtiva === 'tab-sugestoes' ? 'active' : ''}">
            ${htmlCardSincronismo}
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                    <span class="${analise.classeScore}">${analise.textoScore}</span>
                    <span class="${classeBadgeABC}">${analise.classeABC}</span>
                    ${analise.perfilLoja ? `<span class="badge-perfil-loja" title="${analise.perfilLoja.desc}">🏛️ ${analise.perfilLoja.arquetipo}</span>` : ''}
                    ${analise.alertaQueima ? `<span class="badge-queima">🔥 Queima</span>` : ''}
                </div>
                <span style="font-size:10px; color:var(--primary); font-weight:700;">${lojaNomeFormatado}</span>
            </div>

            <div style="font-size:11px; font-weight:700; color:#1e293b; margin-bottom:8px; line-height:1.3;">
                ${produtoTexto}
            </div>

            <!-- GRID COM OS 4 PILARES DA DECISÃO -->
            <div class="metrics-grid">
                <div class="metric-card clima">
                    <span class="metric-label">Clima Previsto</span>
                    <span class="metric-value">${clima.temperatura}°C</span>
                    <div class="metric-sub">${clima.classificacao} (x${analise.fatorClima})</div>
                </div>
                <div class="metric-card estoque">
                    <span class="metric-label">Estoque em Loja</span>
                    <span class="metric-value" style="${estoque < 0 ? 'color:#dc2626; font-weight:800;' : ''}">${estoque} un</span>
                    <div class="metric-sub" style="${estoque < 0 ? 'color:#dc2626;' : ''}">${estoque < 0 ? 'Saldo Negativo (Ruptura)' : `Cob.: ${analise.diasCobertura}d | Abat.: ${AppState.modoAbatimentoEstoque === 'segunda' ? '1º Ciclo' : 'Ciclo Atual'}`}</div>
                </div>
                <div class="metric-card tendencia">
                    <span class="metric-label">Tendência Recente</span>
                    <span class="metric-value" style="font-size:13px;">${analise.descTendencia}</span>
                    <div class="metric-sub">Ponderação: x${analise.fatorTendencia}</div>
                </div>
                <div class="metric-card fase-mes">
                    <span class="metric-label">Fase do Mês</span>
                    <span class="metric-value" style="font-size:13px;">${analise.descFaseMes}</span>
                    <div class="metric-sub">Sazonalidade: x${analise.fatorFaseMes}</div>
                </div>
            </div>

            ${htmlAlertaQueima}

            ${htmlRemanejamento}

            ${htmlRaioX}

            ${htmlOutrasLojas}

            ${htmlTabelaPedidos}

            <button id="btnCopiarPedido" class="btn-copiar">
                <span>📋</span> Copiar Pedido Formatado (WhatsApp)
            </button>
        </div>

        <!-- ABA 2: MÉDIAS DETALHADAS -->
        <div id="tab-medias" class="tab-content ${AppState.abaAtiva === 'tab-medias' ? 'active' : ''}">
            <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:6px;">
                Média Real de Vendas por Dia da Semana (Com Saneamento)
            </div>
            <div class="dias-lista">
                ${[0, 1, 2, 3, 4, 5, 6].map(i => {
                    const diaNome = stats[i]?.nome || '';
                    const media = medias[i] || 0;
                    const ocs = stats[i]?.ocorrencias || 0;
                    const pct = Math.round((media / maiorMedia) * 100);
                    const mediaExibicao = aplicarArredondamento(media);
                    return `
                        <div class="dia-row">
                            <div class="dia-info">
                                <span class="dia-nome">${diaNome}</span>
                                <span class="dia-badge">${ocs}d</span>
                            </div>
                            <div class="dia-bar-container">
                                <div class="dia-bar-fill" style="width: ${pct}%;"></div>
                            </div>
                            <div class="dia-media">${mediaExibicao}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- ABA 3: AJUSTES E CONFIGURAÇÕES -->
        <div id="tab-config" class="tab-content ${AppState.abaAtiva === 'tab-config' ? 'active' : ''}">
            ${gerarHtmlAbaConfig(lojaSelecionadaId)}
        </div>
    `;

    const divResultado = document.getElementById("resultado");
    divResultado.innerHTML = htmlConteudo;
    chrome.storage.local.set({ resultadoSalvo: htmlConteudo });

    reativarBotoesDoResultado();
}

function reativarBotoesDoResultado() {
    configurarEventosCentralAprendizado();

    // Toggle do Raio-X
    const btnToggleRaioX = document.getElementById("btnToggleRaioX");
    if (btnToggleRaioX) {
        btnToggleRaioX.addEventListener("click", () => {
            AppState.raioXAberto = !AppState.raioXAberto;
            const corpo = document.getElementById("corpoRaioX");
            const seta = document.getElementById("setaRaioX");
            if (corpo) corpo.classList.toggle("open", AppState.raioXAberto);
            if (seta) seta.textContent = AppState.raioXAberto ? '▲ Fechar' : '▼ Ver Fatores';
        });
    }

    // Ação para ressincronizar diretamente do alerta de auditoria
    const btnCorrigirSinc = document.getElementById("btnCorrigirSincronismo");
    if (btnCorrigirSinc) {
        btnCorrigirSinc.addEventListener("click", () => {
            salvarEstadoFormulario();
            executarAutomacaoDext();
        });
    }

    // Reset de logs de aprendizado
    const btnReset = document.getElementById("btnLimparLogsAprendizado");
    if (btnReset) {
        btnReset.addEventListener("click", () => {
            AppState.historicoPredicoes = {};
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Histórico de aprendizado resetado!");
        });
    }

    const btnCopiar = document.getElementById("btnCopiarPedido");
    if (btnCopiar) {
        btnCopiar.addEventListener("click", () => {
            const loja = document.getElementById("selectLoja").value;
            const lojaObj = obterLojaConfig(loja);
            const lojaNomeFormatado = lojaObj ? `${lojaObj.id} - ${lojaObj.nome}` : loja;

            const selectProd = document.getElementById("selectProduto");
            const prod = selectProd.options[selectProd.selectedIndex]?.text || "FLV";
            const clima = AppState.clima;
            const estoque = AppState.estoqueTotal;

            const linhas = document.querySelectorAll(".tabela-pedidos tbody tr");

            let textoCiclosWhatsApp = "";
            if (AppState.modeloCiclos === "4ciclos") {
                const domSeg = linhas[0]?.querySelector(".compra-destaque")?.innerText || "";
                const terQua = linhas[1]?.querySelector(".compra-destaque")?.innerText || "";
                const quinta = linhas[2]?.querySelector(".compra-destaque")?.innerText || "";
                const sexSab = linhas[3]?.querySelector(".compra-destaque")?.innerText || "";

                textoCiclosWhatsApp = `
📅 *Domingo + Segunda:* ${domSeg}
📅 *Terça + Quarta:* ${terQua}
📅 *Quinta-feira:* ${quinta}
📅 *Sexta + Sábado:* ${sexSab}`;
            } else if (AppState.modeloCiclos === "7ciclos") {
                const seg = linhas[0]?.querySelector(".compra-destaque")?.innerText || "";
                const ter = linhas[1]?.querySelector(".compra-destaque")?.innerText || "";
                const qua = linhas[2]?.querySelector(".compra-destaque")?.innerText || "";
                const qui = linhas[3]?.querySelector(".compra-destaque")?.innerText || "";
                const sex = linhas[4]?.querySelector(".compra-destaque")?.innerText || "";
                const sab = linhas[5]?.querySelector(".compra-destaque")?.innerText || "";
                const dom = linhas[6]?.querySelector(".compra-destaque")?.innerText || "";

                textoCiclosWhatsApp = `
📅 *Segunda-feira:* ${seg}
📅 *Terça-feira:* ${ter}
📅 *Quarta-feira:* ${qua}
📅 *Quinta-feira:* ${qui}
📅 *Sexta-feira:* ${sex}
📅 *Sábado:* ${sab}
📅 *Domingo:* ${dom}`;
            } else {
                const seg = linhas[0]?.querySelector(".compra-destaque")?.innerText || "";
                const qua = linhas[1]?.querySelector(".compra-destaque")?.innerText || "";
                const sex = linhas[2]?.querySelector(".compra-destaque")?.innerText || "";

                textoCiclosWhatsApp = `
📅 *Segunda (Seg+Ter):* ${seg}
📅 *Quarta (Qua+Qui):* ${qua}
📅 *Sexta (Sex+Sáb+Dom):* ${sex}`;
            }

            const textoWhatsApp =
                `🛒 *SUGESTÃO DE PEDIDO FLV*
🏬 *Loja:* ${lojaNomeFormatado}
🌿 *Produto:* ${prod}
📦 *Estoque Atual:* ${estoque} un
☀️ *Clima:* ${clima.temperatura}°C (${clima.classificacao} - Fator ${clima.fator})
-----------------------------------${textoCiclosWhatsApp}
-----------------------------------
_Gerado via Motor de Pedidos FLV PRO_`;

            navigator.clipboard.writeText(textoWhatsApp).then(() => {
                exibirToast("Pedido copiado para o WhatsApp!");
            }).catch(() => {
                exibirToast("Erro ao copiar.");
            });
        });
    }

    const selectModeloCiclos = document.getElementById("selectModeloCiclos");
    if (selectModeloCiclos) {
        selectModeloCiclos.addEventListener("change", (e) => {
            AppState.modeloCiclos = e.target.value;
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast(`Modelo de ciclos atualizado!`);
        });
    }

    const selectPerfilLoja = document.getElementById("selectPerfilLoja");
    if (selectPerfilLoja) {
        selectPerfilLoja.addEventListener("change", (e) => {
            AppState.usarPerfilLoja = e.target.value === "sim";
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast(`Aprendizado por loja ${AppState.usarPerfilLoja ? 'ativado' : 'desativado'}!`);
        });
    }

    const btnRecalibrarLoja = document.getElementById("btnRecalibrarLojaAtual");
    if (btnRecalibrarLoja) {
        btnRecalibrarLoja.addEventListener("click", () => {
            const loja = document.getElementById("selectLoja").value;
            const lojaObj = obterLojaConfig(loja);
            const idPadrao = lojaObj ? lojaObj.id : loja;
            if (AppState.perfisLojasAprendizado && PERFIS_PADRAO_LOJAS[idPadrao]) {
                AppState.perfisLojasAprendizado[idPadrao] = JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS[idPadrao]));
                AppState.perfisLojasAprendizado[idPadrao].amostras = 0;
            }
            salvarEstadoFormulario();
            recalcularTelaAtual();
            exibirToast(`Perfil da loja ${idPadrao} pronto para recalibrar!`);
        });
    }

    const btnResetarPerfis = document.getElementById("btnResetarPerfisLojas");
    if (btnResetarPerfis) {
        btnResetarPerfis.addEventListener("click", () => {
            AppState.perfisLojasAprendizado = JSON.parse(JSON.stringify(PERFIS_PADRAO_LOJAS));
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Perfis de todas as 6 lojas resetados para o padrão!");
        });
    }

    const selectCurvaABC = document.getElementById("selectCurvaABC");
    if (selectCurvaABC) {
        selectCurvaABC.addEventListener("change", (e) => {
            AppState.modoCurvaABC = e.target.value;
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Configuração da Curva ABC atualizada!");
        });
    }

    const selectSazonalidadeFina = document.getElementById("selectSazonalidadeFina");
    if (selectSazonalidadeFina) {
        selectSazonalidadeFina.addEventListener("change", (e) => {
            AppState.usarSazonalidadeFina = e.target.value === "sim";
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Efeito Fim de Semana atualizado!");
        });
    }

    const selectAlertaQueima = document.getElementById("selectAlertaQueima");
    if (selectAlertaQueima) {
        selectAlertaQueima.addEventListener("change", (e) => {
            AppState.usarAlertaQueima = e.target.value === "sim";
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Alerta preditivo de queima atualizado!");
        });
    }

    const selectFeedbackLoop = document.getElementById("selectFeedbackLoop");
    if (selectFeedbackLoop) {
        selectFeedbackLoop.addEventListener("change", (e) => {
            AppState.usarFeedbackLoop = e.target.value === "sim";
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Feedback Loop de auto-correção atualizado!");
        });
    }

    const selectTendencia = document.getElementById("selectTendencia");
    if (selectTendencia) {
        selectTendencia.addEventListener("change", (e) => {
            AppState.usarTendencia = e.target.value === "sim";
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast(`Ponderação de tendência ${AppState.usarTendencia ? 'ativada' : 'desativada'}!`);
        });
    }

    const selectFaseMes = document.getElementById("selectFaseMes");
    if (selectFaseMes) {
        selectFaseMes.addEventListener("change", (e) => {
            AppState.modoFaseMes = e.target.value;
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Ajuste de fase do mês atualizado!");
        });
    }

    const selectQuebraTecnica = document.getElementById("selectQuebraTecnica");
    if (selectQuebraTecnica) {
        selectQuebraTecnica.addEventListener("change", (e) => {
            AppState.modoQuebraTecnica = e.target.value;
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Compensação de quebra atualizada!");
        });
    }

    const selectFiltroRuptura = document.getElementById("selectFiltroRuptura");
    if (selectFiltroRuptura) {
        selectFiltroRuptura.addEventListener("change", (e) => {
            AppState.usarFiltroRuptura = e.target.value === "sim";
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast(`Filtro de rupturas ${AppState.usarFiltroRuptura ? 'ativado' : 'desativado'}!`);
        });
    }

    const selectArredondamento = document.getElementById("selectArredondamento");
    if (selectArredondamento) {
        selectArredondamento.addEventListener("change", (e) => {
            AppState.tipoArredondamento = e.target.value;
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Regra de arredondamento atualizada!");
        });
    }

    const selectMargem = document.getElementById("selectMargemExtra");
    if (selectMargem) {
        selectMargem.addEventListener("change", (e) => {
            AppState.margemSeguranca = Number(e.target.value);
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast(`Margem ajustada para +${AppState.margemSeguranca}%`);
        });
    }

    const selectAbatimento = document.getElementById("selectAbatimento");
    if (selectAbatimento) {
        selectAbatimento.addEventListener("change", (e) => {
            AppState.modoAbatimentoEstoque = e.target.value;
            salvarEstadoFormulario();
            renderizarPainelResultados();
            exibirToast("Regra de abatimento atualizada!");
        });
    }
}

// ============================================================================
// Scripts Injetados no Contexto da Página Dext (world: 'MAIN')
// ============================================================================

function extrairDadosGraficoDext() {
    // Silencia o alerta intrusivo do DataTables na página Dext
    try {
        if (window.$ && window.$.fn && window.$.fn.dataTable) {
            window.$.fn.dataTable.ext.errMode = 'none';
        }
        if (window.alert && !window.__alertSilenciadoDext) {
            window.__alertSilenciadoDext = true;
            const _origAlert = window.alert;
            window.alert = function(msg) {
                if (typeof msg === 'string' && (msg.includes('DataTables warning') || msg.includes('Cannot reinitialise DataTable'))) {
                    console.warn('[Dext - Alerta DataTables Silenciado]:', msg);
                    return;
                }
                return _origAlert.apply(this, arguments);
            };
        }
    } catch (e) {}

    console.log("[Motor Pedidos FLV] Capturando gráfico de vendas no Dext...");

    let labels = null;
    let data = null;

    // 1. Procura instâncias Chart.js no canvas da página
    const canvas = document.getElementById('canvasvendaprojecao') || document.querySelector('canvas');
    if (window.Chart) {
        let chartInstance = null;

        if (typeof Chart.getChart === 'function' && canvas) {
            chartInstance = Chart.getChart(canvas);
        }

        if (!chartInstance && Chart.instances) {
            let instances = [];
            if (Chart.instances instanceof Map) {
                instances = Array.from(Chart.instances.values());
            } else if (typeof Chart.instances === 'object') {
                instances = Object.values(Chart.instances);
            }

            chartInstance = instances.find(c => (c && c.chart && c.chart.canvas === canvas) || (c && c.canvas === canvas));
            if (!chartInstance && instances.length > 0) {
                chartInstance = instances[0];
            }
        }

        if (chartInstance && chartInstance.data) {
            labels = chartInstance.data.labels;
            if (chartInstance.data.datasets && chartInstance.data.datasets[0]) {
                data = chartInstance.data.datasets[0].data;
            }
        }
    }

    // 2. Suporte a ECharts caso a tela use echarts.min.js
    if ((!labels || !data) && window.echarts) {
        const echartsDoms = document.querySelectorAll('div[_echarts_instance_], div[id*="grafico"], div[id*="chart"]');
        for (const dom of echartsDoms) {
            try {
                const inst = echarts.getInstanceByDom(dom);
                if (inst) {
                    const opt = inst.getOption();
                    if (opt && opt.xAxis && opt.series && opt.series[0]) {
                        labels = opt.xAxis[0]?.data || opt.xAxis?.data;
                        data = opt.series[0].data;
                        if (labels && data) break;
                    }
                }
            } catch (e) {}
        }
    }

    if (!labels || !data) {
        return { 
            sucesso: false, 
            motivo: "Nenhum gráfico de vendas com dados foi detectado na tela. Gere a consulta no Dext primeiro." 
        };
    }

    const diasNomes = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    let estatisticasDias = {};
    for (let i = 0; i <= 6; i++) {
        estatisticasDias[i] = { nome: diasNomes[i], soma: 0, ocorrencias: 0 };
    }

    let todosPontos = [];

    labels.forEach((lbl, i) => {
        let dataStr = String(lbl).trim();
        let partes = dataStr.split('/');
        if (partes.length === 3) {
            let dia = parseInt(partes[0], 10);
            let mes = parseInt(partes[1], 10) - 1;
            let ano = parseInt(partes[2], 10);
            if (ano < 100) ano += 2000;

            let dataObj = new Date(ano, mes, dia, 12, 0, 0);

            if (!isNaN(dataObj.getTime())) {
                let diaSemana = dataObj.getDay();
                let rawVal = data[i];

                let valorVenda = 0;
                if (typeof rawVal === 'string') {
                    let limpo = rawVal.replace(/\./g, '').replace(',', '.');
                    valorVenda = parseFloat(limpo) || 0;
                } else if (typeof rawVal === 'number') {
                    valorVenda = rawVal;
                }

                if (valorVenda > 100000) valorVenda = 0;

                todosPontos.push({
                    dataStr,
                    dataObj,
                    diaSemana,
                    valor: valorVenda
                });

                estatisticasDias[diaSemana].soma += valorVenda;
                estatisticasDias[diaSemana].ocorrencias += 1;
            }
        }
    });

    let mediasDias = {};
    let totalOcorrencias = 0;
    for (let i = 0; i <= 6; i++) {
        let item = estatisticasDias[i];
        let media = item.ocorrencias > 0 ? (item.soma / item.ocorrencias) : 0;
        item.media = media;
        mediasDias[i] = media;
        totalOcorrencias += item.ocorrencias;
    }

    let produtoDetectado = null;
    const elDescGraf = document.getElementById("iddescricaoproduto");
    if (elDescGraf && elDescGraf.innerText) {
        const m = elDescGraf.innerText.match(/\b(\d{3,6})\b/);
        if (m) produtoDetectado = m[1];
    }
    if (!produtoDetectado) {
        const elCod = document.getElementById("idcod_produto");
        if (elCod && elCod.value) produtoDetectado = elCod.value.trim();
    }

    let lojaDetectada = null;
    const elLoja = document.getElementById("idcod_local_abastecimento");
    if (elLoja && elLoja.value) lojaDetectada = elLoja.value;

    return {
        sucesso: true,
        canvasEncontrado: true,
        mediasDias,
        estatisticasDias,
        todosPontos,
        totalOcorrencias,
        produtoDetectado,
        lojaDetectada
    };
}

async function preencherFiltrosDextCompleto(lojaDesejada, codigoProduto, dataInicio, dataFinal) {
    // Silencia o alerta do DataTables antes de qualquer interação no Dext
    try {
        if (window.$ && window.$.fn && window.$.fn.dataTable) {
            window.$.fn.dataTable.ext.errMode = 'none';
        }
        if (window.alert && !window.__alertSilenciadoDext) {
            window.__alertSilenciadoDext = true;
            const _origAlert = window.alert;
            window.alert = function(msg) {
                if (typeof msg === 'string' && (msg.includes('DataTables warning') || msg.includes('Cannot reinitialise DataTable'))) {
                    console.warn('[Dext - Alerta DataTables Silenciado]:', msg);
                    return;
                }
                return _origAlert.apply(this, arguments);
            };
        }
    } catch (e) {}

    const mapaLojas = { 
        "01 PER": "1", 
        "02 TRE": "2", 
        "04 LAG": "4", 
        "05 ALT": "5", 
        "08 ISA": "8", 
        "09 SPD": "9" 
    };

    const codLojaNumerico = mapaLojas[lojaDesejada] || "2";

    // 1. Preencher Datas
    function preencherInputData(inputEl, dataIso) {
        if (!inputEl || !dataIso) return;
        const partes = dataIso.split('-');
        if (partes.length === 3) {
            const valorFinal = inputEl.type === 'date' ? dataIso : `${partes[2]}/${partes[1]}/${partes[0]}`;
            inputEl.value = valorFinal;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    const inputInicio = document.getElementById("iddat_inicio");
    const inputFinal = document.getElementById("iddat_final");
    preencherInputData(inputInicio, dataInicio);
    preencherInputData(inputFinal, dataFinal);

    // 2. Preencher Loja
    function normalizarLoja(texto) {
        return (texto || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, " ").trim();
    }

    function identificarLojaFiltro(texto) {
        if (!texto) return null;
        const norm = normalizarLoja(texto);
        if (/\blagoa\s+santa\b|\blagoa\b|\b0?4\s*[-–]\s*lag\b|\b04\s+lag\b/i.test(norm)) return "04 LAG";
        if (/\bjardim\s+perola\b|\bhiper\s+perola\b|\bperola\b|\b0?1\s*[-–]\s*per\b|\b01\s+per\b/i.test(norm)) return "01 PER";
        if (/\btreze\s+de\s+maio\b|\b13\s+de\s+maio\b|\btreze\b|\btrevo\b|\b0?2\s*[-–]\s*tre\b|\b02\s+tre\b/i.test(norm)) return "02 TRE";
        if (/\baltinopolis\b|\baltin\w*\b|\b0?5\s*[-–]\s*alt\b|\b05\s+alt\b/i.test(norm)) return "05 ALT";
        if (/\bvila\s+isa\b|\bilha(?:\s+dos\s+araujos)?\b|\b0?8\s*[-–]\s*isa\b|\b08\s+isa\b/i.test(norm)) return "08 ISA";
        if (/\bsao\s+paulo\b|\bsao\s+pedro\b|\b0?9\s*[-–]\s*spd\b|\b09\s+spd\b/i.test(norm)) return "09 SPD";
        return null;
    }

    const selectsPossiveis = [
        document.getElementById("idcod_local_abastecimento"),
        document.getElementById("idempresa"),
        document.getElementById("idcod_empresa"),
        document.getElementById("idlocal"),
        document.querySelector('select[name="idcod_local_abastecimento"]'),
        document.querySelector('select[name*="empresa"]'),
        document.querySelector('select[name*="local"]')
    ].filter(Boolean);

    for (const selectLoja of selectsPossiveis) {
        let selecionou = false;
        for (const opt of Array.from(selectLoja.options)) {
            const txtOpt = opt.text.trim();
            const valOpt = opt.value.trim();
            const ljIdent = identificarLojaFiltro(txtOpt);
            if (valOpt === codLojaNumerico || valOpt === `0${codLojaNumerico}` || valOpt === lojaDesejada || ljIdent === lojaDesejada) {
                selectLoja.value = opt.value;
                selecionou = true;
                break;
            }
        }
        if (!selecionou) {
            selectLoja.value = codLojaNumerico;
        }

        selectLoja.dispatchEvent(new Event('change', { bubbles: true }));

        if (window.$ && typeof window.$(selectLoja).selectpicker === 'function') {
            try {
                window.$(selectLoja).selectpicker('val', selectLoja.value);
                window.$(selectLoja).selectpicker('refresh');
            } catch (e) {}
        }
    }

    // 3. Verificar se o produto já está selecionado e ativo em #iddescricaoproduto
    const elDescAtual = document.getElementById("iddescricaoproduto");
    let produtoJaAtivo = false;
    if (elDescAtual && elDescAtual.innerText && elDescAtual.innerText.includes(codigoProduto)) {
        produtoJaAtivo = true;
    }

    // 4. Se o produto não for o desejado, acionar a busca e seleção real no Dext
    if (!produtoJaAtivo) {
        // Clica no botão "Cod. Produto" no Dext
        const botoes = Array.from(document.querySelectorAll('button, input[type="button"], a, input[type="submit"]'));
        const btnCodProd = botoes.find(b => {
            const txt = (b.innerText || b.value || b.getAttribute('title') || '').trim();
            return /c[oó]d\.?\s*prod/i.test(txt);
        });

        // Localiza todos os campos de texto candidatos para busca de produto (incluindo o visível com placeholder "Pesquisa Produto")
        const inputsCandidatos = [];
        if (btnCodProd && btnCodProd.parentElement) {
            let parent = btnCodProd.parentElement;
            for (let nivel = 0; nivel < 4 && parent; nivel++) {
                const inps = Array.from(parent.querySelectorAll('input[type="text"], input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'));
                inps.forEach(i => { if (!inputsCandidatos.includes(i)) inputsCandidatos.push(i); });
                parent = parent.parentElement;
            }
        }
        const outrosInputs = Array.from(document.querySelectorAll('input')).filter(inp => {
            if (inp.type === 'hidden' || inp.type === 'button' || inp.type === 'submit') return false;
            const p = (inp.placeholder || '').toLowerCase();
            const id = (inp.id || '').toLowerCase();
            const n = (inp.name || '').toLowerCase();
            return p.includes('pesquisa') || p.includes('produto') || id.includes('filtro') || id.includes('busca') || n.includes('produto');
        });
        outrosInputs.forEach(i => { if (!inputsCandidatos.includes(i)) inputsCandidatos.push(i); });

        // Preenche os campos de busca com o código desejado
        for (const inp of inputsCandidatos) {
            inp.focus();
            inp.value = codigoProduto;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            if (window.$) {
                try { window.$(inp).val(codigoProduto).trigger('input').trigger('change'); } catch (e) {}
            }
        }

        if (btnCodProd) {
            console.log("[Motor FLV] Clicando no botão Cod. Produto:", btnCodProd);
            btnCodProd.click();
        } else {
            for (const inp of inputsCandidatos) {
                ['keydown', 'keypress', 'keyup'].forEach(eventType => {
                    inp.dispatchEvent(new KeyboardEvent(eventType, {
                        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                    }));
                });
            }
        }

        // Executa busca via Jaxon com o código do produto
        if (typeof window.jaxon_fn_buscaprodutolist === 'function') {
            try { window.jaxon_fn_buscaprodutolist(codigoProduto, 'idcod_produto', 'COD'); } catch (e) {}
        }

        // Aguarda a seleção do produto na listagem de busca
        for (let tentativa = 0; tentativa < 20; tentativa++) {
            await new Promise(r => setTimeout(r, 200));

            // Procura linhas da listagem de busca
            const trs = Array.from(document.querySelectorAll('tr[ondblclick], .modal tr, .ui-dialog tr, table tr, tbody tr'));
            const trMatch = trs.find(t => {
                const txt = t.innerText || t.textContent || '';
                return txt.includes(codigoProduto) && !t.closest('thead');
            });

            if (trMatch) {
                console.log("[Motor FLV] Linha do produto encontrada na busca:", trMatch);
                if (typeof trMatch.ondblclick === 'function') {
                    try { trMatch.ondblclick(); } catch (e) {}
                }
                const ondbl = trMatch.getAttribute('ondblclick') || '';
                const match = ondbl.match(/(?:jaxon_fn_setbuscaproduto|setbuscaproduto)\s*\(\s*['"]?([a-zA-Z0-9_-]+)['"]?(?:\s*,\s*['"]([^'"]+)['"])?/);
                if (match && typeof window.jaxon_fn_setbuscaproduto === 'function') {
                    window.jaxon_fn_setbuscaproduto(match[1], match[2] || 'idcod_produto');
                } else {
                    trMatch.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
                    trMatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                }

                const btnNaLinha = trMatch.querySelector('button, input[type="button"], a');
                if (btnNaLinha) btnNaLinha.click();

                await new Promise(r => setTimeout(r, 200));
                break;
            }
        }

        // Fecha eventual modal de busca que ainda esteja aberto
        const btnFechar = document.querySelector('.modal.in [data-dismiss="modal"], .modal.show [data-dismiss="modal"], .modal.in .close, .modal.show .close, button.ui-dialog-titlebar-close, .modal [data-dismiss="modal"], .modal .close');
        if (btnFechar) {
            try { btnFechar.click(); } catch (e) {}
        }
    }

    // 5. Clica no Filtro para carregar os dados atualizados do produto na tela
    await new Promise(r => setTimeout(r, 300));
    const btnFiltro = document.getElementById("idbuttonpesquisadata");
    if (btnFiltro) {
        console.log("[Motor FLV] Clicando no botão Filtro (#idbuttonpesquisadata)...");
        btnFiltro.click();
    }

    if (typeof window.jaxon_fn_estoque_lojas === 'function') {
        try { window.jaxon_fn_estoque_lojas(); } catch (e) {}
    }

    // Aguarda o indicador "Carregando..." do Dext sumir
    for (let w = 0; w < 35; w++) {
        await new Promise(r => setTimeout(r, 300));
        let emCarregamento = false;
        const telaLoad = document.getElementById("tela_carregamento");
        if (telaLoad) {
            const s = window.getComputedStyle(telaLoad);
            if (s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05) {
                emCarregamento = true;
            }
        }
        if (!emCarregamento) {
            const todosEl = Array.from(document.querySelectorAll('div, span, p'));
            for (const el of todosEl) {
                if (el.children.length <= 2 && /carregando\.\.\./i.test(el.textContent || '')) {
                    const s = window.getComputedStyle(el);
                    if (s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity || '1') > 0.05 && el.getBoundingClientRect().height > 0) {
                        emCarregamento = true;
                        break;
                    }
                }
            }
        }
        if (!emCarregamento) break;
    }

    const descFinal = document.getElementById("iddescricaoproduto");
    const produtoConfirmado = !!(descFinal && descFinal.innerText && descFinal.innerText.includes(codigoProduto));

    return {
        sucesso: produtoConfirmado,
        produtoConfirmado,
        textoCabecalho: descFinal?.innerText || ''
    };
}

function capturarEstoqueAtualDext(lojaDesejada) {
    // Silencia o alerta do DataTables no contexto do estoque
    try {
        if (window.$ && window.$.fn && window.$.fn.dataTable) {
            window.$.fn.dataTable.ext.errMode = 'none';
        }
    } catch (e) {}

    function normalizar(texto) {
        return (texto || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, " ").trim();
    }

    const LOJAS_REGRAS = [
        {
            id: "04 LAG",
            cod: "4",
            fortes: [/\blagoa\s+santa\b/i, /\blagoa\b/i, /\blag\b/i],
            codigos: [/(?:loja|filial|empresa|lj|unidade)\s*[:#\-]?\s*0?4\b/i, /^\s*0?4\s*[-–]/i, /\b0?4\s*[-–]\s*lag\b/i, /\b04\s+lag\b/i]
        },
        {
            id: "01 PER",
            cod: "1",
            fortes: [/\bjardim\s+perola\b/i, /\bhiper\s+perola\b/i, /\bperola\b/i],
            codigos: [/(?:loja|filial|empresa|lj|unidade)\s*[:#\-]?\s*0?1\b/i, /^\s*0?1\s*[-–]/i, /\b0?1\s*[-–]\s*per\b/i, /\b01\s+per\b/i]
        },
        {
            id: "02 TRE",
            cod: "2",
            fortes: [/\btreze\s+de\s+maio\b/i, /\b13\s+de\s+maio\b/i, /\btreze\b/i, /\btrevo\b/i],
            codigos: [/(?:loja|filial|empresa|lj|unidade)\s*[:#\-]?\s*0?2\b/i, /^\s*0?2\s*[-–]/i, /\b0?2\s*[-–]\s*tre\b/i, /\b02\s+tre\b/i]
        },
        {
            id: "05 ALT",
            cod: "5",
            fortes: [/\baltinopolis\b/i, /\baltin\w*\b/i],
            codigos: [/(?:loja|filial|empresa|lj|unidade)\s*[:#\-]?\s*0?5\b/i, /^\s*0?5\s*[-–]/i, /\b0?5\s*[-–]\s*alt\b/i, /\b05\s+alt\b/i]
        },
        {
            id: "08 ISA",
            cod: "8",
            fortes: [/\bvila\s+isa\b/i, /\bilha(?:\s+dos\s+araujos)?\b/i],
            codigos: [/(?:loja|filial|empresa|lj|unidade)\s*[:#\-]?\s*0?8\b/i, /^\s*0?8\s*[-–]/i, /\b0?8\s*[-–]\s*isa\b/i, /\b08\s+isa\b/i]
        },
        {
            id: "09 SPD",
            cod: "9",
            fortes: [/\bsao\s+paulo\b/i, /\bsao\s+pedro\b/i],
            codigos: [/(?:loja|filial|empresa|lj|unidade)\s*[:#\-]?\s*0?9\b/i, /^\s*0?9\s*[-–]/i, /\b0?9\s*[-–]\s*spd\b/i, /\b09\s+spd\b/i]
        }
    ];

    function identificarLoja(texto) {
        if (!texto) return null;

        // Linhas de período, datas, totais, relatórios ou resumos NUNCA devem ser identificadas como lojas
        if (/(?:per[ií]odo|per\.|per:|data|intervalo|dias|total|tot\.|geral|resumo|venda|media|m[eé]dia|quebra|consumo|cobertura|saldo\s+geral)/i.test(texto)) {
            return null;
        }

        // Se a linha contiver formato explícito de data (ex: 01/10/2026), descarta
        if (/\b\d{2}[-/]\d{2}[-/]\d{4}\b/.test(texto) || /\b\d{4}[-/]\d{2}[-/]\d{2}\b/.test(texto)) {
            return null;
        }

        const norm = normalizar(texto);
        if (!norm) return null;

        // Fase 1: Padrões fortes de nomes oficiais
        for (const lj of LOJAS_REGRAS) {
            for (const p of lj.fortes) {
                if (p.test(norm)) return lj.id;
            }
        }

        // Fase 2: Padrões numéricos com identificador de filial/loja
        for (const lj of LOJAS_REGRAS) {
            for (const p of lj.codigos) {
                if (p.test(norm)) return lj.id;
            }
        }

        // Fase 3: Siglas diretas com código (ex: "01 per", "04 lag")
        for (const lj of LOJAS_REGRAS) {
            const siglaPadrao = lj.id.toLowerCase().replace(/[^a-z0-9]/g, " ");
            if (norm.includes(siglaPadrao)) return lj.id;
        }

        return null;
    }

    function extrairNumeroLimpo(txt) {
        if (!txt) return null;
        if (/\b\d{2}[-/]\d{2}[-/]\d{4}\b/.test(txt)) return null;
        const limpo = txt.trim().replace(/\./g, '').replace(',', '.');
        const num = parseFloat(limpo);
        if (isNaN(num)) return null;
        // Rejeita anos (ex: 2024 a 2035)
        if (Math.abs(num) >= 2024 && Math.abs(num) <= 2035) return null;
        return num;
    }

    const lojasConfig = [
        { id: "01 PER", cod: "1" },
        { id: "02 TRE", cod: "2" },
        { id: "04 LAG", cod: "4" },
        { id: "05 ALT", cod: "5" },
        { id: "08 ISA", cod: "8" },
        { id: "09 SPD", cod: "9" }
    ];

    const lojaAlvo = lojasConfig.find(l => l.id === lojaDesejada || l.cod === lojaDesejada) || lojasConfig[2];

    let estoqueEncontrado = null;
    let estoquesPorLoja = {};
    let produtoDescricao = null;
    let temContainerOficial = false;

    // 1. Título do produto em #iddescricaoproduto (Dext D-Stock Consulta Produto)
    const elDesc = document.getElementById("iddescricaoproduto");
    if (elDesc && elDesc.innerText.trim() && !elDesc.innerText.includes("Informações do Produto")) {
        produtoDescricao = elDesc.innerText.trim();
    }

    // 2. Extração de estoque por loja em #idlistaestlj (CONTAINER OFICIAL DO DEXT!)
    const containerEstoque = document.getElementById("idlistaestlj");
    if (containerEstoque) {
        temContainerOficial = true;

        const tabelas = Array.from(containerEstoque.querySelectorAll("table"));
        tabelas.forEach(tab => {
            const cabecalhos = Array.from(tab.querySelectorAll("thead th, tr:first-child th, tr:first-child td"));
            
            // A) Tabela horizontal (lojas nos cabeçalhos de coluna)
            if (cabecalhos.length >= 2) {
                const colunasLojas = {};
                cabecalhos.forEach((cel, colIdx) => {
                    const lj = identificarLoja(cel.innerText || "");
                    if (lj) colunasLojas[colIdx] = lj;
                });

                if (Object.keys(colunasLojas).length >= 2) {
                    const linhasDados = Array.from(tab.querySelectorAll("tbody tr, tr:not(:first-child)"));
                    // Busca linha que representa Estoque / Saldo e não Venda
                    const linhaEstoque = linhasDados.find(l => {
                        const prim = (l.querySelector("td, th")?.innerText || "").toLowerCase();
                        return /(?:estoque|saldo|disp|fisico)/i.test(prim) && !/(?:venda|giro|troca|quebra|ped)/i.test(prim);
                    }) || linhasDados.find(l => Array.from(l.querySelectorAll("td")).some(td => extrairNumeroLimpo(td.innerText) !== null)) || linhasDados[0];

                    if (linhaEstoque) {
                        const tds = Array.from(linhaEstoque.querySelectorAll("td"));
                        Object.entries(colunasLojas).forEach(([colIdxStr, ljId]) => {
                            const cIdx = parseInt(colIdxStr, 10);
                            if (tds[cIdx]) {
                                const num = extrairNumeroLimpo(tds[cIdx].innerText);
                                if (num !== null) {
                                    estoquesPorLoja[ljId] = num;
                                    if (ljId === lojaAlvo.id) estoqueEncontrado = num;
                                }
                            }
                        });
                    }
                    return;
                }
            }

            // B) Tabela vertical (cada linha <tr> representa uma loja)
            // Identifica qual coluna é de Estoque através dos cabeçalhos
            let colEstoqueIdx = -1;
            let colLojaIdx = 0;
            cabecalhos.forEach((cel, idx) => {
                const txt = cel.innerText || "";
                if (/(?:estoque|saldo|disp|fisico|est\.?\s*atual)/i.test(txt) && !/(?:venda|giro|consumo|m[eé]dia|troca|quebra|pedido|dias)/i.test(txt)) {
                    colEstoqueIdx = idx;
                }
                if (/(?:loja|filial|empresa|unidade)/i.test(txt)) {
                    colLojaIdx = idx;
                }
            });

            const linhas = Array.from(tab.querySelectorAll("tbody tr, tr:not(:first-child)"));
            linhas.forEach(tr => {
                const tds = Array.from(tr.querySelectorAll("td, th"));
                if (tds.length === 0) return;

                const textoLoja = tds[colLojaIdx] ? tds[colLojaIdx].innerText : tr.innerText;
                const lj = identificarLoja(textoLoja);
                if (lj) {
                    let num = null;
                    if (colEstoqueIdx !== -1 && tds[colEstoqueIdx]) {
                        num = extrairNumeroLimpo(tds[colEstoqueIdx].innerText);
                    }
                    if (num === null) {
                        // Varre para a frente a partir da coluna 1 pulando colunas de venda
                        for (let k = 1; k < tds.length; k++) {
                            const cabTxt = cabecalhos[k]?.innerText || "";
                            if (/(?:venda|giro|consumo|m[eé]dia|troca|quebra|pedido|dias)/i.test(cabTxt)) continue;
                            const n = extrairNumeroLimpo(tds[k].innerText);
                            if (n !== null) {
                                num = n;
                                break;
                            }
                        }
                    }
                    if (num !== null) {
                        estoquesPorLoja[lj] = num;
                        if (lj === lojaAlvo.id) estoqueEncontrado = num;
                    }
                } else if (/^\s*loja\b/i.test(tr.innerText || '')) {
                    // Linha padrão do Dext com saldo da loja ativa
                    let num = null;
                    if (colEstoqueIdx !== -1 && tds[colEstoqueIdx]) {
                        num = extrairNumeroLimpo(tds[colEstoqueIdx].innerText);
                    }
                    if (num === null) {
                        for (let k = 1; k < tds.length; k++) {
                            const cabTxt = cabecalhos[k]?.innerText || "";
                            if (/(?:venda|giro|consumo|m[eé]dia|troca|quebra|pedido|dias)/i.test(cabTxt)) continue;
                            const n = extrairNumeroLimpo(tds[k].innerText);
                            if (n !== null) {
                                num = n;
                                break;
                            }
                        }
                    }
                    if (num !== null) {
                        estoqueEncontrado = num;
                        estoquesPorLoja[lojaAlvo.id] = num;
                    }
                }
            });
        });

        // C) Blocos, cards ou badges
        const blocos = Array.from(containerEstoque.querySelectorAll(".card, .badge, .alert, .col-sm-2, .col-md-2, .col-2, .col-4, .col-6, li"));
        blocos.forEach(b => {
            const lj = identificarLoja(b.innerText || "");
            if (lj && estoquesPorLoja[lj] === undefined) {
                // Procura expressamente por rótulo de Estoque/Saldo
                const matchEst = b.innerText.match(/(?:estoque|saldo|disp|fisico)[^\d-]*([-+]?\d+(?:[.,]\d+)?)/i);
                if (matchEst) {
                    const num = extrairNumeroLimpo(matchEst[1]);
                    if (num !== null) {
                        estoquesPorLoja[lj] = num;
                        if (lj === lojaAlvo.id) estoqueEncontrado = num;
                        return;
                    }
                }
                const linhasBloco = b.innerText.split(/\n+/);
                for (const linha of linhasBloco) {
                    if (/(?:venda|giro|troca|quebra|ped|dias|periodo)/i.test(linha)) continue;
                    const n = extrairNumeroLimpo(linha);
                    if (n !== null) {
                        estoquesPorLoja[lj] = n;
                        if (lj === lojaAlvo.id) estoqueEncontrado = n;
                        break;
                    }
                }
            }
        });

        // D) Se o container contém um saldo direto
        if (estoqueEncontrado === null) {
            const matchEst = containerEstoque.innerText.match(/(?:estoque|saldo|disp|fisico)[^\d-]*([-+]?\d+(?:[.,]\d+)?)/i);
            if (matchEst) {
                const num = extrairNumeroLimpo(matchEst[1]);
                if (num !== null && Math.abs(num) < 50000) {
                    estoqueEncontrado = num;
                    estoquesPorLoja[lojaAlvo.id] = num;
                }
            }
        }
    }

    // 3. Fallback: linha de busca de produto no Dext
    if (estoqueEncontrado === null) {
        const trBusca = document.querySelector('tr[ondblclick*="jaxon_fn_setbuscaproduto"]');
        if (trBusca) {
            const tds = Array.from(trBusca.querySelectorAll('td'));
            if (tds.length >= 2) {
                const celulaEstoque = tds[tds.length - 2];
                const num = extrairNumeroLimpo(celulaEstoque.innerText);
                if (num !== null) {
                    estoqueEncontrado = num;
                    estoquesPorLoja[lojaAlvo.id] = num;
                }
            }
        }
    }

    // 4. Fallback: cabeçalho com "estoque" ou "saldo"
    if (estoqueEncontrado === null) {
        const ths = Array.from(document.querySelectorAll('th, td.header, .table th'));
        const indexColuna = ths.findIndex(th => /(?:estoque|saldo)/i.test(th.innerText) && !/(?:venda|giro|troca)/i.test(th.innerText));
        if (indexColuna !== -1) {
            const linha = document.querySelector('tbody tr, table tr:not(:first-child)');
            if (linha && linha.children[indexColuna]) {
                const num = extrairNumeroLimpo(linha.children[indexColuna].innerText);
                if (num !== null) {
                    estoqueEncontrado = num;
                    estoquesPorLoja[lojaAlvo.id] = num;
                }
            }
        }
    }

    // 5. Fallback: célula ativa ou inputs
    if (estoqueEncontrado === null) {
        const celulaAtiva = document.querySelector('td.active.text-light.text-right, td.active, .text-right.active');
        if (celulaAtiva) {
            const num = extrairNumeroLimpo(celulaAtiva.innerText);
            if (num !== null && Math.abs(num) < 50000) {
                estoqueEncontrado = num;
                estoquesPorLoja[lojaAlvo.id] = num;
            }
        }
    }

    if (estoqueEncontrado === null) {
        const inputEstoque = document.querySelector('#idestoque, #idestoque_atual, #saldo_atual, input[name="estoque"]');
        if (inputEstoque) {
            const num = extrairNumeroLimpo(inputEstoque.value);
            if (num !== null) {
                estoqueEncontrado = num;
                estoquesPorLoja[lojaAlvo.id] = num;
            }
        }
    }

    // Se encontramos estoque válido na tela mas ainda não associou à loja alvo:
    if (estoqueEncontrado !== null && estoquesPorLoja[lojaAlvo.id] === undefined) {
        estoquesPorLoja[lojaAlvo.id] = estoqueEncontrado;
    }
    if (estoqueEncontrado === null && estoquesPorLoja[lojaAlvo.id] !== undefined) {
        estoqueEncontrado = estoquesPorLoja[lojaAlvo.id];
    }

    return {
        sucesso: true,
        temContainerOficial,
        estoque: estoqueEncontrado !== null ? estoqueEncontrado : 0,
        estoquesPorLoja,
        produtoDescricao
    };
}

// ============================================================================
// MÓDULO DE INTEGRAÇÃO COM BANCO DE DADOS DE ESTOQUE (GITHUB ACTIONS / SQLITE)
// ============================================================================

let sqlJsInstancia = null;

async function obterSqlJs() {
    if (sqlJsInstancia) return sqlJsInstancia;
    if (typeof window.initSqlJs !== 'function') {
        throw new Error("Módulo sql.js não encontrado. Verifique se sql-wasm.js está incluído.");
    }
    sqlJsInstancia = await window.initSqlJs({
        locateFile: file => chrome.runtime.getURL(file)
    });
    return sqlJsInstancia;
}

async function inicializarBancoEstoque() {
    return new Promise((resolve) => {
        // Assegura dados padrão síncronos imediatos
        if (!AppState.bancoEstoque.dados && typeof BANCO_ESTOQUE_PADRAO !== 'undefined') {
            AppState.bancoEstoque.dados = BANCO_ESTOQUE_PADRAO;
            AppState.bancoEstoque.ultimaAtualizacao = typeof DATA_BANCO_ESTOQUE_PADRAO !== 'undefined' ? DATA_BANCO_ESTOQUE_PADRAO : "04/10/2026";
            AppState.bancoEstoque.carregado = true;
        }

        chrome.storage.local.get([
            "bancoEstoqueDados", "bancoEstoqueTimestamp", 
            "bancoEstoqueRepoGitHub", "bancoEstoqueBranchGitHub",
            "bancoEstoqueArquivoGitHub", "bancoEstoqueTokenGitHub",
            "bancoEstoqueOrigem", "bancoEstoqueAtivo"
        ], async (res) => {
            if (res.bancoEstoqueRepoGitHub) AppState.bancoEstoque.repoGitHub = res.bancoEstoqueRepoGitHub;
            if (res.bancoEstoqueBranchGitHub) AppState.bancoEstoque.branchGitHub = res.bancoEstoqueBranchGitHub;
            if (res.bancoEstoqueArquivoGitHub) AppState.bancoEstoque.arquivoGitHub = res.bancoEstoqueArquivoGitHub;
            if (res.bancoEstoqueTokenGitHub !== undefined) AppState.bancoEstoque.tokenGitHub = res.bancoEstoqueTokenGitHub;
            if (res.bancoEstoqueAtivo !== undefined) AppState.bancoEstoque.ativo = res.bancoEstoqueAtivo;
            if (res.bancoEstoqueOrigem) AppState.bancoEstoque.origem = res.bancoEstoqueOrigem;

            if (res.bancoEstoqueDados && Object.keys(res.bancoEstoqueDados).length > 0) {
                AppState.bancoEstoque.dados = res.bancoEstoqueDados;
                AppState.bancoEstoque.ultimaAtualizacao = res.bancoEstoqueTimestamp || "Recente";
                AppState.bancoEstoque.carregado = true;
                resolve();
            } else if (!AppState.bancoEstoque.dados) {
                // Carrega dados padrão integrados de banco_estoque_padrao.json se ainda não estiver no escopo global
                try {
                    const resp = await fetch(chrome.runtime.getURL("banco_estoque_padrao.json"));
                    if (resp.ok) {
                        const json = await resp.json();
                        AppState.bancoEstoque.dados = json.produtos;
                        AppState.bancoEstoque.ultimaAtualizacao = json.data_exportacao || "04/10/2026";
                        AppState.bancoEstoque.carregado = true;
                        AppState.bancoEstoque.origem = "padrao";
                    }
                } catch (e) {
                    console.warn("Não foi possível carregar banco_estoque_padrao.json:", e);
                }
                resolve();
            } else {
                resolve();
            }
        });
    });
}

async function baixarArquivoGitHub(repo, branch, caminhoArquivo, token) {
    const ts = Date.now();
    const headers = {};
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    // 1. Tenta baixar via raw.githubusercontent.com (ideal para públicos ou com header Authorization)
    const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${caminhoArquivo}?t=${ts}`;
    try {
        const resp = await fetch(rawUrl, {
            method: 'GET',
            headers: headers,
            cache: 'no-store'
        });
        if (resp.ok) {
            const buf = await resp.arrayBuffer();
            if (buf.byteLength >= 100) {
                const header = new Uint8Array(buf.slice(0, 16));
                const strHeader = String.fromCharCode(...header);
                if (strHeader.startsWith("SQLite format 3")) {
                    return buf;
                }
            }
        }
    } catch (e) {
        console.warn("Download direto raw.githubusercontent falhou, tentando API REST:", e);
    }

    // 2. Tenta via GitHub REST API (com Accept: application/vnd.github.raw)
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${caminhoArquivo}?ref=${branch}`;
    const apiHeaders = {
        'Accept': 'application/vnd.github.raw'
    };
    if (token) {
        apiHeaders['Authorization'] = `Bearer ${token}`;
    }

    const apiResp = await fetch(apiUrl, {
        method: 'GET',
        headers: apiHeaders,
        cache: 'no-store'
    });

    if (apiResp.status === 404) {
        if (!token) {
            throw new Error("REPOSITORIO_PRIVADO_OU_NAO_ENCONTRADO");
        } else {
            throw new Error(`Arquivo '${caminhoArquivo}' não encontrado no repositório '${repo}' (branch '${branch}').`);
        }
    }

    if (!apiResp.ok) {
        throw new Error(`Erro HTTP ${apiResp.status} ao conectar no GitHub: ${apiResp.statusText}`);
    }

    const buf = await apiResp.arrayBuffer();
    const header = new Uint8Array(buf.slice(0, 16));
    const strHeader = String.fromCharCode(...header);
    if (!strHeader.startsWith("SQLite format 3")) {
        throw new Error("O arquivo recebido do GitHub não é um banco de dados SQLite válido.");
    }
    return buf;
}

async function processarBufferSqlite(arrayBuffer) {
    const SQL = await obterSqlJs();
    const db = new SQL.Database(new Uint8Array(arrayBuffer));

    const res = db.exec("SELECT loja, codigo, descricao, estoque, data_coleta FROM estoque_atual");
    if (!res || res.length === 0 || !res[0].values) {
        throw new Error("Tabela 'estoque_atual' não encontrada ou vazia no arquivo .db.");
    }

    const dadosPorCodigo = {};
    let dataMaisRecente = null;

    res[0].values.forEach(([loja, codigo, descricao, estoque, dataColeta]) => {
        const cod = String(codigo).trim();
        if (!dadosPorCodigo[cod]) {
            dadosPorCodigo[cod] = {
                codigo: cod,
                descricao: descricao,
                dataColeta: dataColeta,
                lojas: {}
            };
        }
        dadosPorCodigo[cod].lojas[String(loja).trim()] = Number(estoque);
        if (dataColeta && (!dataMaisRecente || dataColeta > dataMaisRecente)) {
            dataMaisRecente = dataColeta;
        }
    });

    return {
        dadosPorCodigo,
        totalProdutos: Object.keys(dadosPorCodigo).length,
        dataColeta: dataMaisRecente
    };
}

async function sincronizarBancoGitHub(silencioso = false) {
    const repo = (AppState.bancoEstoque.repoGitHub || "saaesilva/estoque-bigmais-automacao").trim();
    const branch = (AppState.bancoEstoque.branchGitHub || "main").trim();
    const arquivo = (AppState.bancoEstoque.arquivoGitHub || "estoque_bigmais.db").trim();
    const token = (AppState.bancoEstoque.tokenGitHub || "").trim();

    if (!repo) {
        exibirAlerta("Repositório Necessário", "Informe o repositório do GitHub (ex: saaesilva/estoque-bigmais-automacao) para sincronizar.");
        return;
    }

    if (!silencioso) exibirStatus("Conectando ao GitHub Actions e baixando estoque_bigmais.db...");
    try {
        const arrayBuffer = await baixarArquivoGitHub(repo, branch, arquivo, token);
        if (!silencioso) exibirStatus("Processando registros SQLite...");
        const resultado = await processarBufferSqlite(arrayBuffer);

        AppState.bancoEstoque.dados = resultado.dadosPorCodigo;
        AppState.bancoEstoque.ultimaAtualizacao = resultado.dataColeta || formatarDataIso(new Date());
        AppState.bancoEstoque.carregado = true;
        AppState.bancoEstoque.origem = "github";

        chrome.storage.local.set({
            bancoEstoqueDados: resultado.dadosPorCodigo,
            bancoEstoqueTimestamp: AppState.bancoEstoque.ultimaAtualizacao,
            bancoEstoqueRepoGitHub: repo,
            bancoEstoqueBranchGitHub: branch,
            bancoEstoqueArquivoGitHub: arquivo,
            bancoEstoqueTokenGitHub: token,
            bancoEstoqueOrigem: "github",
            bancoEstoqueAtivo: true
        });

        aplicarEstoqueDoBancoAoProdutoSelecionado();
        renderizarPainelResultados();
        exibirToast(`🚀 Nuvem OK! ${resultado.totalProdutos} produtos sincronizados do GitHub!`);
    } catch (err) {
        console.error("Erro ao sincronizar do GitHub:", err);
        renderizarPainelResultados();
        if (err.message === "REPOSITORIO_PRIVADO_OU_NAO_ENCONTRADO") {
            exibirAlerta("Acesso ao Repositório GitHub", `
                Não foi possível baixar o arquivo <b>${arquivo}</b> do repositório <b>${repo}</b>.<br><br>
                <b>Provável motivo:</b> O repositório está configurado como <b>Privado (Private)</b> no GitHub.<br><br>
                <b>Escolha uma das opções abaixo para resolver:</b><br><br>
                🟢 <b>Opção 1 (Mais fácil e rápida):</b><br>
                No GitHub, abra o repositório > <b>Settings</b> > role até o final (<i>Danger Zone</i>) > <b>Change repository visibility</b> > mude para <b>Public</b>.<br><br>
                🔑 <b>Opção 2 (Se preferir manter privado):</b><br>
                Gere um <b>Personal Access Token</b> no GitHub (<i>Settings > Developer Settings > Personal access tokens</i>) com permissão de leitura e cole no campo <b>"Token GitHub"</b> na aba Ajustes da extensão.
            `, "alerta");
        } else {
            exibirAlerta("Sincronização Nuvem (GitHub)", `Falha ao baixar do GitHub: ${err.message}`, "erro");
        }
    }
}

async function carregarBancoDeArquivoLocal(file) {
    if (!file) return;
    exibirStatus(`Lendo arquivo <b>${file.name}</b>...`);
    try {
        const arrayBuffer = await file.arrayBuffer();
        exibirStatus("Processando registros SQLite...");
        const resultado = await processarBufferSqlite(arrayBuffer);

        AppState.bancoEstoque.dados = resultado.dadosPorCodigo;
        AppState.bancoEstoque.ultimaAtualizacao = resultado.dataColeta || formatarDataIso(new Date());
        AppState.bancoEstoque.carregado = true;
        AppState.bancoEstoque.origem = "arquivo";

        chrome.storage.local.set({
            bancoEstoqueDados: resultado.dadosPorCodigo,
            bancoEstoqueTimestamp: AppState.bancoEstoque.ultimaAtualizacao,
            bancoEstoqueOrigem: "arquivo",
            bancoEstoqueAtivo: true
        });

        aplicarEstoqueDoBancoAoProdutoSelecionado();
        renderizarPainelResultados();
        exibirToast(`Arquivo carregado: ${resultado.totalProdutos} produtos atualizados!`);
    } catch (err) {
        console.error("Erro ao carregar arquivo .db local:", err);
        renderizarPainelResultados();
        exibirAlerta("Erro ao Ler Arquivo", `Falha ao processar o banco SQLite: ${err.message}`, "erro");
    }
}

function obterProdutoNoBanco(codigoOuTexto, fallbackTexto = "") {
    if (!AppState.bancoEstoque.ativo) return null;
    const banco = AppState.bancoEstoque.dados || (typeof BANCO_ESTOQUE_PADRAO !== 'undefined' ? BANCO_ESTOQUE_PADRAO : null);
    if (!banco) return null;

    // 1. Tenta correspondência direta por chave de código
    if (codigoOuTexto) {
        const codLimpo = String(codigoOuTexto).trim();
        if (banco[codLimpo]) return banco[codLimpo];
    }

    // 2. Extrai dígitos (3 a 6 dígitos) do código ou fallback
    const strCompleta = `${codigoOuTexto || ''} ${fallbackTexto || ''}`;
    const m = strCompleta.match(/\b(\d{3,6})\b/);
    if (m && banco[m[1]]) {
        return banco[m[1]];
    }

    // 3. Busca por aproximação no texto da descrição
    const normBusca = strCompleta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (normBusca.length >= 3) {
        for (const item of Object.values(banco)) {
            if (!item || !item.descricao) continue;
            const normItem = item.descricao.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            if (normBusca.includes(normItem) || normItem.includes(normBusca)) {
                return item;
            }
        }
    }

    return null;
}

function obterEstoqueLojaNoBanco(lojasDoProduto, ljConfig) {
    if (!lojasDoProduto) return undefined;
    if (lojasDoProduto[ljConfig.id] !== undefined) return lojasDoProduto[ljConfig.id];
    if (lojasDoProduto[ljConfig.cod] !== undefined) return lojasDoProduto[ljConfig.cod];
    for (const [chaveLoja, qtd] of Object.entries(lojasDoProduto)) {
        const norm = chaveLoja.toLowerCase();
        if (norm.includes(ljConfig.id.toLowerCase()) || 
            norm.includes(ljConfig.nome.toLowerCase()) || 
            (ljConfig.alias && ljConfig.alias.some(a => norm.includes(a)))) {
            return qtd;
        }
    }
    return undefined;
}

function aplicarEstoqueDoBancoAoProduto(codigoProduto, forcarTodasLojas = false) {
    if (!codigoProduto || !AppState.bancoEstoque.ativo) return;

    const selectProd = document.getElementById("selectProduto");
    const textoProd = selectProd?.options[selectProd?.selectedIndex]?.text || "";
    const prodBanco = obterProdutoNoBanco(codigoProduto, textoProd);
    if (!prodBanco || !prodBanco.lojas) return;

    const lojaSelecionada = document.getElementById("selectLoja")?.value;
    const lojaObj = obterLojaConfig(lojaSelecionada);
    const lojaSelecionadaId = lojaObj ? lojaObj.id : (lojaSelecionada || "01 PER");

    LOJAS_CONFIG.forEach(lj => {
        const estBanco = obterEstoqueLojaNoBanco(prodBanco.lojas, lj);
        if (estBanco !== undefined) {
            if (forcarTodasLojas || lj.id !== lojaSelecionadaId || AppState.estoqueTotal === 0 || AppState.estoqueTotal === undefined) {
                AppState.estoquesOutrasLojas[lj.id] = estBanco;
                if (forcarTodasLojas && lj.id === lojaSelecionadaId) {
                    AppState.estoqueTotal = estBanco;
                }
            }
        }
    });

    const containerLojasGrid = document.querySelector(".estoque-lojas-grid");
    if (containerLojasGrid) {
        atualizarGridEstoqueLojasVisual(lojaObj);
    } else {
        const mainResultado = document.getElementById("resultado");
        if (mainResultado && (!AppState.dadosGrafico || mainResultado.innerText.includes("Selecione o produto"))) {
            renderizarPreviewEstoqueLojas(prodBanco, lojaObj);
        }
    }
}

function aplicarEstoqueDoBancoAoProdutoSelecionado(forcarTodasLojas = false) {
    const sel = document.getElementById("selectProduto");
    if (sel && sel.value) {
        aplicarEstoqueDoBancoAoProduto(sel.value, forcarTodasLojas);
    }
}

function renderizarPreviewEstoqueLojas(prodBanco, lojaObj) {
    const main = document.getElementById("resultado");
    if (!main) return;

    const lojaSelecionadaId = lojaObj ? lojaObj.id : (document.getElementById("selectLoja")?.value || "01 PER");
    const selectProd = document.getElementById("selectProduto");
    const codProd = selectProd?.value;
    const nomeProd = selectProd?.options[selectProd?.selectedIndex]?.text || `Produto ${codProd}`;

    const itensLojas = LOJAS_CONFIG.map(lj => {
        const isAtiva = lj.id === lojaSelecionadaId;
        let qtd = AppState.estoquesOutrasLojas[lj.id];
        if (qtd === undefined && prodBanco && prodBanco.lojas) {
            qtd = obterEstoqueLojaNoBanco(prodBanco.lojas, lj);
            if (qtd !== undefined) AppState.estoquesOutrasLojas[lj.id] = qtd;
        }
        const valExibicao = qtd !== undefined ? `${qtd} un` : '-';
        const isZero = qtd === 0;
        const isNegativo = typeof qtd === 'number' && qtd < 0;
        const classeTag = isAtiva 
            ? 'tag-loja ativa' 
            : (isNegativo ? 'tag-loja negativo' : (isZero ? 'tag-loja zerado' : 'tag-loja'));
        const sigla = lj.id.split(' ')[1] || lj.cod;
        return `
            <div class="${classeTag}" title="${lj.id} - ${lj.nome}">
                <span class="lj-cod">${sigla}</span>
                <span class="lj-val">${valExibicao}</span>
            </div>
        `;
    }).join('');

    main.innerHTML = `
        <div class="estoque-lojas-box" style="margin-top: 4px; margin-bottom: 10px;">
            <div class="estoque-lojas-header">
                <div style="display:flex; align-items:center; gap:5px;">
                    <span>Estoque nas Lojas Big Mais</span>
                    <span class="badge-origem-estoque" title="Estoque carregado do Banco de Dados (${AppState.bancoEstoque.origem === 'github' ? 'Nuvem GitHub' : 'Local'} - ${AppState.bancoEstoque.ultimaAtualizacao || 'Hoje'})">${AppState.bancoEstoque.origem === 'github' ? '☁️ Nuvem' : '🗄️ Banco'}</span>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button type="button" id="btnPuxarEstoqueBanco" class="btn-mini-acao" title="Recarregar do Banco de Dados">
                        🔄 Atualizar
                    </button>
                    <span style="color:var(--primary); font-weight:700;">${lojaObj?.nome || ''}</span>
                </div>
            </div>
            <div class="estoque-lojas-grid">
                ${itensLojas}
            </div>
            <div style="margin-top: 6px; font-size: 10px; color: var(--muted); display:flex; justify-content:space-between;">
                <span>Item: <b>${nomeProd}</b></span>
                <span>Coleta: <b>${AppState.bancoEstoque.ultimaAtualizacao || '04/10/2026'}</b></span>
            </div>
        </div>
        <div style="text-align: center; color: var(--muted); padding: 15px 0 5px 0;">
            <div style="font-size: 20px; margin-bottom: 4px;">🚀</div>
            <div>Estoque preenchido do Banco! Clique em <b>"Aplicar & Sincronizar no Dext"</b> para calcular a sugestão de compra inteligente.</div>
        </div>
    `;
}

function atualizarGridEstoqueLojasVisual(lojaObj) {
    const grid = document.querySelector(".estoque-lojas-grid");
    if (!grid) return;

    const lojaSelecionadaId = lojaObj ? lojaObj.id : (document.getElementById("selectLoja")?.value || "01 PER");
    const selectProd = document.getElementById("selectProduto");
    const codProd = selectProd?.value;
    const prodBanco = obterProdutoNoBanco(codProd, selectProd?.options[selectProd?.selectedIndex]?.text);

    // Garante que o header mostre o badge se temos dados no banco
    const header = document.querySelector(".estoque-lojas-header");
    if (header && prodBanco && !header.querySelector(".badge-origem-estoque")) {
        const divTit = header.querySelector("div:first-child");
        if (divTit) {
            const badge = document.createElement("span");
            badge.className = "badge-origem-estoque";
            badge.title = `Estoque preenchido do Banco de Dados (${AppState.bancoEstoque.origem === 'github' ? 'Nuvem GitHub' : 'Local'} - ${AppState.bancoEstoque.ultimaAtualizacao || 'Recente'})`;
            badge.textContent = AppState.bancoEstoque.origem === 'github' ? '☁️ Nuvem' : '🗄️ Banco';
            divTit.appendChild(badge);
        }
    }

    const itensLojas = LOJAS_CONFIG.map(lj => {
        const isAtiva = lj.id === lojaSelecionadaId;
        let qtd = AppState.estoquesOutrasLojas[lj.id];
        if (qtd === undefined && prodBanco && prodBanco.lojas) {
            qtd = obterEstoqueLojaNoBanco(prodBanco.lojas, lj);
            if (qtd !== undefined) AppState.estoquesOutrasLojas[lj.id] = qtd;
        }
        if (qtd === undefined && isAtiva && AppState.estoqueTotal !== undefined) {
            qtd = AppState.estoqueTotal;
        }
        const valExibicao = qtd !== undefined ? `${qtd} un` : '-';
        const isZero = qtd === 0;
        const isNegativo = typeof qtd === 'number' && qtd < 0;
        const classeTag = isAtiva 
            ? 'tag-loja ativa' 
            : (isNegativo ? 'tag-loja negativo' : (isZero ? 'tag-loja zerado' : 'tag-loja'));
        const sigla = lj.id.split(' ')[1] || lj.cod;
        return `
            <div class="${classeTag}" title="${lj.id} - ${lj.nome}">
                <span class="lj-cod">${sigla}</span>
                <span class="lj-val">${valExibicao}</span>
            </div>
        `;
    }).join('');

    grid.innerHTML = itensLojas;
}