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
let tempoRestante = 15.0;
let timerInterval;
let timerCooldownInterval;
let palavraExibida = "";
let sinonimosAceitos = [];
let respostasDadas = [];
let isBoss = false;
let isPlaying = false;
// Substitua a linha antiga do tempoBase por esta:
let tempoBase = 25.0; // Apenas o valor inicial
// Memória Persistente (Local Storage)
let highScore = parseInt(localStorage.getItem("lexisHighScore")) || 0;
let highNivel = parseInt(localStorage.getItem("lexisHighNivel")) || 1;
let saldoXP = parseInt(localStorage.getItem("lexisSaldoXP")) || 0;
let temasDesbloqueados = JSON.parse(localStorage.getItem("lexisTemas")) || ["default"];
let temaAtual = localStorage.getItem("lexisTemaAtual") || "default";
let ultimaTrilha = ""; // Variável global para controle

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

// Conectando os Sons e UI de Áudio
const bgmPlayer = document.getElementById("bgm-player");
const btnMute = document.getElementById("btn-mute");

// >>> ATENÇÃO: Coloque aqui o nome exato dos seus 3 arquivos MP3 <<<
const trilhas = ["audio/Clockwork_Breach.mp3", "audio/Second_Before_Impact.mp3", "audio/Protocol_Breach.mp3"]; 
let isMuted = false;

const textoMissao = `
<span style="color:#4DD0E1;">> OPERADOR, ACORDE:... </span><br>

<b>A linguagem é a maior arma da humanidade. Sem palavras, não há ideias. Sem ideias, não há rebelião.</b><br><br>

No ano 2077, descobrimos a terrível verdade: a <b>OmniCorp</b> é uma fachada administrada por CEOs alienígenas. O objetivo deles? Apagar o nosso vocabulário para nos tornar escravos domesticados e mudos.<br><br>

Nós, da <i>Resistência LEXIS</i>, hackeamos o Mainframe. Esta é a sua chance de injetar as palavras proibidas e libertar a humanidade.<br><br>

<b style="color:#E0F7FA;">VOCÊ É A NOSSA ÚLTIMA ESPERANÇA.</b><br><br>

<b style="color:#E0F7FA;">[ DIRETRIZES DA MISSÃO ]</b><br>
<b style="color:#4DD0E1;">1.</b> O sistema exibirá um <b>NÓ CRIPTOGRAFADO</b>.<br>
<b style="color:#4DD0E1;">2.</b> Injete <b>SINÔNIMOS</b> válidos para coletar XP.<br>
<b style="color:#FF5252;">3.</b> Sobreviva até o <b>NÍVEL 10</b> para enfrentar o Núcleo.<br>
`;

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
    if (bgmPlayer.paused) {
        iniciarBGM();
    } // Dá o play na música!
    trocarTela(telaJogo);
    nivel = 1;
    score = 0;
    displayXP.innerText = `XP: ${score}`;
    iniciarNivel();
});

// 6. Preparando a rodada
// 6. Preparando a rodada
function iniciarNivel() {
    // 1º: Definimos se é Boss ANTES de calcular o tempo (Ordem Crítica!)
    isBoss = (nivel >= 10); 
    // Se acabou de virar Boss, troca a música para dar impacto!
    if (isBoss) {
        iniciarBGM(); 
    }
    
    // 2º: Agora sim calculamos o tempo baseado no feedback do jogador (25s -> 15s)
    tempoBase = isBoss ? 30.0 : Math.max(15.0, 26.0 - nivel);
    
    tempoRestante = tempoBase;
    respostasDadas = [];

    // Tenta iniciar a música se ela ainda não disparou
    iniciarBGM();
    
    if (isBoss) {
        displayNivel.innerText = "⚠ MAINFRAME OMNICORP ALCANÇADO ⚠";
        displayNivel.classList.add("hud-boss");
        palavraAtual.classList.add("palavra-boss");
        inputComando.placeholder = "Insira 3 chaves (separadas por vírgula)...";
    } else {
        displayNivel.innerText = `NÍVEL DE ACESSO: 0${nivel}`;
        // Limpa classes de boss se o jogador reiniciou
        displayNivel.classList.remove("hud-boss");
        palavraAtual.classList.remove("palavra-boss");
        inputComando.placeholder = "Injete os sinônimos e farme XP...";
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

// >>> FALTAVA ISSO: O catálogo de onde o JS lê os nomes e preços <<<
const catalogoTemas = [
    { id: "vampiro", nome: "SANGUE DE IA (PULSE)", custo: 500, cor: "#FF5252" },
    { id: "alien", nome: "OMNICORP ALIEN (ACID)", custo: 1000, cor: "#9eff2e" },
    { id: "blade", nome: "NEON DYSTOPIA (RETRO)", custo: 2000, cor: "#ff00ff" }
];

document.getElementById("btn-loja").addEventListener("click", () => {
    abrirLoja();
    trocarTela(telaLojaObj);
});

document.getElementById("btn-voltar-loja").addEventListener("click", () => {
    trocarTela(telaIntro);
    atualizarRecordeUI();
});

function aplicarTema(tema) {
    const root = document.documentElement;
    const vignette = document.getElementById("vignette");
    
    // 1. O GRANDE RESET
    if(vignette) {
        vignette.style.display = "none";
        vignette.style.animation = "none";
    }
    document.body.style.textShadow = "none";

    // 2. APLICANDO AS PALETAS PROFUNDAS
    if (tema === 'default') {
        // CYAN CLÁSSICO
        root.style.setProperty('--bg-color', '#0a0e17');
        root.style.setProperty('--panel-bg', 'rgba(10, 14, 23, 0.85)');
        root.style.setProperty('--text-main', '#E0F7FA');
        root.style.setProperty('--text-accent', '#4DD0E1');
        root.style.setProperty('--border-color', '#4DD0E1');
        root.style.setProperty('--glow-color', 'rgba(77, 208, 225, 0.3)');
        root.style.setProperty('--font-main', "'Orbitron', sans-serif");
    } 
    else if (tema === 'vampiro') {
        // SANGUE DE IA (Tudo escuro, vermelho profundo)
        root.style.setProperty('--bg-color', '#050000');
        root.style.setProperty('--panel-bg', 'rgba(20, 0, 0, 0.9)');
        root.style.setProperty('--text-main', '#ffcccc');
        root.style.setProperty('--text-accent', '#FF5252');
        root.style.setProperty('--border-color', '#8B0000'); // Borda mais escura que o texto!
        root.style.setProperty('--glow-color', 'rgba(255, 82, 82, 0.4)');
        root.style.setProperty('--font-main', "'Orbitron', sans-serif");
        if(vignette) {
            vignette.style.display = "block";
            vignette.style.animation = "pulse-blood 2s infinite";
        }
    }
    else if (tema === 'alien') {
        // OMNICORP ALIEN (Tóxico, verde escuro, fonte de máquina)
        root.style.setProperty('--bg-color', '#020d02');
        root.style.setProperty('--panel-bg', 'rgba(5, 20, 5, 0.9)');
        root.style.setProperty('--text-main', '#ccffcc');
        root.style.setProperty('--text-accent', '#9eff2e');
        root.style.setProperty('--border-color', '#32cd32');
        root.style.setProperty('--glow-color', 'rgba(158, 255, 46, 0.3)');
        root.style.setProperty('--font-main', "'Courier New', monospace");
    }
    else if (tema === 'blade') {
        // NEON DYSTOPIA (Fundo Roxo escuro, botões Ciano, Texto Rosa)
        root.style.setProperty('--bg-color', '#0b0014');
        root.style.setProperty('--panel-bg', 'rgba(20, 0, 30, 0.85)');
        root.style.setProperty('--text-main', '#e0cce0');
        root.style.setProperty('--text-accent', '#ff00ff'); // Neon Rosa
        root.style.setProperty('--border-color', '#00ffff'); // Bordas Ciano
        root.style.setProperty('--glow-color', 'rgba(255, 0, 255, 0.4)');
        root.style.setProperty('--font-main', "'Orbitron', sans-serif");
        // A Oclusão Cromática
        document.body.style.textShadow = "2px 0 #00ffff, -2px 0 #ff00ff";
    }

    localStorage.setItem("lexisTemaAtual", tema);
}

function processarCompra(idTema, custo) {
    if (temasDesbloqueados.includes(idTema)) {
        aplicarTema(idTema); 
        if(somSucesso) somSucesso.play().catch(()=>{});
        abrirLoja();
    } else if (saldoXP >= custo) {
        saldoXP -= custo; 
        localStorage.setItem("lexisSaldoXP", saldoXP);
        temasDesbloqueados.push(idTema); 
        localStorage.setItem("lexisTemas", JSON.stringify(temasDesbloqueados));
        
        aplicarTema(idTema); 
        if(somSucesso) somSucesso.play().catch(()=>{});
        abrirLoja();
    } else {
        if(somErro) somErro.play().catch(()=>{});
        alert("ACESSO NEGADO: SALDO DE XP INSUFICIENTE!");
    }
}

function abrirLoja() {
    document.getElementById("loja-saldo").innerHTML = `SALDO ATUAL: <b style="color:#FFD700;">${saldoXP} XP</b>`;
    lojaItens.innerHTML = ""; // Agora apaga só a lista, sem apagar o título!
    
    catalogoTemas.forEach(tema => {
        const jaPossui = temasDesbloqueados.includes(tema.id);
        const estaEquipado = (temaAtual === tema.id);
        
        let textoBotao = "COMPRAR";
        let corBotao = tema.cor;
        
        if (estaEquipado) { textoBotao = "EQUIPADO"; corBotao = "#555"; }
        else if (jaPossui) { textoBotao = "EQUIPAR"; }

        const div = document.createElement("div");
        div.className = "loja-item"; // Estilo que usaremos no CSS
        div.innerHTML = `
            <div>
                <h3 style="color:${tema.cor}; margin-bottom:5px;">${tema.nome}</h3>
                <p style="font-size:0.9rem;">${jaPossui ? "Acesso Liberado" : "Custo: " + tema.custo + " XP"}</p>
            </div>
            <button class="btn-cyber" style="border-color:${corBotao}; color:${corBotao};" 
                onclick="processarCompra('${tema.id}', ${tema.custo})">${textoBotao}</button>
        `;
        lojaItens.appendChild(div);
    });
}

// Aplica o tema salvo logo que o jogo abre
aplicarTema(temaAtual);

// ==================== RÁDIO DA RESISTÊNCIA ====================

// Lógica de Mutar/Desmutar
btnMute.addEventListener("click", () => {
    isMuted = !isMuted;
    bgmPlayer.muted = isMuted;
    btnMute.innerText = isMuted ? "🔇 BGM: OFF" : "🔊 BGM: ON";
    btnMute.classList.toggle("mutado", isMuted);
});

// Função para tocar uma música aleatória (evitando repetir a mesma se possível)
function iniciarBGM() {
    // 1. Filtra as trilhas para remover a que acabou de tocar
    const opcoesDisponiveis = trilhas.filter(t => t !== ultimaTrilha);
    
    // 2. Sorteia apenas entre as que sobraram
    const novaTrilha = opcoesDisponiveis[Math.floor(Math.random() * opcoesDisponiveis.length)];
    
    // 3. Atualiza o player e a memória do sistema
    ultimaTrilha = novaTrilha;
    bgmPlayer.src = novaTrilha;
    bgmPlayer.volume = 0.3;
    
    // 4. Força o carregamento e o play
    bgmPlayer.load(); 
    bgmPlayer.play().catch(e => console.warn("Erro ao trocar música:", e));
}

// Garante que quando a música acabar, o sistema chame a nova lógica
bgmPlayer.onended = function() {
    iniciarBGM();
};

const somTeclado = document.getElementById("som-teclado");

function efeitoDigitacao(elemento, texto, index = 0) {
    if (index < texto.length) {
        if (texto.charAt(index) === "<") {
            let finalTag = texto.indexOf(">", index);
            index = finalTag + 1;
        } else {
            // Toca o som de tecla se não for espaço e o áudio estiver liberado
            if (texto.charAt(index) !== " " && !isMuted) {
                somTeclado.currentTime = 0;
                somTeclado.volume = 0.2;
                somTeclado.play().catch(() => {}); // Ignora erro se o browser bloquear
            }
            index++;
        }

        elemento.innerHTML = texto.slice(0, index) + '<span class="cursor-terminal"></span>';
        
        let delay = 20; 
        const charAnterior = texto.charAt(index - 1);
        if (charAnterior === "." || charAnterior === ":") delay = 400;

        setTimeout(() => {
            efeitoDigitacao(elemento, texto, index);
        }, delay);
    }
}

// Dispara o efeito assim que a página carrega
// Altere o seu window.onload para isso:
window.onload = () => {
    // Criamos um "Overlay" de segurança para liberar o áudio
    const overlay = document.createElement("div");
    overlay.id = "audio-unlock";
    overlay.innerHTML = `<div class="btn-cyber" style="cursor:pointer;">> ESTABELECER CONEXÃO [CLIQUE PARA ENTRAR]</div>`;
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(10,14,23,0.95); z-index:10000; display:flex; align-items:center; justify-content:center;";
    document.body.appendChild(overlay);

    overlay.addEventListener("click", () => {
        overlay.remove(); // Remove o aviso
        iniciarBGM();     // Liga a música!
        
        const boxLore = document.getElementById("texto-lore");
        if (boxLore) {
            boxLore.innerHTML = ""; // Limpa antes de começar
            efeitoDigitacao(boxLore, textoMissao);
        }
    });

    atualizarRecordeUI();
    aplicarTema(temaAtual);
};

// ==========================================
// BOOT DO SISTEMA
// ==========================================
atualizarRecordeUI(); // Lê a memória e exibe na Intro
carregarBancoDeDados();