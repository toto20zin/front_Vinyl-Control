'use strict';

/* ==========================================================
   Vinyl Control - script.js
   Dados salvos no localStorage do navegador (sem servidor).
   ========================================================== */

/* ---------- Configuração ---------- */
const CHAVES = {
    discos: 'vinylcontrol.discos',
    movimentacoes: 'vinylcontrol.movimentacoes',
    sessao: 'vinylcontrol.sessao'
};

// Usuário de acesso (troque quando houver um back-end de verdade)
const USUARIOS = [
    { email: 'fbthomas@gmail.com', senha: '123456', nome: 'thomas' },
    { email: 'gtpiffer@gmail.com', senha: '123456', nome: 'gaby' }
];

const DISCOS_INICIAIS = [
    { id: 1, titulo: 'Abbey Road', artista: 'The Beatles', genero: 'Rock', custo: 85, venda: 179.9, qtd: 5, min: 2 },
    { id: 2, titulo: 'Dark Side of the Moon', artista: 'Pink Floyd', genero: 'Rock Progressivo', custo: 90, venda: 189.9, qtd: 8, min: 3 },
    { id: 3, titulo: 'Kind of Blue', artista: 'Miles Davis', genero: 'Jazz', custo: 75, venda: 159.9, qtd: 2, min: 3 }
];

/* ---------- Utilitários ---------- */
const $ = (id) => document.getElementById(id);

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const normalizar = (texto) =>
    String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const porTitulo = (a, b) =>
    a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' });

function hoje() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function lerStorage(chave, padrao) {
    try {
        const bruto = localStorage.getItem(chave);
        return bruto === null ? padrao : JSON.parse(bruto);
    } catch {
        return padrao;
    }
}

function gravarStorage(chave, valor) {
    try {
        localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
        /* armazenamento indisponível: os dados valem só nesta sessão */
    }
}

function mostrarAlerta(elemento, tipo, mensagem) {
    if (!elemento) return;
    elemento.className = `alert ${tipo}`;
    elemento.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    elemento.textContent = mensagem;
}

function esconderAlerta(elemento) {
    if (elemento) elemento.classList.add('hidden');
}

function criarCelula(texto, classe) {
    const td = document.createElement('td');
    td.textContent = texto;
    if (classe) td.className = classe;
    return td;
}

/* ---------- Estado ---------- */
let discos = lerStorage(CHAVES.discos, DISCOS_INICIAIS);
let movimentacoes = lerStorage(CHAVES.movimentacoes, []);

function salvarDiscos() { gravarStorage(CHAVES.discos, discos); }
function salvarMovimentacoes() { gravarStorage(CHAVES.movimentacoes, movimentacoes); }

function proximoId(lista) {
    return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
}

function statusDoDisco(disco) {
    if (disco.qtd === 0) return { texto: 'Sem estoque', classe: 'badge-zero' };
    if (disco.qtd < disco.min) return { texto: 'Abaixo do mínimo', classe: 'badge-low' };
    return { texto: 'Normal', classe: 'badge-ok' };
}

/* ---------- Navegação entre telas ---------- */
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach((tela) => {
        tela.classList.toggle('active', tela.id === id);
    });

    // O menu lateral só aparece quando o utilizador está logado (fora do login-screen)
    document.body.classList.toggle('com-menu', id !== 'login-screen');

    // Destaca a opção ativa no menu lateral
    document.querySelectorAll('.nav-item[data-tela]').forEach((item) => {
        const ativo = item.dataset.tela === id;
        item.classList.toggle('active', ativo);
        if (ativo) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
    });

    fecharMenuLateral();
    window.scrollTo(0, 0);
}

function fecharMenuLateral() {
    const sidebar = $('sidebar');
    const overlay = $('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
}

function abrirCadastro() {
    cancelarEdicao();
    esconderAlerta($('cadastro-alert'));
    if ($('search-input')) $('search-input').value = '';
    renderizarCadastro();
    mostrarTela('cadastro-screen');
}

function abrirVendas() {
    esconderAlerta($('stock-warning-alert'));
    esconderAlerta($('movimentacao-alert'));
    if ($('movimentacao-form')) $('movimentacao-form').reset();
    if ($('data-movimentacao')) $('data-movimentacao').value = hoje();
    renderizarVendas();
    mostrarTela('vendas-screen');
}

/* ==========================================================
   1. LOGIN / LOGOUT
   ========================================================== */
function entrar(usuario) {
    if ($('user-display')) $('user-display').textContent = usuario.nome;
    if ($('sidebar-user')) $('sidebar-user').textContent = usuario.nome;
    mostrarTela('main-screen');
}

if ($('login-form')) {
    $('login-form').addEventListener('submit', (evento) => {
        evento.preventDefault();

        const email = $('login-email').value.trim().toLowerCase();
        const senha = $('login-senha').value;
        const usuario = USUARIOS.find((u) => u.email === email && u.senha === senha);

        if (!usuario) {
            $('login-alert').classList.remove('hidden');
            $('login-senha').value = '';
            $('login-senha').focus();
            return;
        }

        esconderAlerta($('login-alert'));
        gravarStorage(CHAVES.sessao, usuario.email);
        $('login-form').reset();
        entrar(usuario);
    });
}

['login-email', 'login-senha'].forEach((id) => {
    if ($(id)) $(id).addEventListener('input', () => esconderAlerta($('login-alert')));
});

function efetuarLogout() {
    try { localStorage.removeItem(CHAVES.sessao); } catch { /* ignora */ }
    if ($('login-form')) $('login-form').reset();
    esconderAlerta($('login-alert'));
    mostrarTela('login-screen');
    if ($('login-email')) $('login-email').focus();
}

if ($('btn-logout')) $('btn-logout').addEventListener('click', efetuarLogout);
if ($('btn-logout-sidebar')) $('btn-logout-sidebar').addEventListener('click', efetuarLogout);

/* ==========================================================
   2. MENU PRINCIPAL E MENU LATERAL
   ========================================================== */
if ($('card-cadastro')) $('card-cadastro').addEventListener('click', abrirCadastro);
if ($('card-vendas')) $('card-vendas').addEventListener('click', abrirVendas);

document.querySelectorAll('.btn-back').forEach((botao) => {
    botao.addEventListener('click', () => mostrarTela('main-screen'));
});

// Clique nos itens do menu lateral
document.querySelectorAll('.nav-item[data-tela]').forEach((item) => {
    item.addEventListener('click', () => {
        const tela = item.dataset.tela;
        if (tela === 'cadastro-screen') abrirCadastro();
        else if (tela === 'vendas-screen') abrirVendas();
        else mostrarTela('main-screen');
    });
});

// Menu responsivo em ecrãs pequenos
if ($('btn-menu-toggle')) {
    $('btn-menu-toggle').addEventListener('click', () => {
        const sidebar = $('sidebar');
        if (sidebar) sidebar.classList.toggle('open');
        if ($('sidebar-overlay')) $('sidebar-overlay').classList.toggle('hidden');
    });
}

if ($('sidebar-overlay')) {
    $('sidebar-overlay').addEventListener('click', fecharMenuLateral);
}

/* ==========================================================
   3. CADASTRO DE DISCO
   ========================================================== */
function renderizarCadastro() {
    const termo = normalizar($('search-input') ? $('search-input').value : '');
    const tbody = $('tbody-cadastro');
    if (!tbody) return;
    tbody.replaceChildren();

    const lista = discos
        .filter((d) => normalizar(`${d.titulo} ${d.artista}`).includes(termo))
        .sort((a, b) => a.id - b.id);

    if (lista.length === 0) {
        const tr = document.createElement('tr');
        const td = criarCelula(termo ? 'Nenhum disco encontrado para esta busca.' : 'Nenhum disco cadastrado ainda.', 'empty-row');
        td.colSpan = 9;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    lista.forEach((disco) => {
        const tr = document.createElement('tr');
        if (disco.qtd < disco.min) tr.className = 'row-low';

        tr.append(
            criarCelula(disco.id),
            criarCelula(disco.titulo),
            criarCelula(disco.artista),
            criarCelula(disco.genero || '-'),
            criarCelula(moeda.format(disco.custo)),
            criarCelula(moeda.format(disco.venda)),
            criarCelula(disco.qtd),
            criarCelula(disco.min)
        );

        const acoes = document.createElement('td');
        acoes.className = 'actions-cell';
        acoes.append(
            criarBotaoAcao('Editar', 'editar', disco.id, 'btn-secondary', `Editar ${disco.titulo}`),
            criarBotaoAcao('Excluir', 'excluir', disco.id, 'btn-danger-outline', `Excluir ${disco.titulo}`)
        );
        tr.appendChild(acoes);
        tbody.appendChild(tr);
    });
}

function criarBotaoAcao(texto, acao, id, classe, rotulo) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `btn btn-small ${classe}`;
    botao.textContent = texto;
    botao.dataset.acao = acao;
    botao.dataset.id = id;
    botao.setAttribute('aria-label', rotulo);
    return botao;
}

function lerFormularioDisco() {
    return {
        titulo: $('disco-titulo').value.trim(),
        artista: $('disco-artista').value.trim(),
        genero: $('disco-genero').value.trim(),
        custo: parseFloat($('disco-preco-custo').value),
        venda: parseFloat($('disco-preco-venda').value),
        qtd: parseInt($('disco-qtd').value, 10),
        min: parseInt($('disco-min').value, 10)
    };
}

function validarDisco(dados, idAtual) {
    if (!dados.titulo || !dados.artista) {
        return 'Informe o título e o artista.';
    }
    const numeros = [dados.custo, dados.venda, dados.qtd, dados.min];
    if (numeros.some((n) => !Number.isFinite(n) || n < 0)) {
        return 'Preços e quantidades devem ser números maiores ou iguais a zero.';
    }
    const duplicado = discos.some((d) =>
        d.id !== idAtual &&
        normalizar(d.titulo) === normalizar(dados.titulo) &&
        normalizar(d.artista) === normalizar(dados.artista)
    );
    if (duplicado) {
        return 'Este disco já está cadastrado para este artista.';
    }
    return '';
}

if ($('disco-form')) {
    $('disco-form').addEventListener('submit', (evento) => {
        evento.preventDefault();

        const idAtual = $('disco-id').value ? Number($('disco-id').value) : null;
        const dados = lerFormularioDisco();
        const erro = validarDisco(dados, idAtual);

        if (erro) {
            mostrarAlerta($('cadastro-alert'), 'error', erro);
            return;
        }

        if (idAtual) {
            const disco = discos.find((d) => d.id === idAtual);
            Object.assign(disco, dados);
            mostrarAlerta($('cadastro-alert'), 'success', `Disco "${dados.titulo}" atualizado com sucesso.`);
        } else {
            discos.push({ id: proximoId(discos), ...dados });
            mostrarAlerta($('cadastro-alert'), 'success', `Disco "${dados.titulo}" cadastrado com sucesso.`);
        }

        salvarDiscos();
        cancelarEdicao();
        renderizarCadastro();
    });
}

function iniciarEdicao(id) {
    const disco = discos.find((d) => d.id === id);
    if (!disco) return;

    $('disco-id').value = disco.id;
    $('disco-titulo').value = disco.titulo;
    $('disco-artista').value = disco.artista;
    $('disco-genero').value = disco.genero;
    $('disco-preco-custo').value = disco.custo;
    $('disco-preco-venda').value = disco.venda;
    $('disco-qtd').value = disco.qtd;
    $('disco-min').value = disco.min;

    $('form-disco-title').textContent = `Editar Disco #${disco.id}`;
    $('btn-cancelar-edicao').classList.remove('hidden');
    esconderAlerta($('cadastro-alert'));
    $('disco-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('disco-titulo').focus({ preventScroll: true });
}

function cancelarEdicao() {
    if ($('disco-form')) $('disco-form').reset();
    if ($('disco-id')) $('disco-id').value = '';
    if ($('form-disco-title')) $('form-disco-title').textContent = 'Inserir Novo Disco';
    if ($('btn-cancelar-edicao')) $('btn-cancelar-edicao').classList.add('hidden');
}

function excluirDisco(id) {
    const disco = discos.find((d) => d.id === id);
    if (!disco) return;

    if (!window.confirm(`Excluir o disco "${disco.titulo}" de ${disco.artista}?`)) return;

    discos = discos.filter((d) => d.id !== id);
    salvarDiscos();

    if (Number($('disco-id').value) === id) cancelarEdicao();
    renderizarCadastro();
    mostrarAlerta($('cadastro-alert'), 'success', `Disco "${disco.titulo}" excluído.`);
}

if ($('btn-cancelar-edicao')) {
    $('btn-cancelar-edicao').addEventListener('click', () => {
        cancelarEdicao();
        esconderAlerta($('cadastro-alert'));
    });
}

if ($('search-input')) $('search-input').addEventListener('input', renderizarCadastro);

if ($('tbody-cadastro')) {
    $('tbody-cadastro').addEventListener('click', (evento) => {
        const botao = evento.target.closest('button[data-acao]');
        if (!botao) return;

        const id = Number(botao.dataset.id);
        if (botao.dataset.acao === 'editar') iniciarEdicao(id);
        if (botao.dataset.acao === 'excluir') excluirDisco(id);
    });
}

/* ==========================================================
   4. GESTÃO DE ACERVO E VENDAS
   ========================================================== */
if ($('movimentacao-form')) {
    const alertaMovimentacao = document.createElement('div');
    alertaMovimentacao.id = 'movimentacao-alert';
    alertaMovimentacao.className = 'alert hidden';
    $('movimentacao-form').insertBefore(
        alertaMovimentacao,
        $('movimentacao-form').querySelector('button[type="submit"]')
    );

    $('movimentacao-form').addEventListener('submit', (evento) => {
        evento.preventDefault();

        esconderAlerta($('stock-warning-alert'));

        const disco = discos.find((d) => String(d.id) === $('select-disco').value);
        const tipo = $('tipo-movimentacao').value;
        const quantidade = parseInt($('qtd-movimentacao').value, 10);
        const data = $('data-movimentacao').value;
        const observacao = $('obs-movimentacao').value.trim();

        if (!disco) {
            mostrarAlerta(alertaMovimentacao, 'error', 'Selecione um disco.');
            return;
        }
        if (!Number.isInteger(quantidade) || quantidade < 1) {
            mostrarAlerta(alertaMovimentacao, 'error', 'Informe uma quantidade válida (mínimo 1).');
            return;
        }
        if (tipo === 'saida' && quantidade > disco.qtd) {
            mostrarAlerta(
                alertaMovimentacao,
                'error',
                `Estoque insuficiente: "${disco.titulo}" tem apenas ${disco.qtd} unidade(s).`
            );
            return;
        }

        disco.qtd += tipo === 'entrada' ? quantidade : -quantidade;

        movimentacoes.push({
            id: proximoId(movimentacoes),
            discoId: disco.id,
            titulo: disco.titulo,
            tipo,
            quantidade,
            data,
            observacao,
            registradoEm: new Date().toISOString()
        });

        salvarDiscos();
        salvarMovimentacoes();

        const acao = tipo === 'saida' ? 'Venda' : 'Reposição';
        mostrarAlerta(
            alertaMovimentacao,
            'success',
            `${acao} registrada: ${quantidade} unidade(s) de "${disco.titulo}". Estoque atual: ${disco.qtd}.`
        );

        if (tipo === 'saida' && disco.qtd < disco.min) {
            mostrarAvisoEstoqueMinimo(disco);
        }

        $('select-disco').value = '';
        $('qtd-movimentacao').value = '';
        $('obs-movimentacao').value = '';
        renderizarVendas();
    });

    ['select-disco', 'tipo-movimentacao', 'qtd-movimentacao'].forEach((id) => {
        if ($(id)) $(id).addEventListener('input', () => esconderAlerta(alertaMovimentacao));
    });
}

function renderizarVendas() {
    const ordenados = [...discos].sort(porTitulo);

    const select = $('select-disco');
    if (select) {
        const selecionado = select.value;
        select.replaceChildren(new Option('-- Selecione um disco --', ''));
        ordenados.forEach((d) => {
            select.add(new Option(`${d.titulo} (${d.artista})`, d.id));
        });
        if (ordenados.some((d) => String(d.id) === selecionado)) select.value = selecionado;
    }

    const tbody = $('tbody-vendas-alfabetico');
    if (!tbody) return;
    tbody.replaceChildren();

    if (ordenados.length === 0) {
        const tr = document.createElement('tr');
        const td = criarCelula('Nenhum disco cadastrado.', 'empty-row');
        td.colSpan = 5;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    ordenados.forEach((disco) => {
        const status = statusDoDisco(disco);
        const tr = document.createElement('tr');
        if (disco.qtd < disco.min) tr.className = 'row-low';

        const celulaStatus = document.createElement('td');
        const selo = document.createElement('span');
        selo.className = `badge ${status.classe}`;
        selo.textContent = status.texto;
        celulaStatus.appendChild(selo);

        tr.append(
            criarCelula(disco.titulo),
            criarCelula(disco.artista),
            criarCelula(disco.qtd),
            criarCelula(disco.min),
            celulaStatus
        );
        tbody.appendChild(tr);
    });
}

function mostrarAvisoEstoqueMinimo(disco) {
    const aviso = $('stock-warning-alert');
    if (!aviso) return;
    const forte = document.createElement('strong');
    forte.textContent = 'Atenção!';
    aviso.replaceChildren(
        forte,
        ` O estoque de "${disco.titulo}" ficou abaixo do limite mínimo (${disco.qtd} em estoque, mínimo ${disco.min}).`
    );
    aviso.classList.remove('hidden');
}

/* ==========================================================
   5. INICIALIZAÇÃO DA SESSÃO
   ========================================================== */
try {
    if (localStorage.getItem(CHAVES.discos) === null) salvarDiscos();
} catch { /* ignora */ }

const emailSessao = lerStorage(CHAVES.sessao, null);
const usuarioSessao = USUARIOS.find((u) => u.email === emailSessao);
if (usuarioSessao) {
    entrar(usuarioSessao);
} else {
    mostrarTela('login-screen');
}