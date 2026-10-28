'use strict';

/* ==========================================================
   Vinyl Control - script.js (Completo e Integrado com o Backend)
   ========================================================== */

const API_URL = 'http://localhost:3000';

const CHAVES = {
    sessao: 'vinylcontrol.sessao'
};

/* ---------- Utilitários ---------- */
const $ = (id) => document.getElementById(id);

const moeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

const normalizar = (texto) =>
    String(texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const porTitulo = (a, b) =>
    a.titulo.localeCompare(b.titulo, 'pt-BR', {
        sensitivity: 'base'
    });

function hoje() {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
}

function mostrarAlerta(elemento, tipo, mensagem) {
    if (!elemento) return;

    elemento.className = `alert ${tipo}`;
    elemento.setAttribute(
        'role',
        tipo === 'error' ? 'alert' : 'status'
    );
    elemento.textContent = mensagem;
    elemento.classList.remove('hidden');
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

function statusDoDisco(disco) {
    if (disco.qtd === 0) {
        return {
            texto: 'Sem estoque',
            classe: 'badge-zero'
        };
    }

    if (disco.qtd < disco.min) {
        return {
            texto: 'Abaixo do mínimo',
            classe: 'badge-low'
        };
    }

    return {
        texto: 'Normal',
        classe: 'badge-ok'
    };
}


function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach((tela) => {
        tela.classList.toggle('active', tela.id === id);
    });

    // O menu lateral aparece se não estivermos em telas de autenticação
    document.body.classList.toggle(
        'com-menu',
        id !== 'login-screen' && id !== 'cadastro-usuario-screen'
    );

    document.querySelectorAll('.nav-item[data-tela]').forEach((item) => {
        const ativo = item.dataset.tela === id;

        item.classList.toggle('active', ativo);

        if (ativo) {
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
    });

    // Se abrirmos a tela principal, renderizamos os dados do dashboard
    if (id === 'main-screen') {
        renderizarDashboard();
    }

    fecharMenuLateral();
    window.scrollTo(0, 0);
}

function fecharMenuLateral() {
    const sidebar = $('sidebar');
    const overlay = $('sidebar-overlay');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
}

async function abrirCadastro() {
    cancelarEdicao();
    esconderAlerta($('cadastro-alert'));

    if ($('search-input')) {
        $('search-input').value = '';
    }

    await renderizarCadastro();
    mostrarTela('cadastro-screen');
}

async function abrirVendas() {
    esconderAlerta($('stock-warning-alert'));

    const alertaMov = $('movimentacao-alert');

    if (alertaMov) esconderAlerta(alertaMov);

    if ($('movimentacao-form')) {
        $('movimentacao-form').reset();
    }

    if ($('data-movimentacao')) {
        $('data-movimentacao').value = hoje();
    }

    await renderizarVendas();
    mostrarTela('vendas-screen');
}


/* ==========================================================
   1. LOGIN / LOGOUT E REGISTO DE UTILIZADORES
   ========================================================== */

const linkIrCadastro = $('link-ir-cadastro');
if (linkIrCadastro) {
    linkIrCadastro.addEventListener('click', (e) => {
        e.preventDefault();
        esconderAlerta($('cadastro-usuario-alert'));
        if ($('cadastro-usuario-form')) $('cadastro-usuario-form').reset();
        mostrarTela('cadastro-usuario-screen');
    });
}

const linkIrLogin = $('link-ir-login');
if (linkIrLogin) {
    linkIrLogin.addEventListener('click', (e) => {
        e.preventDefault();
        esconderAlerta($('login-alert'));
        if ($('login-form')) $('login-form').reset();
        mostrarTela('login-screen');
    });
}

const cadastroUsuarioForm = $('cadastro-usuario-form');
if (cadastroUsuarioForm) {
    cadastroUsuarioForm.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const nome = $('reg-nome').value.trim();
        const email = $('reg-email').value.trim().toLowerCase();
        const senha = $('reg-senha').value;

        try {
            const resposta = await fetch(`${API_URL}/usuario/cadastrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarAlerta($('cadastro-usuario-alert'), 'error', dados.mensagem || 'Erro ao cadastrar utilizador.');
                return;
            }

            mostrarAlerta($('cadastro-usuario-alert'), 'success', 'Conta criada com sucesso! Redirecionando para o login...');
            cadastroUsuarioForm.reset();

            setTimeout(() => {
                esconderAlerta($('cadastro-usuario-alert'));
                mostrarTela('login-screen');
            }, 2000);

        } catch (erro) {
            console.error('Erro ao cadastrar utilizador:', erro);
            mostrarAlerta($('cadastro-usuario-alert'), 'error', 'Não foi possível conectar ao servidor.');
        }
    });
}

const loginForm = $('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const emailInput = $('login-email').value.trim().toLowerCase();
        const senhaInput = $('login-senha').value;

        try {
            const resposta = await fetch(`${API_URL}/usuario/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput, senha: senhaInput })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                mostrarAlerta($('login-alert'), 'error', dados.mensagem || 'E-mail ou senha incorretos.');
                if ($('login-senha')) {
                    $('login-senha').value = '';
                    $('login-senha').focus();
                }
                return;
            }

            const usuario = dados.usuario;
            if (!usuario || !usuario.id) {
                mostrarAlerta($('login-alert'), 'error', 'Não foi possível identificar o usuário.');
                return;
            }

            esconderAlerta($('login-alert'));
            localStorage.setItem(CHAVES.sessao, JSON.stringify(usuario));
            loginForm.reset();
            entrar(usuario);

        } catch (erro) {
            console.error('Erro ao realizar login:', erro);
            mostrarAlerta($('login-alert'), 'error', 'Não foi possível conectar ao servidor.');
        }
    });
}

function entrar(usuario) {
    if ($('user-display')) {
        $('user-display').textContent = usuario.nome;
    }

    if ($('sidebar-user')) {
        $('sidebar-user').textContent = usuario.nome;
    }

    mostrarTela('main-screen');
}

['login-email', 'login-senha'].forEach((id) => {
    const el = $(id);
    if (el) {
        el.addEventListener('input', () => {
            esconderAlerta($('login-alert'));
        });
    }
});

function sair() {
    try {
        localStorage.removeItem(CHAVES.sessao);
    } catch {}

    if (loginForm) loginForm.reset();
    esconderAlerta($('login-alert'));
    mostrarTela('login-screen');

    if ($('login-email')) {
        $('login-email').focus();
    }
}

if ($('btn-logout')) $('btn-logout').addEventListener('click', sair);
if ($('btn-logout-sidebar')) $('btn-logout-sidebar').addEventListener('click', sair);


/* ==========================================================
   2. DASHBOARD MODERNO E NAVEGAÇÃO
   ========================================================== */

if ($('btn-quick-cadastro')) {
    $('btn-quick-cadastro').addEventListener('click', abrirCadastro);
}

if ($('btn-quick-vendas')) {
    $('btn-quick-vendas').addEventListener('click', abrirVendas);
}

document.querySelectorAll('.btn-back').forEach((botao) => {
    botao.addEventListener('click', () => {
        mostrarTela('main-screen');
    });
});

document.querySelectorAll('.nav-item[data-tela]').forEach((item) => {
    item.addEventListener('click', () => {
        const tela = item.dataset.tela;
        if (tela === 'cadastro-screen') {
            abrirCadastro();
        } else if (tela === 'vendas-screen') {
            abrirVendas();
        } else {
            mostrarTela('main-screen');
        }
    });
});

async function renderizarDashboard() {
    const discos = await buscarDiscosDoBanco();

    const totalDiscos = discos.length;
    const totalEstoque = discos.reduce((acc, d) => acc + d.qtd, 0);
    const abaixoMinimo = discos.filter((d) => d.qtd < d.min);

    if ($('stat-total-discos')) $('stat-total-discos').textContent = totalDiscos;
    if ($('stat-total-estoque')) $('stat-total-estoque').textContent = totalEstoque;
    if ($('stat-abaixo-minimo')) $('stat-abaixo-minimo').textContent = abaixoMinimo.length;

    const containerEstoqueBaixo = $('lista-estoque-baixo');
    if (containerEstoqueBaixo) {
        containerEstoqueBaixo.replaceChildren();

        if (abaixoMinimo.length === 0) {
            containerEstoqueBaixo.innerHTML = '<div class="empty-row">Nenhum disco abaixo do mínimo.</div>';
        } else {
            abaixoMinimo.forEach((disco) => {
                const item = document.createElement('div');
                item.className = 'dashboard-item';
                item.innerHTML = `
                    <div class="item-info-principal">
                        <span class="item-titulo">${disco.titulo}</span>
                        <span class="item-sub">${disco.artista}</span>
                    </div>
                    <span class="item-badge badge-warning">${disco.qtd} / mín. ${disco.min}</span>
                `;
                containerEstoqueBaixo.appendChild(item);
            });
        }
    }

    try {
        const respMov = await fetch(`${API_URL}/movimentacao/listar`);
        if (respMov.ok) {
            const movimentacoes = await respMov.json();
            if ($('stat-movimentacoes')) $('stat-movimentacoes').textContent = movimentacoes.length;

            const containerMov = $('lista-movimentacoes-recentes');
            if (containerMov && movimentacoes.length > 0) {
                containerMov.replaceChildren();
                movimentacoes.slice(-4).reverse().forEach((m) => {
                    const tipoTexto = m.tipo === 'SAIDA' ? 'Saída' : 'Entrada';
                    const badgeClass = m.tipo === 'SAIDA' ? 'badge-saida' : 'badge-entrada';
                    
                    const item = document.createElement('div');
                    item.className = 'dashboard-item';
                    item.innerHTML = `
                        <div class="item-info-principal">
                            <span class="item-titulo">${m.disco ? m.disco.titulo : 'Disco #' + m.discoId}</span>
                            <span class="item-sub">Qtd: ${m.quantidade}</span>
                        </div>
                        <span class="item-badge ${badgeClass}">${tipoTexto} ${m.quantidade}</span>
                    `;
                    containerMov.appendChild(item);
                });
            }
        }
    } catch {}
}


/* ==========================================================
   3. CADASTRO DE DISCO
   ========================================================== */

async function buscarDiscosDoBanco() {
    try {
        const resposta = await fetch(`${API_URL}/disco/listar`);
        if (!resposta.ok) return [];

        const dados = await resposta.json();

        return dados.map((d) => ({
            id: d.id,
            titulo: d.titulo,
            artista: d.artista,
            genero: d.genero,
            custo: parseFloat(d.preco_custo) || 0,
            venda: parseFloat(d.preco_venda) || 0,
            qtd: parseInt(d.quantidade, 10) || 0,
            min: parseInt(d.estoque_min, 10) || 0
        }));
    } catch {
        return [];
    }
}

async function renderizarCadastro() {
    const termo = normalizar($('search-input')?.value || '');
    const tbody = $('tbody-cadastro');

    if (!tbody) return;

    tbody.replaceChildren();

    const discos = await buscarDiscosDoBanco();
    const lista = discos
        .filter((d) => normalizar(`${d.titulo} ${d.artista}`).includes(termo))
        .sort((a, b) => a.id - b.id);

    if (lista.length === 0) {
        const tr = document.createElement('tr');
        const td = criarCelula(
            termo ? 'Nenhum disco encontrado para esta busca.' : 'Nenhum disco cadastrado ainda.',
            'empty-row'
        );
        td.colSpan = 9;
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    lista.forEach((disco) => {
        const tr = document.createElement('tr');

        if (disco.qtd < disco.min) {
            tr.className = 'row-low';
        }

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

const discoForm = $('disco-form');
if (discoForm) {
    discoForm.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const idAtual = $('disco-id').value ? Number($('disco-id').value) : null;
        const dadosParaEnviar = {
            titulo: $('disco-titulo').value.trim(),
            artista: $('disco-artista').value.trim(),
            genero: $('disco-genero').value.trim(),
            preco_custo: String($('disco-preco-custo').value),
            preco_venda: String($('disco-preco-venda').value),
            quantidade: String($('disco-qtd').value),
            estoque_min: String($('disco-min').value)
        };

        try {
            let resposta;
            if (idAtual) {
                resposta = await fetch(`${API_URL}/disco/atualizar/${idAtual}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosParaEnviar)
                });
            } else {
                resposta = await fetch(`${API_URL}/disco/cadastrar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosParaEnviar)
                });
            }

            if (!resposta.ok) throw new Error('Erro ao salvar no servidor');

            mostrarAlerta($('cadastro-alert'), 'success', 'Disco salvo com sucesso.');
            cancelarEdicao();
            renderizarCadastro();

        } catch (erro) {
            console.error('Erro ao salvar disco:', erro);
            mostrarAlerta($('cadastro-alert'), 'error', 'Erro ao salvar o disco.');
        }
    });
}

async function iniciarEdicao(id) {
    const discos = await buscarDiscosDoBanco();
    const disco = discos.find((d) => d.id === id);

    if (!disco) return;

    if ($('disco-id')) $('disco-id').value = disco.id;
    if ($('disco-titulo')) $('disco-titulo').value = disco.titulo;
    if ($('disco-artista')) $('disco-artista').value = disco.artista;
    if ($('disco-genero')) $('disco-genero').value = disco.genero;
    if ($('disco-preco-custo')) $('disco-preco-custo').value = disco.custo;
    if ($('disco-preco-venda')) $('disco-preco-venda').value = disco.venda;
    if ($('disco-qtd')) $('disco-qtd').value = disco.qtd;
    if ($('disco-min')) $('disco-min').value = disco.min;

    if ($('form-disco-title')) {
        $('form-disco-title').textContent = `Editar Disco #${disco.id}`;
    }

    if ($('btn-cancelar-edicao')) {
        $('btn-cancelar-edicao').classList.remove('hidden');
    }

    esconderAlerta($('cadastro-alert'));

    if ($('disco-form')) {
        $('disco-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function cancelarEdicao() {
    if ($('disco-form')) $('disco-form').reset();
    if ($('disco-id')) $('disco-id').value = '';

    if ($('form-disco-title')) {
        $('form-disco-title').textContent = 'Inserir Novo Disco';
    }

    if ($('btn-cancelar-edicao')) {
        $('btn-cancelar-edicao').classList.add('hidden');
    }
}

async function excluirDisco(id) {
    if (!window.confirm('Deseja excluir este disco?')) return;

    try {
        const resposta = await fetch(`${API_URL}/disco/excluir/${id}`, {
            method: 'DELETE'
        });

        if (!resposta.ok) throw new Error('Erro ao excluir');

        renderizarCadastro();
        mostrarAlerta($('cadastro-alert'), 'success', 'Disco excluído com sucesso.');

    } catch (erro) {
        console.error('Erro ao excluir disco:', erro);
        mostrarAlerta($('cadastro-alert'), 'error', 'Erro ao excluir o disco.');
    }
}

if ($('btn-cancelar-edicao')) {
    $('btn-cancelar-edicao').addEventListener('click', () => {
        cancelarEdicao();
        esconderAlerta($('cadastro-alert'));
    });
}

if ($('search-input')) {
    $('search-input').addEventListener('input', renderizarCadastro);
}

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

const movForm = $('movimentacao-form');
let alertaMovimentacao = null;

if (movForm) {
    alertaMovimentacao = document.createElement('div');
    alertaMovimentacao.id = 'movimentacao-alert';
    alertaMovimentacao.className = 'alert hidden';

    movForm.insertBefore(
        alertaMovimentacao,
        movForm.querySelector('button[type="submit"]')
    );

    movForm.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        esconderAlerta($('stock-warning-alert'));

        const discoId = parseInt($('select-disco')?.value, 10);
        const tipo = $('tipo-movimentacao')?.value.toUpperCase();
        const quantidade = parseInt($('qtd-movimentacao')?.value || 0, 10);
        const data = $('data-movimentacao')?.value;

        const sessaoStr = localStorage.getItem(CHAVES.sessao);
        const usuarioLogado = sessaoStr ? JSON.parse(sessaoStr) : null;

        if (!discoId) {
            mostrarAlerta(alertaMovimentacao, 'error', 'Selecione um disco.');
            return;
        }

        const dadosMovimentacao = {
            tipo,
            data: data ? new Date(data).toISOString() : new Date().toISOString(),
            quantidade,
            discoId,
            usuarioId: usuarioLogado ? usuarioLogado.id : 1
        };

        try {
            const resposta = await fetch(`${API_URL}/movimentacao/cadastrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosMovimentacao)
            });

            if (!resposta.ok) throw new Error('Erro ao registrar movimentação');

            mostrarAlerta(alertaMovimentacao, 'success', 'Movimentação registrada com sucesso!');
            movForm.reset();

            if ($('data-movimentacao')) {
                $('data-movimentacao').value = hoje();
            }

            renderizarVendas();

        } catch (erro) {
            console.error('Erro ao registrar movimentação:', erro);
            mostrarAlerta(alertaMovimentacao, 'error', 'Erro ao processar movimentação.');
        }
    });
}

async function renderizarVendas() {
    const discos = await buscarDiscosDoBanco();
    const ordenados = [...discos].sort(porTitulo);

    const select = $('select-disco');
    if (select) {
        const selecionado = select.value;
        select.replaceChildren(new Option('-- Selecione um disco --', ''));

        ordenados.forEach((d) => {
            select.add(new Option(`${d.titulo} (${d.artista})`, d.id));
        });

        if (ordenados.some((d) => String(d.id) === selecionado)) {
            select.value = selecionado;
        }
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

        if (disco.qtd < disco.min) {
            tr.className = 'row-low';
        }

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


/* ==========================================================
   5. INICIALIZAÇÃO DA SESSÃO
   ========================================================== */

const sessaoSalva = localStorage.getItem(CHAVES.sessao);

if (sessaoSalva) {
    try {
        const usuario = JSON.parse(sessaoSalva);
        if (usuario && usuario.id) {
            entrar(usuario);
        } else {
            localStorage.removeItem(CHAVES.sessao);
            mostrarTela('login-screen');
        }
    } catch {
        localStorage.removeItem(CHAVES.sessao);
        mostrarTela('login-screen');
    }
} else {
    mostrarTela('login-screen');
}