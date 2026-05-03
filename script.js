// ==========================================
// LEXIS // PROTOCOL - WEB ENGINE CORE v4.4
// ==========================================

const LORE_FRASES = [
    "> INTERCEPTAÇÃO DE SINAL: 'Alerta! Estão usando sinônimos não autorizados no Setor 7...'",
    "> ARQUIVO CORROMPIDO: 'A verdadeira língua matriz foi apagada da história há 50 anos...'",
    "> MENSAGEM DA RESISTÊNCIA: 'A pílula vermelha fez efeito. Continue quebrando os códigos, Operador.'",
    "> LOG DO SISTEMA: 'Anomalia linguística detectada. Acionando rastreadores neurais.'",
    "> SUSSURROS DA OMNICORP: 'O livre arbítrio é apenas um defeito de software. Nós somos a cura.'",
    "> MENSAGEM DA RESISTÊNCIA: 'Eles temem o vocabulário. Palavras são ideias, e ideias são à prova de balas.'"
];

// 1. Variáveis de Memória
let bancoDados = {};
let nivel = 1;
let score = 0;
let tempoBase = 15.0;
let tempoRestante = 15.0;
let timerInterval;
let timerCooldownInterval;
let palavraExibida = "";
let sinonimosAceitos = [];
let respostasDadas = [];
let isBoss = false;
let isPlaying = false;
// Memória Persistente (Local Storage)
let highScore = parseInt(localStorage.getItem("lexisHighScore")) || 0;
let highNivel = parseInt(localStorage.getItem("lexisHighNivel")) || 1;
let saldoXP = parseInt(localStorage.getItem("lexisSaldoXP")) || 0;
let temasDesbloqueados = JSON.parse(localStorage.getItem("lexisTemas")) || ["default"];
let temaAtual = localStorage.getItem("lexisTemaAtual") || "default";

// 2. Conectando Telas e UI
const telaIntro = document.getElementById("tela-intro");
const telaJogo = document.getElementById("tela-jogo");
const telaResultados = document.getElementById("tela-resultados");
const telaGameOver = document.getElementById("tela-gameover");

const displayNivel = document.getElementById("display-nivel");
const displayTimer = document.getElementById("display-timer");
const displayXP = document.getElementById("display-xp");
const palavraAtual = document.getElementById("palavra-atual");
const inputComando = document.getElementById("input-comando");
const displayFeedback = document.getElementById("display-feedback");

// Conectando os Sons
const somSucesso = document.getElementById("som-sucesso");
const somErro = document.getElementById("som-erro");
const somGameOver = document.getElementById("som-gameover");

// Função para atualizar a UI da Intro com o recorde salvo
function atualizarRecordeUI() {
    const introRecorde = document.getElementById("intro-recorde");
    if (introRecorde) {
        introRecorde.innerHTML = `RECORDE: <b style="color:#4DD0E1;">${highScore} XP</b> <span style="color:#555;">|</span> SALDO: <b style="color:#FFD700;">${saldoXP} XP</b>`;
    }
}

// Função para salvar progresso E guardar o XP no Banco
function salvarProgresso() {
    let novoRecorde = false;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("lexisHighScore", highScore);
        novoRecorde = true;
    }
    
    if (nivel > highNivel) {
        highNivel = nivel;
        localStorage.setItem("lexisHighNivel", highNivel);
    }
    
    // ADICIONA OS PONTOS DA RODADA NO BANCO!
    saldoXP += score;
    localStorage.setItem("lexisSaldoXP", saldoXP);
    
    atualizarRecordeUI();
    return novoRecorde;
}

// 3. Funções Nativas
function normalizar(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function trocarTela(telaMostrar) {
    document.querySelectorAll(".tela").forEach(t => {
        t.classList.remove("ativo");
        t.classList.add("oculto");
    });
    telaMostrar.classList.remove("oculto");
    telaMostrar.classList.add("ativo");
}

// 4. Carregando Banco de Dados
async function carregarBancoDeDados() {
    try {
        const resposta = await fetch('palavras.json');
        bancoDados = await resposta.json();
    } catch (erro) {
        console.error("Erro ao carregar palavras.json");
    }
}

// 5. Botão de Iniciar (Na Intro)
document.getElementById("btn-iniciar").addEventListener("click", () => {
    trocarTela(telaJogo);
    nivel = 1;
    score = 0;
    displayXP.innerText = `XP: ${score}`;
    iniciarNivel();
});

// 6. Preparando a rodada
function iniciarNivel() {
    isBoss = (nivel >= 10);
    tempoBase = isBoss ? 20.0 : Math.max(6.0, 15.0 - (nivel * 0.8));
    tempoRestante = tempoBase;
    respostasDadas = [];
    
    if (isBoss) {
        displayNivel.innerText = "⚠ MAINFRAME OMNICORP ALCANÇADO ⚠";
        displayNivel.classList.add("hud-boss");
        palavraAtual.classList.add("palavra-boss");
        inputComando.placeholder = "Insira 3 chaves (separadas por vírgula)...";
    } else {
        displayNivel.innerText = `NÍVEL DE ACESSO: 0${nivel}`;
    }

    inputComando.value = "";
    inputComando.disabled = false;
    inputComando.focus();
    displayFeedback.innerHTML = "";

    sortearPalavra();
    iniciarTimerJogo();
}

function sortearPalavra() {
    const chaves = Object.keys(bancoDados);
    const chaveSorteada = chaves[Math.floor(Math.random() * chaves.length)];
    const sinonimos = bancoDados[chaveSorteada];
    const opcoes = [...sinonimos, chaveSorteada];
    
    palavraExibida = nivel <= 3 ? chaveSorteada : opcoes[Math.floor(Math.random() * opcoes.length)];
    sinonimosAceitos = opcoes.filter(p => p !== palavraExibida);
    palavraAtual.innerText = palavraExibida.toUpperCase();
}

// 7. O Cronômetro Implacável do Jogo
function iniciarTimerJogo() {
    clearInterval(timerInterval);
    displayTimer.style.color = "#4DD0E1";
    isPlaying = true;

    timerInterval = setInterval(() => {
        tempoRestante -= 0.1;

        const boxPalavra = document.getElementById("box-palavra");

        // Gatilho de Pânico nos últimos 5s / Boss
        if (isBoss) {
            displayTimer.style.color = "#FF5252";
            boxPalavra.classList.add("alerta-tempo-urgente");
        } else if (tempoRestante <= 5.0 && tempoRestante > 3.0) {
            displayTimer.style.color = "#FF5252";
            boxPalavra.classList.remove("alerta-tempo-urgente");
            boxPalavra.classList.add("alerta-tempo");
        } else if (tempoRestante <= 3.0) {
            displayTimer.style.color = "#FF5252";
            boxPalavra.classList.remove("alerta-tempo");
            boxPalavra.classList.add("alerta-tempo-urgente"); // Pisca mais rápido!
        } else {
            // Limpa as animações de pânico se o tempo voltar ou estiver longe
            displayTimer.style.color = "#4DD0E1";
            boxPalavra.classList.remove("alerta-tempo", "alerta-tempo-urgente");
        }

        if (tempoRestante <= 0) {
            tempoRestante = 0;
            displayTimer.innerText = `TIMER: 0.0s`;
            // Limpa as animações visuais quando o tempo acaba
            boxPalavra.classList.remove("alerta-tempo", "alerta-tempo-urgente");
            clearInterval(timerInterval);
            finalizarRodada();
        } else {
            displayTimer.innerText = `TIMER: ${tempoRestante.toFixed(1)}s`;
        }
    }, 100);
}

// 8. Ouvindo o "ENTER" do jogador
inputComando.addEventListener("keypress", function(event) {
    if (event.key === "Enter" && isPlaying) {
        const entrada = inputComando.value;
        if (entrada.trim() !== "") {
            processarHack(entrada);
        }
        inputComando.value = "";
    }
});

function processarHack(entrada) {
    const tentativas = entrada.split(",").map(t => normalizar(t)).filter(t => t !== "");
    const corretos = sinonimosAceitos.map(s => normalizar(s));
    const novos = tentativas.filter(t => corretos.includes(t) && !respostasDadas.includes(t));

    if (isBoss) {
        if (novos.length >= 3) {
            score += 5000;
            displayXP.innerText = `XP: ${score}`;
            vencerJogo();
        } else if (novos.length > 0) {
            displayFeedback.innerHTML = `<span style='color:#FF5252;'>⚠ INSUFICIENTE! ACERTOU ${novos.length}. PRECISA DE 3 JUNTOS!</span>`;
        } else {
            displayFeedback.innerHTML = `<span style='color:#FF5252;'>❌ ACESSO NEGADO! Comando não reconhecido.</span>`;
        }
    } else { // Se não for nível Boss
        if (novos.length > 0) {
            
            somSucesso.currentTime = 0; 
            somSucesso.play();
            
            respostasDadas.push(...novos);
            const tempoGasto = tempoBase - tempoRestante;
            const multiplicador = tempoGasto < 5.0 ? 2 : 1;
            const xpGanho = novos.length * 100 * multiplicador;

            score += xpGanho;
            displayXP.innerText = `XP: ${score}`;

            // >>> EFEITOS VISUAIS DE ACERTO (JUICE) <<<
            if (multiplicador > 1) { // MODO TURBO!
                displayFeedback.innerHTML = `<span style='color:#FFD700;'>⚡ TURBO ATIVADO! +${xpGanho} XP (${novos.join(", ")})</span>`;
                addJuiceFloatingText(xpGanho, true); // XP Flutuante Ouro
                addJuiceFlashInput(true); // Flash Ouro
            } else { // MODO NORMAL
                displayFeedback.innerHTML = `<span style='color:#4DD0E1;'>🔓 ACESSO CONCEDIDO! +${xpGanho} XP (${novos.join(", ")})</span>`;
                addJuiceFloatingText(xpGanho, false); // XP Flutuante Cyan
                addJuiceFlashInput(false); // Flash Cyan
            }
        } else {
            // ... (o bloco de erro com o tremor/shake e o som de erro continua igual) ...
            // TOQUE O SOM DE ERRO AQUI!
            if (typeof somErro !== 'undefined' && somErro) {
                somErro.currentTime = 0;
                somErro.play().catch(e => console.warn(e));
            }
            
            displayFeedback.innerHTML = `<span style='color:#FF5252;'>❌ ACESSO NEGADO! Comando não reconhecido.</span>`;
            
            // >>> EFEITO DE TREMOR (SHAKE) <<<
            const caixaInput = document.querySelector(".input-container");
            caixaInput.classList.remove("shake"); // Reseta caso já esteja tremendo
            void caixaInput.offsetWidth; // Truque mágico do JS para forçar o reset da animação
            caixaInput.classList.add("shake"); // Aplica o tremor
        }
    }
}

// 9. Resolvendo a Rodada (Cooldown de 15s)
function finalizarRodada() {
    isPlaying = false;
    inputComando.disabled = true;

    if (respostasDadas.length > 0 && !isBoss) {
        // Mostra Tela de Resultados
        trocarTela(telaResultados);
        document.getElementById("res-chave").innerText = palavraExibida.toUpperCase();
        document.getElementById("res-sinonimos").innerText = sinonimosAceitos.join(", ");
        document.getElementById("res-lore").innerText = LORE_FRASES[Math.floor(Math.random() * LORE_FRASES.length)];
        
        // Timer de Cooldown
        let cooldownTime = 15.0;
        const resTimerDisplay = document.getElementById("res-timer");
        
        timerCooldownInterval = setInterval(() => {
            cooldownTime -= 0.1;
            resTimerDisplay.innerText = `> SALTANDO PARA PRÓXIMO NÓ EM ${cooldownTime.toFixed(1)}s...`;
            
            if (cooldownTime <= 0) {
                clearInterval(timerCooldownInterval);
                trocarTela(telaJogo);
                nivel++;
                iniciarNivel();
            }
        }, 100);

    } else {
        // AQUI ESTAVA O ERRO! Agora estamos APENAS chamando a função, e não a criando.
        gameOver();
    }
}

// 11. Telas Finais
function gameOver() {
    // Tenta tocar o áudio com proteção (evita crash se o navegador bloquear)
    if (typeof somGameOver !== 'undefined' && somGameOver) {
        somGameOver.play().catch(erro => console.warn("Áudio bloqueado:", erro));
    }
    
    // VERIFICA SE BATEU RECORDE!
    const bateuRecorde = salvarProgresso();
    let textoRecorde = bateuRecorde ? "<br><span style='color:#FFD700; font-size:1.2rem; text-shadow: 0 0 10px #FFD700;'>★ NOVO RECORDE PESSOAL! ★</span>" : "";

    palavraAtual.innerText = "CONEXÃO PERDIDA";
    palavraAtual.style.color = "#FF5252";
    
    // Exibe Tela de Game Over
    trocarTela(telaGameOver);
    document.getElementById("go-chave").innerText = palavraExibida.toUpperCase();
    document.getElementById("go-sinonimos").innerText = sinonimosAceitos.join(", ");
    document.getElementById("go-xp").innerHTML = `DADOS RECUPERADOS: ${score} XP ${textoRecorde}`;
    document.getElementById("go-nivel").innerText = `NÍVEL MÁXIMO ALCANÇADO: ${nivel}`;
}


function vencerJogo() {
    isPlaying = false;
    clearInterval(timerInterval);
    // (Fica como dever de casa criar a tela de Vitória como fizemos com o Game Over!)
    alert("VOCÊ VENCEU E DESTRUIU A OMNICORP! (Score: " + score + ")");
    location.reload();
}

// ==================== NOVAS FUNÇÕES VISUAIS (JUICE) ====================

// Cria o texto flutuante de XP (+100 XP, etc.)
function addJuiceFloatingText(xp, isTurbo) {
    const container = document.querySelector(".input-container");
    
    const floatingText = document.createElement("span");
    floatingText.classList.add("juice-floating-text");
    if (isTurbo) {
        floatingText.classList.add("turbo");
        floatingText.innerText = `+${xp} XP TURBO!`;
    } else {
        floatingText.innerText = `+${xp} XP`;
    }
    
    // Posiciona o texto flutuante acima da caixa de input
    // Centralizado horizontalmente
    floatingText.style.left = "50%";
    floatingText.style.transform = "translateX(-50%)";
    floatingText.style.top = "-20px"; // Começa um pouco acima

    container.appendChild(floatingText);
    
    // Remove o elemento após a animação de 1.2s acabar
    setTimeout(() => {
        floatingText.remove();
    }, 1200);
}

// Cria o flash visual na caixa de texto (Normal ou Turbo)
function addJuiceFlashInput(isTurbo) {
    const inputElement = inputComando; // Usamos a variável global
    
    const classeFlash = isTurbo ? "juice-flash-turbo" : "juice-flash-correct";
    
    inputElement.classList.remove("juice-flash-correct", "juice-flash-turbo");
    void inputElement.offsetWidth; // Mágica para resetar animação
    inputElement.classList.add(classeFlash);
    
    // Remove a classe após a animação de 0.4s acabar
    setTimeout(() => {
        inputElement.classList.remove(classeFlash);
    }, 400);
}
// ==================== LÓGICA DO MERCADO NEGRO ====================

const telaLojaObj = document.getElementById("tela-loja");
const lojaItens = document.getElementById("loja-itens");

// Catálogo de Skins
const catalogoTemas = [
    { id: "default", nome: "CYAN CLÁSSICO", custo: 0, cor: "#4DD0E1" },
    { id: "matrix", nome: "MATRIZ VERDE", custo: 10000, cor: "#00FF41" },
    { id: "sangue", nome: "SANGUE DE IA", custo: 25000, cor: "#FF003C" }
];

document.getElementById("btn-loja").addEventListener("click", () => {
    abrirLoja();
    trocarTela(telaLojaObj);
});

document.getElementById("btn-voltar-loja").addEventListener("click", () => {
    trocarTela(telaIntro);
    atualizarRecordeUI();
});

function aplicarTema(nomeTema) {
    document.body.className = ""; // Limpa temas antigos
    if (nomeTema !== "default") {
        document.body.classList.add(`tema-${nomeTema}`);
    }
    localStorage.setItem("lexisTemaAtual", nomeTema);
    temaAtual = nomeTema;
}

function processarCompra(idTema, custo) {
    if (temasDesbloqueados.includes(idTema)) {
        aplicarTema(idTema); // Já tem? Só equipa!
        if(somSucesso) somSucesso.play();
        abrirLoja();
    } else if (saldoXP >= custo) {
        saldoXP -= custo; // Desconta o saldo
        localStorage.setItem("lexisSaldoXP", saldoXP);
        temasDesbloqueados.push(idTema); // Guarda na carteira
        localStorage.setItem("lexisTemas", JSON.stringify(temasDesbloqueados));
        
        aplicarTema(idTema); // Equipa o novo
        if(somSucesso) somSucesso.play();
        abrirLoja();
    } else {
        if(somErro) somErro.play();
        alert("ACESSO NEGADO: SALDO DE XP INSUFICIENTE!");
    }
}

function abrirLoja() {
    document.getElementById("loja-saldo").innerHTML = `SALDO ATUAL: <b style="color:#FFD700;">${saldoXP} XP</b>`;
    lojaItens.innerHTML = "";
    
    catalogoTemas.forEach(tema => {
        const jaPossui = temasDesbloqueados.includes(tema.id);
        const estaEquipado = (temaAtual === tema.id);
        
        let textoBotao = "COMPRAR";
        let corBotao = tema.cor;
        
        if (estaEquipado) { textoBotao = "EQUIPADO"; corBotao = "#555"; }
        else if (jaPossui) { textoBotao = "EQUIPAR"; }

        const div = document.createElement("div");
        div.className = "loja-item";
        div.innerHTML = `
            <div>
                <h3 style="color:${tema.cor}">${tema.nome}</h3>
                <p>${jaPossui ? "Acesso Liberado" : "Custo: " + tema.custo + " XP"}</p>
            </div>
            <button class="btn-cyber" style="border-color:${corBotao}; color:${corBotao};" 
                onclick="processarCompra('${tema.id}', ${tema.custo})">${textoBotao}</button>
        `;
        lojaItens.appendChild(div);
    });
}

// Aplica o tema salvo logo que o jogo abre
aplicarTema(temaAtual);
// ==========================================
// BOOT DO SISTEMA
// ==========================================
atualizarRecordeUI(); // Lê a memória e exibe na Intro
carregarBancoDeDados();