/* Gênius */

const TEMPO_LIMITE = 120;
const NOTAS = [330, 277, 220, 165];
const URL_PLANILHA = 'https://script.google.com/macros/s/AKfycbwvZAz6DxSVKT99lM7xZEK6tqFrTfRQ6zhHZZq7R3TiPEa0K-kRTxriX7Td_yVghPlkug/exec';

// Estado do jogo
let sequencia = [];
let posicao = 0;
let pontos = 0;
let podeTocar = false;
let segundos = TEMPO_LIMITE;
let meuApelido = '';
let rankingLocal = [];
let audio = null;

// temporizadores
let idCronometro = null;
let idExibicao = null;
let idProxima = null;

const telas = document.querySelectorAll('.tela');
const pads = document.querySelectorAll('.pad');
const mensagem = document.querySelector('#status');
const campoApelido = document.querySelector('#apelido');
const btnSalvar = document.querySelector('#btn-salvar');
const avisoRanking = document.querySelector('#aviso-ranking');
const telaCarregando = document.querySelector('#carregando');


/* ---------- TELAS ---------- */

function mostrarTela(id) {
    telas.forEach(function (tela) {
        tela.classList.add('escondida');
    });
    document.querySelector(id).classList.remove('escondida');
}


function mostrarCarregando() {
    telaCarregando.classList.remove('escondida');
}

function esconderCarregando() {
    telaCarregando.classList.add('escondida');
}


/* ---------- TEMPORIZADORES ---------- */
function pararTudo() {
    clearInterval(idCronometro);
    clearInterval(idExibicao);
    clearTimeout(idProxima);
    idCronometro = null;
    idExibicao = null;
    idProxima = null;
}


/* ---------- COR E SOM ---------- */
function apagarTudo() {
    pads.forEach(function (pad) {
        pad.classList.remove('aceso');
    });
}

function acender(cor) {
    pads[cor].classList.add('aceso');
    tocarSom(cor);
}

function tocarSom(cor) {
    if (!audio) {
        return;
    }
    const oscilador = audio.createOscillator();
    const volume = audio.createGain();

    oscilador.frequency.value = NOTAS[cor];
    volume.gain.setValueAtTime(0.2, audio.currentTime);
    volume.gain.linearRampToValueAtTime(0, audio.currentTime + 0.25);

    oscilador.connect(volume);
    volume.connect(audio.destination);
    oscilador.start();
    oscilador.stop(audio.currentTime + 0.25);
}


/* ---------- CRONÔMETRO ---------- */
function atualizarTempo() {
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    document.querySelector('#tempo').textContent = minutos + ':' + String(resto).padStart(2, '0');
}


/* ---------- JOGO ---------- */
function iniciar() {
    if (!audio && window.AudioContext) { 
        audio = new AudioContext();
    }

    pararTudo();
    apagarTudo();

    sequencia = [];
    posicao = 0;
    pontos = 0;
    podeTocar = false;
    segundos = TEMPO_LIMITE;

    document.querySelector('#pontos').textContent = '0';
    atualizarTempo();
    mostrarTela('#tela-jogo');

    idCronometro = setInterval(function () {
        segundos--;
        atualizarTempo();
        if (segundos <= 0) {
            fimDeJogo('Acabou o tempo!');
        }
    }, 1000);

    idProxima = setTimeout(proximaRodada, 700);
}

function proximaRodada() {
    posicao = 0;
    sequencia.push(Math.floor(Math.random() * 4));
    exibirSequencia();
}

// mostra a sequência 
function exibirSequencia() {
    podeTocar = false;
    mensagem.textContent = 'Preste atenção...';

    let passo = 0;
    let aceso = false;
    const velocidade = Math.max(150, 350 - sequencia.length * 12);

    idExibicao = setInterval(function () {
        if (aceso) {
            apagarTudo();
            aceso = false;

            if (passo === sequencia.length) {
                clearInterval(idExibicao);
                podeTocar = true;
                mensagem.textContent = 'Sua vez!';
            }
            return;
        }

        acender(sequencia[passo]);
        passo++;
        aceso = true;
    }, velocidade);
}

function jogar(cor) {
    if (!podeTocar) {
        return;
    }

    acender(cor);
    setTimeout(apagarTudo, 200);

    // errou a cor
    if (cor !== sequencia[posicao]) {
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        fimDeJogo('Fim de jogo!');
        return;
    }

    // acertou esta cor
    posicao++;

    // acertou a sequência inteira: ponto e próxima rodada
    if (posicao === sequencia.length) {
        pontos = sequencia.length;
        document.querySelector('#pontos').textContent = pontos;
        podeTocar = false;
        mensagem.textContent = 'Boa!';
        idProxima = setTimeout(proximaRodada, 800);
    }
}

function fimDeJogo(motivo) {
    pararTudo();
    apagarTudo();
    podeTocar = false;

    document.querySelector('#motivo').textContent = motivo;
    document.querySelector('#resultado').textContent = pontos;
    campoApelido.value = '';
    btnSalvar.disabled = false;

    mostrarTela('#tela-fim');
}

function reiniciar() {
    pararTudo();
    apagarTudo();

    sequencia = [];
    posicao = 0;
    pontos = 0;
    podeTocar = false;
    segundos = TEMPO_LIMITE;
    meuApelido = '';

    document.querySelector('#pontos').textContent = '0';
    mensagem.textContent = 'Preste atenção...';
    atualizarTempo();

    mostrarTela('#tela-inicio');
}


/* ---------- RANKING ---------- */
function limparApelido(texto) {
    return String(texto || '').replace(/[<>]/g, '').trim().slice(0, 12);
}

async function enviarParaPlanilha(apelido) {
    try {
        await fetch(URL_PLANILHA, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ apelido: apelido, pontuacao: pontos })
        });
    } catch (erro) {
        console.log("Erro ao enviar para planilha");
    }
}

async function buscarDaPlanilha() {
    try {
        const resposta = await fetch(URL_PLANILHA + '?acao=ranking');
        const dados = await resposta.json();
        return dados.ranking;
    } catch (erro) {
        console.log("Erro ao buscar da planilha");
    }
}

function desenharRanking(lista) {
    const ol = document.querySelector('#lista');
    ol.textContent = '';

    if (!lista || lista.length === 0) {
        const vazio = document.createElement('li');
        vazio.classList.add('vazio');
        vazio.textContent = 'Seja o primeiro do ranking!';
        ol.appendChild(vazio);
        return;
    }

    // mostra do 1 ao 10
    const dezPrimeiros = lista.slice(0, 10);

    dezPrimeiros.forEach(function (item, i) {
        const apelido = limparApelido(item.apelido);
        const li = document.createElement('li');

        const posicao = document.createElement('span');
        posicao.classList.add('posicao');
        posicao.textContent = i + 1;

        const nome = document.createElement('span');
        nome.classList.add('nome');
        nome.textContent = apelido;

        const pontuacao = document.createElement('span');
        pontuacao.classList.add('pontuacao');
        pontuacao.textContent = item.pontuacao;

        li.appendChild(posicao);
        li.appendChild(nome);
        li.appendChild(pontuacao);

        if (apelido === meuApelido) {
            li.classList.add('voce');
        }

        ol.appendChild(li);
    });
}

async function mostrarRanking() {
    mostrarCarregando();

    const daPlanilha = await buscarDaPlanilha();

    if (daPlanilha) {
        avisoRanking.textContent = 'Ranking geral';
        desenharRanking(daPlanilha);
    } else {
        avisoRanking.textContent = 'Ranking deste aparelho (sem internet)';
        desenharRanking(rankingLocal);
    }

    mostrarTela('#tela-ranking');
    esconderCarregando();
}

async function salvarPontuacao() {
    meuApelido = limparApelido(campoApelido.value) || 'Visitante';

    rankingLocal.push({ apelido: meuApelido, pontuacao: pontos });
    rankingLocal.sort(function (a, b) {
        return b.pontuacao - a.pontuacao;
    });

    btnSalvar.disabled = true;
    mostrarCarregando();

    await enviarParaPlanilha(meuApelido);
    await mostrarRanking();

    btnSalvar.disabled = false;
}


/* ---------- BOTÕES ---------- */

// Cada pad recebe o seu número pela posição na lista: 0, 1, 2 e 3
pads.forEach(function (pad, cor) {
    pad.addEventListener('click', function () {
        jogar(cor);
    });
});

document.querySelector('#btn-iniciar').addEventListener('click', iniciar);
document.querySelector('#btn-salvar').addEventListener('click', salvarPontuacao);
document.querySelector('#btn-pular').addEventListener('click', function () {
    meuApelido = '';
    mostrarRanking();
});

document.querySelectorAll('.btn-novo').forEach(function (botao) {
    botao.addEventListener('click', reiniciar);
});
