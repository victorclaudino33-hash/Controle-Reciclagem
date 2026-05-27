# 📋 TecControl — Gestão e Controle de Reciclagem de Cursos

O **TecControl** é uma plataforma web moderna, centralizada e de alta performance desenvolvida para o monitoramento, controlo e gestão de treinamentos obrigatórios e reciclagens de técnicos (como as Normas Regulamentadoras: NR06, NR10, NR12, NR18, NR20, NR23, NR33, NR35, entre outras). 

O sistema foi arquitetado para simplificar a rotina de administradores e gestores de segurança do trabalho, permitindo o acompanhamento em tempo real da situação de cada profissional, emissão de relatórios, controlo de presença diária e importação em massa de dados via planilhas.

🌐 **Aceda à aplicação em produção:** [https://controle-reciclagem.vercel.app/](https://controle-reciclagem.vercel.app/)

---

## 🚀 Funcionalidades Principais

* **📊 Dashboard Inteligente:** Visão consolidada com indicadores-chave (Total de Técnicos Ativos, Cursos Próximos do Vencimento, Cursos Vencidos e Técnicos Presentes Hoje).
* **👥 Gestão de Técnicos:** Cadastro completo de profissionais (Nome, CPF, Cargo, Setor, Unidade e Status de Atividade).
* **⏳ Controlo de Cursos e Validades:** Monitorização automatizada do status dos cursos com base na data da última reciclagem:
    * 🟢 **Em Dia:** Validade segura.
    * 🟡 **Próximo:** Vence nos próximos 30 dias.
    * 🔴 **Vencido:** Prazo de reciclagem expirado.
* **📅 Presença Diária:** Controlo de entrada e saída diária dos técnicos com registo automático de data e horário.
* **📥 Importação em Massa (Excel):** Módulo de importação rápida que lê arquivos `.xlsx` diretamente no navegador, populando o banco de dados instantaneamente.
* **📈 Relatórios Gerenciais:** Filtros avançados para exportação e análise de técnicos com cursos pendentes ou vencidos.
* **⚙️ Configurações do Sistema:** Gestão de parâmetros globais e controlo de acessos administrativos.
* **🔐 Autenticação Segura:** Login robusto integrado via Firebase Authentication para proteção de dados sensíveis.

---

## 🛠️ Tecnologias Utilizadas

A aplicação adota uma arquitetura Serverless e moderna (Single Page Application - SPA), sem dependências pesadas de frameworks, garantindo leveza e carregamento instantâneo:

* **HTML5 & CSS3 Avançado:** Layout totalmente customizado utilizando variáveis globais (`:root`), Grid, e design responsivo (adaptado para Mobile e Tablets).
* **JavaScript Moderno (ES6+):** Programação assíncrona, manipulação dinâmica do DOM e arquitetura modular.
* **Firebase Core (v10.12.0):**
    * **Firestore Database:** Banco de dados NoSQL estruturado em nuvem com sincronização em tempo real.
    * **Firebase Auth:** Sistema de autenticação seguro para operadores do sistema.
* **SheetJS (XLSX):** Biblioteca integrada via CDN para leitura e processamento de planilhas Excel no client-side.
* **Google Fonts:** Tipografia refinada utilizando a combinação das fontes *Syne* (Títulos impactantes) e *DM Sans* (Leitura limpa para o corpo).

---

## 📂 Estrutura do Projeto

O projeto é composto por três arquivos fundamentais que estruturam toda a aplicação de forma limpa e modular:

```bash
├── index.html   # Estrutura semântica das páginas, modais e componentes da interface.
├── style.css    # Identidade visual (Tema Dark elegante, animações, toasts e responsividade).
└── app.js       # Core da aplicação: Integração Firebase, regras de negócio e controlo do DOM.
