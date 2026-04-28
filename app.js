// ================================================================
// TECCONTROL — app.js
// Lógica principal do sistema com Firebase
//
// ESTRUTURA:
// 1. Configuração do Firebase (VOCÊ PRECISA PREENCHER AQUI)
// 2. Inicialização dos serviços
// 3. Autenticação (login/logout)
// 4. Funções de banco de dados (Firestore)
// 5. Navegação entre páginas
// 6. Dashboard
// 7. Técnicos
// 8. Controle de Cursos
// 9. Presença do Dia
// 10. Importação em Massa
// 11. Relatórios
// 12. Configurações
// 13. Utilitários (toast, modal, datas)
// ================================================================

// ================================================================
// IMPORTS DO FIREBASE (versão modular)
// Importamos apenas o que precisamos para o app ser mais leve
// ================================================================
import { initializeApp }         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore,
         collection, doc,
         setDoc, getDoc,
         getDocs, updateDoc,
         deleteDoc, query,
         where, orderBy,
         serverTimestamp }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth,
         signInWithEmailAndPassword,
         createUserWithEmailAndPassword,
         signOut,
         onAuthStateChanged }    from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ================================================================
// 1. CONFIGURAÇÃO DO FIREBASE
// ⚠️  ATENÇÃO: Substitua os valores abaixo com os da SUA conta!
//
// Como obter:
// 1. Acesse https://console.firebase.google.com
// 2. Crie ou abra seu projeto
// 3. Clique na engrenagem ⚙️ → "Configurações do projeto"
// 4. Role até "Seus apps" → clique no ícone </> (Web)
// 5. Copie o objeto firebaseConfig e cole aqui
// ================================================================
const firebaseConfig = {
  apiKey:            "AIzaSyCPjWARITOC9JCzk0WjQwJkXAce3U1Z5Vw",
  authDomain:        "controle-tecnicos.firebaseapp.com",
  projectId:         "controle-tecnicos",
  storageBucket:     "controle-tecnicos.firebasestorage.app",
  messagingSenderId: "670452138960",
  appId:             "1:670452138960:web:5684b9aeb24273f4c9afd5"
};

// ================================================================
// 2. INICIALIZAÇÃO DOS SERVIÇOS FIREBASE
// ================================================================

// Inicia o app Firebase com as configurações acima
const app = initializeApp(firebaseConfig);

// Instância do banco de dados Firestore
const db = getFirestore(app);

// Instância de autenticação
const auth = getAuth(app);

// ================================================================
// 3. AUTENTICAÇÃO — Login / Logout
// ================================================================

// Referências aos elementos HTML de login
const telaLogin  = document.getElementById("tela-login");
const telaApp    = document.getElementById("app");
const loginErro  = document.getElementById("login-erro");

// -----------------------------------------------------------------
// onAuthStateChanged: Firebase chama isso automaticamente
// sempre que o estado de autenticação muda (login ou logout)
// É aqui que controlamos o que o usuário vê
// -----------------------------------------------------------------
onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    // Usuário está logado → mostrar o sistema
    telaLogin.style.display  = "none";
    telaApp.style.display    = "flex";

    // Mostrar o email do usuário na sidebar
    document.getElementById("usuario-email-label").textContent = usuario.email;

    // Carregar os dados iniciais
    inicializarSistema();
  } else {
    // Usuário saiu → mostrar tela de login
    telaLogin.style.display  = "flex";
    telaApp.style.display    = "none";
  }
});

// -----------------------------------------------------------------
// Botão "Entrar" — faz login com email e senha
// -----------------------------------------------------------------
document.getElementById("btn-entrar").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;

  // Validação básica
  if (!email || !senha) {
    mostrarErroLogin("Preencha email e senha.");
    return;
  }

  try {
    // Tenta fazer login no Firebase Authentication
    await signInWithEmailAndPassword(auth, email, senha);
    // Se der certo, onAuthStateChanged vai reagir automaticamente
  } catch (erro) {
    // Se der errado, mostra mensagem de erro
    mostrarErroLogin(traduzirErroAuth(erro.code));
  }
});

// -----------------------------------------------------------------
// Botão "Criar conta" — cria novo usuário
// -----------------------------------------------------------------
document.getElementById("btn-criar-conta").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const senha = document.getElementById("login-senha").value;

  if (!email || !senha) {
    mostrarErroLogin("Preencha email e senha para criar a conta.");
    return;
  }

  if (senha.length < 6) {
    mostrarErroLogin("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, senha);
    // onAuthStateChanged vai reagir automaticamente
  } catch (erro) {
    mostrarErroLogin(traduzirErroAuth(erro.code));
  }
});

// -----------------------------------------------------------------
// Botão "Sair"
// -----------------------------------------------------------------
document.getElementById("btn-sair").addEventListener("click", async () => {
  await signOut(auth);
});

// Mostra mensagem de erro na tela de login
function mostrarErroLogin(msg) {
  loginErro.textContent   = msg;
  loginErro.style.display = "block";
}

// Traduz os códigos de erro do Firebase para português
function traduzirErroAuth(codigo) {
  const erros = {
    "auth/user-not-found":      "Usuário não encontrado.",
    "auth/wrong-password":      "Senha incorreta.",
    "auth/invalid-email":       "Email inválido.",
    "auth/email-already-in-use":"Este email já está em uso.",
    "auth/weak-password":       "Senha fraca. Use pelo menos 6 caracteres.",
    "auth/invalid-credential":  "Email ou senha incorretos.",
    "auth/too-many-requests":   "Muitas tentativas. Tente novamente mais tarde.",
  };
  return erros[codigo] || "Erro ao autenticar. Tente novamente.";
}

// ================================================================
// 4. FUNÇÕES DE BANCO DE DADOS (Firestore)
//
// ESTRUTURA DO BANCO:
// /tecnicos/{tecnicoId}             → dados do técnico
// /tecnicos/{tecnicoId}/cursos/{id} → cursos do técnico
// /presencas/{id}                   → registros de presença
// /configuracoes/emails             → emails do supervisor/gestor
// ================================================================

// -----------------------------------------------------------------
// TÉCNICOS — Buscar todos
// -----------------------------------------------------------------
async function buscarTecnicos() {
  const snap = await getDocs(collection(db, "tecnicos"));
  const lista = [];
  snap.forEach(doc => {
    lista.push({ id: doc.id, ...doc.data() });
  });
  // Ordenar por nome alfabeticamente
  lista.sort((a, b) => a.nome.localeCompare(b.nome));
  return lista;
}

// -----------------------------------------------------------------
// TÉCNICOS — Buscar um técnico + seus cursos
// -----------------------------------------------------------------
async function buscarTecnicoComCursos(tecnicoId) {
  // Busca o documento do técnico
  const tecDoc = await getDoc(doc(db, "tecnicos", tecnicoId));
  if (!tecDoc.exists()) return null;

  const tecnico = { id: tecDoc.id, ...tecDoc.data() };

  // Busca todos os cursos dentro da subcoleção
  const cursosSnap = await getDocs(collection(db, "tecnicos", tecnicoId, "cursos"));
  tecnico.cursos = [];
  cursosSnap.forEach(c => {
    tecnico.cursos.push({ id: c.id, ...c.data() });
  });

  return tecnico;
}

// -----------------------------------------------------------------
// TÉCNICOS — Buscar todos COM seus cursos (para tabela de controle)
// -----------------------------------------------------------------
async function buscarTodosTecnicosComCursos() {
  const tecnicos = await buscarTecnicos();

  // Para cada técnico, busca os cursos em paralelo (Promise.all = mais rápido)
  await Promise.all(tecnicos.map(async (tec) => {
    const cursosSnap = await getDocs(collection(db, "tecnicos", tec.id, "cursos"));
    tec.cursos = [];
    cursosSnap.forEach(c => {
      tec.cursos.push({ id: c.id, ...c.data() });
    });
  }));

  return tecnicos;
}

// -----------------------------------------------------------------
// TÉCNICOS — Salvar (criar novo)
// -----------------------------------------------------------------
async function criarTecnico(dados) {
  // Gera um ID único baseado na matrícula (para evitar duplicatas)
  const id = "tec_" + dados.matricula.replace(/\s/g, "_");

  // Verifica se já existe um técnico com essa matrícula
  const existente = await getDoc(doc(db, "tecnicos", id));
  if (existente.exists()) {
    throw new Error(`Técnico com matrícula ${dados.matricula} já existe.`);
  }

  // Cria o documento no Firestore
  await setDoc(doc(db, "tecnicos", id), {
    nome:      dados.nome,
    matricula: dados.matricula,
    funcao:    dados.funcao || "",
    email:     dados.email || "",
    criadoEm: serverTimestamp()
  });

  return id;
}

// -----------------------------------------------------------------
// TÉCNICOS — Excluir
// -----------------------------------------------------------------
async function excluirTecnico(tecnicoId) {
  // Primeiro exclui todos os cursos do técnico
  const cursosSnap = await getDocs(collection(db, "tecnicos", tecnicoId, "cursos"));
  await Promise.all(cursosSnap.docs.map(c => deleteDoc(c.ref)));

  // Depois exclui o técnico
  await deleteDoc(doc(db, "tecnicos", tecnicoId));
}

// -----------------------------------------------------------------
// CURSOS — Salvar/Atualizar curso de um técnico
// -----------------------------------------------------------------
async function salvarCurso(tecnicoId, dadosCurso) {
  // ID do curso baseado no nome (para evitar duplicatas do mesmo curso)
  const cursoNomeLimpo = dadosCurso.nomeCurso.replace(/\s/g, "_");
  const cursoId = dadosCurso.cursoId || ("curso_" + cursoNomeLimpo);

  // Calcula a data de vencimento: data da reciclagem + 2 anos
  const dataVencimento = adicionarAnos(dadosCurso.dataReciclagem, 2);

  // Salva na subcoleção de cursos do técnico
  await setDoc(doc(db, "tecnicos", tecnicoId, "cursos", cursoId), {
    nomeCurso:       dadosCurso.nomeCurso,
    dataReciclagem:  dadosCurso.dataReciclagem,
    dataVencimento:  dataVencimento,
    atualizadoEm:   serverTimestamp()
  });

  return cursoId;
}

// -----------------------------------------------------------------
// CURSOS — Excluir
// -----------------------------------------------------------------
async function excluirCurso(tecnicoId, cursoId) {
  await deleteDoc(doc(db, "tecnicos", tecnicoId, "cursos", cursoId));
}

// -----------------------------------------------------------------
// PRESENÇAS — Buscar por data
// -----------------------------------------------------------------
async function buscarPresencasPorData(data) {
  // Filtra os documentos onde o campo "data" é igual à data informada
  const q = query(
    collection(db, "presencas"),
    where("data", "==", data)
  );
  const snap = await getDocs(q);
  const lista = [];
  snap.forEach(d => lista.push({ id: d.id, ...d.data() }));
  return lista;
}

// -----------------------------------------------------------------
// PRESENÇAS — Salvar registro do dia
// -----------------------------------------------------------------
async function salvarPresenca(data, tecnicoId, nome, cursosSelecionados) {
  // ID único por data + técnico
  const id = `${data}_${tecnicoId}`;

  await setDoc(doc(db, "presencas", id), {
    data:             data,
    tecnicoId:        tecnicoId,
    nome:             nome,
    cursosRealizados: cursosSelecionados,
    registradoEm:    serverTimestamp()
  });

  // Se o técnico realizou algum curso hoje, atualiza a data de reciclagem
  for (const nomeCurso of cursosSelecionados) {
    const cursoId = "curso_" + nomeCurso.replace(/\s/g, "_");
    await salvarCurso(tecnicoId, {
      nomeCurso:      nomeCurso,
      dataReciclagem: data,
      cursoId:        cursoId
    });
  }
}

// -----------------------------------------------------------------
// CONFIGURAÇÕES — Buscar emails
// -----------------------------------------------------------------
async function buscarConfiguracoes() {
  const snap = await getDoc(doc(db, "configuracoes", "emails"));
  if (snap.exists()) return snap.data();
  return { emailSupervisor: "", emailGestor: "" };
}

// -----------------------------------------------------------------
// CONFIGURAÇÕES — Salvar emails
// -----------------------------------------------------------------
async function salvarConfiguracoes(dados) {
  await setDoc(doc(db, "configuracoes", "emails"), dados);
}

// ================================================================
// 5. NAVEGAÇÃO ENTRE PÁGINAS
// ================================================================

// Adiciona evento de clique em todos os itens do menu
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const pagina = item.dataset.pagina;

    // Remove "ativo" de todos os itens e páginas
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("ativo"));
    document.querySelectorAll(".pagina").forEach(p => p.classList.remove("ativa"));

    // Ativa o item clicado e a página correspondente
    item.classList.add("ativo");
    document.getElementById("pagina-" + pagina).classList.add("ativa");

    // Carrega os dados específicos de cada página ao abrir
    if (pagina === "dashboard")   renderDashboard();
    if (pagina === "tecnicos")    renderTecnicos();
    if (pagina === "controle")    renderControle();
    if (pagina === "presenca")    renderPresenca();
    if (pagina === "config")      carregarConfig();
  });
});

// ================================================================
// 6. INICIALIZAÇÃO DO SISTEMA
// Chamado logo após o login bem-sucedido
// ================================================================

async function inicializarSistema() {
  // Define datas padrão nos campos de data
  const hoje = dataHoje();
  document.getElementById("data-presenca").value  = hoje;
  document.getElementById("data-relatorio").value = hoje;

  // Mostra o dashboard
  renderDashboard();
}

// ================================================================
// 6. DASHBOARD
// ================================================================

async function renderDashboard() {
  // Atualiza o label da data
  document.getElementById("data-hoje-label").textContent =
    new Date().toLocaleDateString("pt-BR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

  try {
    // Busca todos os técnicos com cursos
    const tecnicos = await buscarTodosTecnicosComCursos();

    let total = tecnicos.length;
    let ok = 0, aviso = 0, vencido = 0;
    let alertas = [];

    // Percorre cada técnico e cada curso para calcular status
    tecnicos.forEach(tec => {
      (tec.cursos || []).forEach(curso => {
        const status = calcularStatus(curso.dataVencimento);

        if (status.label === "Em Dia")   ok++;
        if (status.label === "Próximo") {
          aviso++;
          alertas.push({ tec: tec.nome, mat: tec.matricula, curso: curso.nomeCurso, venc: curso.dataVencimento, status });
        }
        if (status.label === "Vencido") {
          vencido++;
          alertas.push({ tec: tec.nome, mat: tec.matricula, curso: curso.nomeCurso, venc: curso.dataVencimento, status });
        }
      });
    });

    // Atualiza os cards de estatísticas
    document.getElementById("stat-total").textContent   = total;
    document.getElementById("stat-ok").textContent      = ok;
    document.getElementById("stat-aviso").textContent   = aviso;
    document.getElementById("stat-vencido").textContent = vencido;

    // Renderiza tabela de alertas
    const alertasEl = document.getElementById("alertas-lista");
    if (alertas.length === 0) {
      alertasEl.innerHTML = estadoVazio("Nenhum alerta no momento ✅", "Todos os cursos estão em dia!");
    } else {
      // Ordena por data de vencimento (mais urgente primeiro)
      alertas.sort((a, b) => a.venc.localeCompare(b.venc));

      alertasEl.innerHTML = `
        <div class="tabela-wrap">
          <table>
            <thead><tr>
              <th>Técnico</th><th>Matrícula</th>
              <th>Curso</th><th>Vencimento</th><th>Status</th>
            </tr></thead>
            <tbody>
              ${alertas.slice(0, 15).map(a => `
                <tr>
                  <td>${a.tec}</td>
                  <td>${a.mat}</td>
                  <td>${a.curso}</td>
                  <td>${formatarData(a.venc)}</td>
                  <td><span class="badge ${a.status.classe}">${a.status.label}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    // Presenças de hoje
    const hoje = dataHoje();
    const presencasHoje = await buscarPresencasPorData(hoje);
    const presEl = document.getElementById("presencas-hoje");

    if (presencasHoje.length === 0) {
      presEl.innerHTML = `<p style="color:var(--texto2);font-size:13px">Nenhuma presença registrada hoje ainda.</p>`;
    } else {
      presEl.innerHTML = `
        <p style="font-size:13px;color:var(--texto2);margin-bottom:10px">
          ${presencasHoje.length} técnico(s) registrado(s) hoje
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${presencasHoje.map(p => `
            <span style="background:var(--verde-bg);color:var(--verde);padding:4px 12px;border-radius:20px;font-size:12px">
              ${p.nome}
              ${p.cursosRealizados?.length ? ` · ${p.cursosRealizados.join(", ")}` : ""}
            </span>
          `).join("")}
        </div>
      `;
    }
  } catch (e) {
    console.error("Erro no dashboard:", e);
  }
}

// ================================================================
// 7. TÉCNICOS
// ================================================================

// Guarda a lista carregada para evitar re-buscar ao filtrar
let _tecnicosCache = [];

async function renderTecnicos() {
  _tecnicosCache = await buscarTodosTecnicosComCursos();
  renderTabelaTecnicos();
}

function renderTabelaTecnicos() {
  const busca = document.getElementById("busca-tecnicos").value.toLowerCase();

  // Filtra pelo texto de busca
  const lista = _tecnicosCache.filter(t =>
    t.nome.toLowerCase().includes(busca) ||
    (t.matricula || "").toLowerCase().includes(busca)
  );

  const tbody = document.getElementById("corpo-tabela-tecnicos");

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">${estadoVazio("Nenhum técnico encontrado")}</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(t => `
    <tr>
      <td><strong>${t.nome}</strong></td>
      <td>${t.matricula}</td>
      <td>${t.funcao || "-"}</td>
      <td>
        <span style="background:var(--azul-bg);color:var(--azul);padding:2px 10px;border-radius:20px;font-size:12px">
          ${(t.cursos || []).length} curso(s)
        </span>
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="abrirModalCurso('${t.id}')">
            ➕ Curso
          </button>
          <button class="btn btn-ghost btn-sm" onclick="verCursosTecnico('${t.id}')">
            👁 Cursos
          </button>
          <button class="btn btn-sm" style="color:var(--vermelho);border:1px solid rgba(248,81,73,0.3)"
            onclick="confirmarExcluirTecnico('${t.id}', '${t.nome}')">
            🗑
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Cadastrar novo técnico ao clicar no botão
document.getElementById("btn-cadastrar-tec").addEventListener("click", async () => {
  const nome      = document.getElementById("tec-nome").value.trim();
  const matricula = document.getElementById("tec-matricula").value.trim();
  const funcao    = document.getElementById("tec-funcao").value.trim();
  const email     = document.getElementById("tec-email").value.trim();

  if (!nome || !matricula) {
    toast("Preencha Nome e Matrícula.", "erro");
    return;
  }

  try {
    await criarTecnico({ nome, matricula, funcao, email });
    toast("Técnico cadastrado com sucesso!", "sucesso");

    // Limpa os campos
    ["tec-nome","tec-matricula","tec-funcao","tec-email"].forEach(id => {
      document.getElementById(id).value = "";
    });

    // Recarrega a lista
    renderTecnicos();
  } catch (e) {
    toast(e.message, "erro");
  }
});

// Filtra ao digitar na busca
document.getElementById("busca-tecnicos").addEventListener("input", renderTabelaTecnicos);

// Confirma e exclui técnico
window.confirmarExcluirTecnico = async (id, nome) => {
  if (!confirm(`Excluir o técnico "${nome}" e todos os seus cursos? Esta ação não pode ser desfeita.`)) return;

  try {
    await excluirTecnico(id);
    toast("Técnico excluído.", "sucesso");
    renderTecnicos();
  } catch (e) {
    toast("Erro ao excluir: " + e.message, "erro");
  }
};

// Mostra os cursos de um técnico em um alert simples
window.verCursosTecnico = async (tecId) => {
  const tec = await buscarTecnicoComCursos(tecId);
  if (!tec) return;

  if (!tec.cursos || tec.cursos.length === 0) {
    alert(`${tec.nome} não tem cursos cadastrados.`);
    return;
  }

  const lista = tec.cursos.map(c => {
    const s = calcularStatus(c.dataVencimento);
    return `• ${c.nomeCurso} — Reciclagem: ${formatarData(c.dataReciclagem)} | Vence: ${formatarData(c.dataVencimento)} [${s.label}]`;
  }).join("\n");

  alert(`Cursos de ${tec.nome}:\n\n${lista}`);
};

// ================================================================
// 8. CONTROLE DE CURSOS
// ================================================================

let _controleCache = []; // cache dos dados

async function renderControle() {
  _controleCache = await buscarTodosTecnicosComCursos();
  filtrarControle();
}

function filtrarControle() {
  const busca        = document.getElementById("busca-controle").value.toLowerCase();
  const filtroStatus = document.getElementById("filtro-status").value;
  const filtroCurso  = document.getElementById("filtro-curso").value;

  // Monta lista plana de linhas (1 linha por curso de cada técnico)
  let linhas = [];
  _controleCache.forEach(tec => {
    (tec.cursos || []).forEach(curso => {
      linhas.push({ tec, curso, status: calcularStatus(curso.dataVencimento) });
    });
  });

  // Aplica filtros
  linhas = linhas.filter(({ tec, curso, status }) => {
    const matchBusca  = tec.nome.toLowerCase().includes(busca) ||
                        curso.nomeCurso.toLowerCase().includes(busca);
    const matchStatus = !filtroStatus || status.label === filtroStatus;
    const matchCurso  = !filtroCurso  || curso.nomeCurso === filtroCurso;
    return matchBusca && matchStatus && matchCurso;
  });

  const tbody = document.getElementById("corpo-tabela-controle");

  if (linhas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">${estadoVazio("Nenhum resultado encontrado")}</td></tr>`;
    return;
  }

  tbody.innerHTML = linhas.map(({ tec, curso, status }) => `
    <tr>
      <td><strong>${tec.nome}</strong></td>
      <td>${tec.matricula}</td>
      <td>${curso.nomeCurso}</td>
      <td>${formatarData(curso.dataReciclagem)}</td>
      <td>${formatarData(curso.dataVencimento)}</td>
      <td><span class="badge ${status.classe}">${status.label}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm"
            onclick="abrirModalCurso('${tec.id}', '${curso.id}', '${curso.nomeCurso}', '${curso.dataReciclagem}')">
            ✏️ Atualizar
          </button>
          <button class="btn btn-sm" style="color:var(--vermelho);border:1px solid rgba(248,81,73,0.3)"
            onclick="excluirCursoUI('${tec.id}', '${curso.id}', '${curso.nomeCurso}')">
            🗑
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

// Adiciona listeners nos filtros
document.getElementById("busca-controle").addEventListener("input", filtrarControle);
document.getElementById("filtro-status").addEventListener("change",  filtrarControle);
document.getElementById("filtro-curso").addEventListener("change",   filtrarControle);

// Excluir curso diretamente da tabela
window.excluirCursoUI = async (tecId, cursoId, nomeCurso) => {
  if (!confirm(`Excluir o curso "${nomeCurso}"?`)) return;
  try {
    await excluirCurso(tecId, cursoId);
    toast("Curso excluído.", "sucesso");
    renderControle();
  } catch (e) {
    toast("Erro: " + e.message, "erro");
  }
};

// ================================================================
// 9. MODAL DE CURSO
// Usado tanto para adicionar quanto para atualizar
// ================================================================

// Abre o modal com os campos preenchidos (ou vazios se novo)
window.abrirModalCurso = (tecId, cursoId = "", nomeCurso = "", dataRec = "") => {
  document.getElementById("modal-tec-id").value         = tecId;
  document.getElementById("modal-curso-id").value       = cursoId;
  document.getElementById("modal-curso-nome").value     = nomeCurso || "";
  document.getElementById("modal-data-reciclagem").value= dataRec;

  // Mostra campo "personalizado" apenas se curso for "Outro"
  toggleCursoPersonalizado();

  document.getElementById("modal-curso").style.display = "flex";
};

// Fecha o modal
document.getElementById("btn-fechar-modal").addEventListener("click", () => {
  document.getElementById("modal-curso").style.display = "none";
});

// Clicou fora do modal → fecha
document.getElementById("modal-curso").addEventListener("click", (e) => {
  if (e.target.id === "modal-curso") e.target.style.display = "none";
});

// Se escolheu "Outro", mostra campo para digitar o nome
document.getElementById("modal-curso-nome").addEventListener("change", toggleCursoPersonalizado);

function toggleCursoPersonalizado() {
  const select = document.getElementById("modal-curso-nome").value;
  document.getElementById("grupo-curso-personalizado").style.display =
    select === "Outro" ? "block" : "none";
}

// Salvar curso ao clicar no botão do modal
document.getElementById("btn-salvar-curso").addEventListener("click", async () => {
  const tecId    = document.getElementById("modal-tec-id").value;
  const cursoId  = document.getElementById("modal-curso-id").value;
  let nomeCurso  = document.getElementById("modal-curso-nome").value;
  const dataRec  = document.getElementById("modal-data-reciclagem").value;

  // Se escolheu "Outro", usa o nome personalizado
  if (nomeCurso === "Outro") {
    nomeCurso = document.getElementById("modal-curso-personalizado").value.trim();
  }

  if (!nomeCurso || !dataRec) {
    toast("Preencha o nome do curso e a data.", "erro");
    return;
  }

  try {
    await salvarCurso(tecId, { nomeCurso, dataReciclagem: dataRec, cursoId });
    toast("Curso salvo com sucesso!", "sucesso");
    document.getElementById("modal-curso").style.display = "none";

    // Recarrega a página ativa
    const paginaAtiva = document.querySelector(".pagina.ativa")?.id;
    if (paginaAtiva === "pagina-controle") renderControle();
    if (paginaAtiva === "pagina-tecnicos") renderTecnicos();
  } catch (e) {
    toast("Erro ao salvar: " + e.message, "erro");
  }
});

// ================================================================
// 10. PRESENÇA DO DIA
// ================================================================

let _presencaCache = [];
let _estadoPresenca = {}; // { tecnicoId: { presente: bool, cursos: [] } }

async function renderPresenca() {
  _presencaCache = await buscarTecnicos();
  const dataAtual = document.getElementById("data-presenca").value;

  // Carrega presenças já salvas desta data para pré-marcar
  const jaRegistradas = await buscarPresencasPorData(dataAtual);

  // Inicializa o estado
  _estadoPresenca = {};
  _presencaCache.forEach(tec => {
    const reg = jaRegistradas.find(p => p.tecnicoId === tec.id);
    _estadoPresenca[tec.id] = {
      presente: !!reg,
      cursos:   reg?.cursosRealizados || []
    };
  });

  renderListaPresenca();
}

function renderListaPresenca() {
  const busca = document.getElementById("busca-presenca").value.toLowerCase();

  const lista = _presencaCache.filter(t =>
    t.nome.toLowerCase().includes(busca) ||
    (t.matricula || "").includes(busca)
  );

  // Cursos disponíveis para seleção
  const cursosDisponiveis = ["NR06","NR10","NR12","NR18","NR20","NR23","NR33","NR35"];

  const container = document.getElementById("lista-presenca");

  if (lista.length === 0) {
    container.innerHTML = estadoVazio("Nenhum técnico cadastrado", "Cadastre técnicos na aba Técnicos.");
    return;
  }

  container.innerHTML = lista.map(tec => {
    const estado = _estadoPresenca[tec.id] || { presente: false, cursos: [] };

    return `
      <div class="presenca-item ${estado.presente ? "presente" : ""}" id="presitem-${tec.id}">
        <!-- Checkbox de presença -->
        <input type="checkbox"
          ${estado.presente ? "checked" : ""}
          onchange="togglePresenca('${tec.id}', this.checked)"
        />
        <div class="presenca-info" style="flex:1">
          <h4>${tec.nome}</h4>
          <p>${tec.matricula}${tec.funcao ? " · " + tec.funcao : ""}</p>

          <!-- Pílulas de cursos (só visíveis se presente) -->
          <div class="cursos-pills" style="${estado.presente ? "" : "display:none"}" id="cursos-${tec.id}">
            <span style="font-size:11px;color:var(--texto2);margin-right:4px">Cursos hoje:</span>
            ${cursosDisponiveis.map(curso => `
              <button
                class="pill-curso ${estado.cursos.includes(curso) ? "selecionado" : ""}"
                onclick="toggleCursoPresenca('${tec.id}', '${curso}', this)"
              >${curso}</button>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Marca/desmarca presença de um técnico
window.togglePresenca = (tecId, presente) => {
  _estadoPresenca[tecId].presente = presente;
  if (!presente) _estadoPresenca[tecId].cursos = [];

  // Atualiza visual do item
  const item   = document.getElementById(`presitem-${tecId}`);
  const cursos = document.getElementById(`cursos-${tecId}`);
  item.classList.toggle("presente", presente);
  cursos.style.display = presente ? "flex" : "none";
};

// Seleciona/deseleciona um curso para um técnico
window.toggleCursoPresenca = (tecId, curso, btn) => {
  const lista = _estadoPresenca[tecId].cursos;
  const idx   = lista.indexOf(curso);
  if (idx === -1) lista.push(curso);      // adiciona se não tinha
  else            lista.splice(idx, 1);   // remove se já tinha
  btn.classList.toggle("selecionado", idx === -1);
};

// Selecionar todos os técnicos como presentes
document.getElementById("btn-sel-todos").addEventListener("click", () => {
  _presencaCache.forEach(tec => {
    _estadoPresenca[tec.id].presente = true;
  });
  renderListaPresenca();
});

// Limpar todas as seleções
document.getElementById("btn-limpar-sel").addEventListener("click", () => {
  _presencaCache.forEach(tec => {
    _estadoPresenca[tec.id] = { presente: false, cursos: [] };
  });
  renderListaPresenca();
});

// Filtro de busca na presença
document.getElementById("busca-presenca").addEventListener("input", renderListaPresenca);

// Recarrega ao mudar a data
document.getElementById("data-presenca").addEventListener("change", renderPresenca);

// Salvar todas as presenças
document.getElementById("btn-salvar-presenca").addEventListener("click", async () => {
  const data = document.getElementById("data-presenca").value;
  if (!data) { toast("Selecione uma data.", "erro"); return; }

  const presentes = Object.entries(_estadoPresenca)
    .filter(([, estado]) => estado.presente);

  if (presentes.length === 0) {
    toast("Nenhum técnico marcado como presente.", "erro");
    return;
  }

  try {
    // Salva cada técnico presente
    for (const [tecId, estado] of presentes) {
      const tec = _presencaCache.find(t => t.id === tecId);
      await salvarPresenca(data, tecId, tec.nome, estado.cursos);
    }
    toast(`${presentes.length} presença(s) salva(s)!`, "sucesso");
  } catch (e) {
    toast("Erro ao salvar: " + e.message, "erro");
  }
});

// ================================================================
// 11. IMPORTAÇÃO EM MASSA
// ================================================================

// Clicou no arquivo Excel
document.getElementById("arquivo-excel").addEventListener("change", handleArquivoExcel);

async function handleArquivoExcel(e) {
  const arquivo = e.target.files[0];
  if (!arquivo) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      // Usa a biblioteca XLSX para ler o arquivo
      const workbook  = XLSX.read(ev.target.result, { type: "binary" });
      const planilha  = workbook.Sheets[workbook.SheetNames[0]];
      const dados     = XLSX.utils.sheet_to_json(planilha, { header: 1 });

      // Remove a primeira linha se for cabeçalho
      const linhas = dados.filter((l, i) => i > 0 && l[0]); // pula linha 0 e vazias

      await processarLinhas(linhas);
    } catch (err) {
      toast("Erro ao ler arquivo: " + err.message, "erro");
    }
  };
  reader.readAsBinaryString(arquivo);
}

// Processar dados colados na textarea
document.getElementById("btn-processar-colagem").addEventListener("click", async () => {
  const texto = document.getElementById("dados-colados").value.trim();
  if (!texto) { toast("Cole os dados primeiro.", "erro"); return; }

  // Divide em linhas e depois em colunas pelo ";"
  const linhas = texto.split("\n")
    .map(l => l.split(";").map(v => v.trim()))
    .filter(l => l[0]);

  await processarLinhas(linhas);
});

// Processa as linhas (tanto do Excel quanto da textarea)
async function processarLinhas(linhas) {
  const preview = document.getElementById("preview-importacao");
  preview.innerHTML = `<p style="color:var(--texto2)">Processando ${linhas.length} linha(s)...</p>`;

  let criados = 0, atualizados = 0, erros = [];

  for (const linha of linhas) {
    // Linha esperada: [Nome, Matrícula, Função, Curso, DataReciclagem]
    const [nome, matricula, funcao, curso, dataRec] = linha;

    if (!nome || !matricula) {
      erros.push(`Linha inválida: ${linha.join(";")}`);
      continue;
    }

    try {
      const tecId = "tec_" + String(matricula).replace(/\s/g, "_");

      // Verifica se técnico já existe; se não, cria
      const existente = await getDoc(doc(db, "tecnicos", tecId));
      if (!existente.exists()) {
        await setDoc(doc(db, "tecnicos", tecId), {
          nome: String(nome),
          matricula: String(matricula),
          funcao: String(funcao || ""),
          email: "",
          criadoEm: serverTimestamp()
        });
        criados++;
      }

      // Se tem curso, salva/atualiza
      if (curso && dataRec) {
        await salvarCurso(tecId, {
          nomeCurso:      String(curso),
          dataReciclagem: String(dataRec)
        });
        atualizados++;
      }
    } catch (e) {
      erros.push(`Erro em ${nome}: ${e.message}`);
    }
  }

  // Mostra resultado
  preview.innerHTML = `
    <div style="margin-top:16px;background:var(--fundo3);border-radius:var(--raio-sm);padding:16px">
      <p style="color:var(--verde);margin-bottom:4px">✅ ${criados} técnico(s) criado(s)</p>
      <p style="color:var(--azul);margin-bottom:4px">🔄 ${atualizados} curso(s) atualizado(s)</p>
      ${erros.length ? `<p style="color:var(--vermelho)">❌ ${erros.length} erro(s):<br>${erros.join("<br>")}</p>` : ""}
    </div>
  `;

  toast("Importação concluída!", "sucesso");
}

// ================================================================
// 12. RELATÓRIOS
// ================================================================

let _textoRelatorio = ""; // guarda o texto gerado para exportar

document.getElementById("btn-gerar-relatorio").addEventListener("click", async () => {
  const data = document.getElementById("data-relatorio").value;
  if (!data) { toast("Selecione uma data.", "erro"); return; }

  const saida = document.getElementById("saida-relatorio");
  saida.textContent = "Gerando relatório...";

  try {
    const presencas = await buscarPresencasPorData(data);
    const config    = await buscarConfiguracoes();

    let txt = "";
    txt += "═══════════════════════════════════════\n";
    txt += "       RELATÓRIO DIÁRIO — TecControl\n";
    txt += "═══════════════════════════════════════\n";
    txt += `Data: ${formatarData(data)}\n`;
    txt += `Gerado em: ${new Date().toLocaleString("pt-BR")}\n`;
    txt += "───────────────────────────────────────\n\n";

    if (presencas.length === 0) {
      txt += "Nenhuma presença registrada nesta data.\n";
    } else {
      txt += `TÉCNICOS PRESENTES (${presencas.length}):\n\n`;
      presencas.forEach(p => {
        txt += `  👷 ${p.nome}\n`;
        if (p.cursosRealizados?.length) {
          txt += `     Cursos realizados: ${p.cursosRealizados.join(", ")}\n`;
        }
        txt += "\n";
      });
    }

    txt += "───────────────────────────────────────\n";
    txt += `Supervisor: ${config.emailSupervisor || "não configurado"}\n`;
    txt += `Gestor: ${config.emailGestor || "não configurado"}\n`;

    _textoRelatorio = txt;
    saida.textContent = txt;
  } catch (e) {
    toast("Erro ao gerar: " + e.message, "erro");
  }
});

// Copiar relatório para área de transferência
document.getElementById("btn-copiar-relatorio").addEventListener("click", () => {
  if (!_textoRelatorio) { toast("Gere o relatório primeiro.", "erro"); return; }
  navigator.clipboard.writeText(_textoRelatorio);
  toast("Relatório copiado!", "sucesso");
});

// Baixar relatório como .txt
document.getElementById("btn-exportar-txt").addEventListener("click", () => {
  if (!_textoRelatorio) { toast("Gere o relatório primeiro.", "erro"); return; }
  const blob = new Blob([_textoRelatorio], { type: "text/plain;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `relatorio-${dataHoje()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// Abrir email pré-preenchido com o relatório
document.getElementById("btn-enviar-email").addEventListener("click", async () => {
  if (!_textoRelatorio) {
    toast("Gere o relatório primeiro.", "erro");
    return;
  }

  const config = await buscarConfiguracoes();
  const para   = [config.emailSupervisor, config.emailGestor]
    .filter(Boolean).join(",");

  if (!para) {
    toast("Configure os emails nas Configurações.", "erro");
    return;
  }

  // Abre o cliente de email padrão com o conteúdo preenchido
  const assunto = `Relatório Diário TecControl — ${formatarData(dataHoje())}`;
  const corpo   = encodeURIComponent(_textoRelatorio);
  window.location.href = `mailto:${para}?subject=${encodeURIComponent(assunto)}&body=${corpo}`;
});

// ================================================================
// 13. CONFIGURAÇÕES
// ================================================================

async function carregarConfig() {
  const cfg = await buscarConfiguracoes();
  document.getElementById("cfg-supervisor").value = cfg.emailSupervisor || "";
  document.getElementById("cfg-gestor").value     = cfg.emailGestor     || "";
}

document.getElementById("btn-salvar-config").addEventListener("click", async () => {
  const emailSupervisor = document.getElementById("cfg-supervisor").value.trim();
  const emailGestor     = document.getElementById("cfg-gestor").value.trim();

  try {
    await salvarConfiguracoes({ emailSupervisor, emailGestor });
    toast("Configurações salvas!", "sucesso");
  } catch (e) {
    toast("Erro ao salvar: " + e.message, "erro");
  }
});

// Exportar backup JSON
document.getElementById("btn-exportar-backup").addEventListener("click", async () => {
  try {
    const tecnicos = await buscarTodosTecnicosComCursos();
    const config   = await buscarConfiguracoes();
    const backup   = { tecnicos, config, exportadoEm: new Date().toISOString() };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `backup-teccontrol-${dataHoje()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Backup exportado!", "sucesso");
  } catch (e) {
    toast("Erro no backup: " + e.message, "erro");
  }
});

// Importar backup JSON
document.getElementById("arquivo-backup").addEventListener("change", async (e) => {
  const arquivo = e.target.files[0];
  if (!arquivo) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const backup = JSON.parse(ev.target.result);
      if (!confirm(`Importar backup com ${backup.tecnicos?.length || 0} técnico(s)?`)) return;

      for (const tec of (backup.tecnicos || [])) {
        await setDoc(doc(db, "tecnicos", tec.id), {
          nome: tec.nome, matricula: tec.matricula,
          funcao: tec.funcao || "", email: tec.email || ""
        });
        for (const curso of (tec.cursos || [])) {
          await setDoc(doc(db, "tecnicos", tec.id, "cursos", curso.id), {
            nomeCurso: curso.nomeCurso,
            dataReciclagem: curso.dataReciclagem,
            dataVencimento: curso.dataVencimento
          });
        }
      }

      if (backup.config) await salvarConfiguracoes(backup.config);

      toast("Backup importado com sucesso!", "sucesso");
      renderDashboard();
    } catch (err) {
      toast("Erro ao importar: " + err.message, "erro");
    }
  };
  reader.readAsText(arquivo);
});

// Limpar todos os dados
document.getElementById("btn-limpar-dados").addEventListener("click", async () => {
  const confirmacao = prompt('⚠️ ATENÇÃO! Isso apaga TODOS os dados.\nDigite "CONFIRMAR" para continuar:');
  if (confirmacao !== "CONFIRMAR") return;

  try {
    const tecnicos = await buscarTecnicos();
    for (const tec of tecnicos) await excluirTecnico(tec.id);

    const presSnap = await getDocs(collection(db, "presencas"));
    for (const d of presSnap.docs) await deleteDoc(d.ref);

    toast("Todos os dados foram apagados.", "info");
    renderDashboard();
  } catch (e) {
    toast("Erro: " + e.message, "erro");
  }
});

// ================================================================
// 14. UTILITÁRIOS (funções auxiliares)
// ================================================================

// Retorna a data de hoje no formato AAAA-MM-DD
function dataHoje() {
  return new Date().toISOString().split("T")[0];
}

// Converte AAAA-MM-DD para DD/MM/AAAA
function formatarData(str) {
  if (!str) return "-";
  const [a, m, d] = str.split("-");
  return `${d}/${m}/${a}`;
}

// Adiciona N anos a uma data no formato AAAA-MM-DD
function adicionarAnos(dataStr, anos) {
  const d = new Date(dataStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + anos);
  return d.toISOString().split("T")[0];
}

// Calcula o status de um curso baseado na data de vencimento
function calcularStatus(dataVencimento) {
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const venc = new Date(dataVencimento + "T00:00:00");
  const diff = Math.round((venc - hoje) / 86400000); // diferença em dias

  if (diff < 0)   return { label: "Vencido",  classe: "badge-vermelho" };
  if (diff <= 30) return { label: "Próximo",  classe: "badge-amarelo" };
                  return { label: "Em Dia",   classe: "badge-verde" };
}

// Mostra uma notificação temporária (toast)
function toast(mensagem, tipo = "sucesso") {
  const el = document.getElementById("toast");
  el.textContent  = mensagem;
  el.className    = `toast ${tipo}`;
  el.style.display = "block";

  // Some após 3 segundos
  setTimeout(() => { el.style.display = "none"; }, 3000);
}

// HTML para estado vazio (quando tabela não tem dados)
function estadoVazio(titulo, subtitulo = "") {
  return `
    <div class="estado-vazio">
      <div class="icone">📋</div>
      <h4>${titulo}</h4>
      ${subtitulo ? `<p>${subtitulo}</p>` : ""}
    </div>
  `;
}

// Expõe funções globais que são chamadas pelo HTML (onclick="...")
window.abrirModalCurso         = abrirModalCurso;
window.confirmarExcluirTecnico = confirmarExcluirTecnico;
window.excluirCursoUI          = excluirCursoUI;
window.verCursosTecnico        = verCursosTecnico;
window.togglePresenca          = togglePresenca;
window.toggleCursoPresenca     = toggleCursoPresenca;
