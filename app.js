/* Buildless, file:// compatible wiki reader. Content is generated from main.tex. */
(() => {
  'use strict';
  const data = window.BANDIT_WIKI;
  const main = document.getElementById('main');
  if (!data) { main.innerHTML = '<p class="callout">The content file could not be loaded. Keep content.js beside index.html.</p>'; return; }
  const articles = data.articles;
  const articleById = new Map(articles.map(a => [a.id, a]));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const strip = s => { const el = document.createElement('div'); el.innerHTML = s; return el.textContent || ''; };
  const chapterNames = ['Preliminaries', 'Stochastic bandits', 'Adversarial bandits', 'Lower bounds', 'Contextual & linear bandits'];
  const chapterDescriptions = [
    'Set up the sequential game. Learn regret decomposition and the concentration tools behind the analysis.',
    'From explore-then-commit to UCB and MOSS: balance exploration with reward and compare regret guarantees.',
    'Learn with changing rewards using exponential weights, importance weighting, and implicit exploration.',
    'Use relative entropy and hypothesis testing to understand the unavoidable cost of learning.',
    'Share information across actions with contexts, linear structure, confidence sets, and sparse parameters.'
  ];
  const symbols = ['∑', 'μ', 'η', 'Ω', 'θ'];
  let observer;
  let renderVersion = 0;
  let activeArticle;
  const stored = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; } };
  const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const href = (a, anchor = '') => '#/article/' + a.id + (anchor ? '@' + anchor : '');
  const articleFor = re => articles.find(a => re.test(a.title)) || articles[0];
  const words = a => Math.max(1, Math.round((a.text || '').split(/\s+/).length / 190));
  const chapterOf = a => data.chapters.find(c => Number(c.id) === Number(a.chapter)) || data.chapters[Number(a.chapter)];

  function initNav() {
    document.getElementById('chapter-nav').innerHTML = data.chapters.map((c, i) => {
      const members = articles.filter(a => Number(a.chapter) === i);
      return `<section class="nav-group" data-chapter="${i}"><button class="nav-group-toggle" aria-expanded="${i === 0}"><span class="chapter-number">${i}</span><span>${esc(chapterNames[i] || c.title)}</span><span class="nav-chevron" aria-hidden="true">⌄</span></button><div class="nav-group-links" ${i !== 0 ? 'hidden' : ''}>${members.map(a => `<a class="nav-link" href="${href(a)}" data-article="${esc(a.id)}">${esc(a.title)}</a>`).join('')}</div></section>`;
    }).join('');
    document.querySelectorAll('.nav-group-toggle').forEach(button => button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      button.nextElementSibling.hidden = !expanded;
    }));
    const filter = document.getElementById('search-chapter');
    data.chapters.forEach((c, i) => filter.add(new Option(chapterNames[i], String(i))));
  }

  function heroGraphic() {
    return `<div class="hero-visual" aria-label="Three illustrative arm estimates and their confidence intervals"><svg viewBox="0 0 350 225" role="img"><title>Learning which action is best</title><defs><pattern id="grid" width="29" height="29" patternUnits="userSpaceOnUse"><path d="M29 0H0V29" fill="none" stroke="currentColor" opacity=".08"/></pattern></defs><rect x="20" y="10" width="310" height="180" fill="url(#grid)"/><path d="M40 36V185H318" fill="none" stroke="currentColor" opacity=".3"/><text x="45" y="24" fill="currentColor" font-size="11" font-family="system-ui">ESTIMATED MEAN REWARD</text><path d="M100 78V149M87 78H113M87 149H113" stroke="#93aaa1" stroke-width="2"/><path d="M180 43V103M167 43H193M167 103H193" stroke="#287362" stroke-width="2"/><path d="M260 94V165M247 94H273M247 165H273" stroke="#b7a17d" stroke-width="2"/><circle cx="100" cy="113" r="7" fill="#93aaa1"/><circle cx="180" cy="73" r="8" fill="#287362"/><circle cx="260" cy="130" r="7" fill="#c39359"/><circle cx="180" cy="73" r="17" fill="none" stroke="#287362" opacity=".2" stroke-width="7"/><text x="80" y="208" fill="currentColor" font-size="12" font-family="system-ui">Arm 1</text><text x="160" y="208" fill="currentColor" font-size="12" font-family="system-ui">Arm 2</text><text x="240" y="208" fill="currentColor" font-size="12" font-family="system-ui">Arm 3</text></svg><span class="visual-caption">Points show estimates. Bars show illustrative confidence intervals.</span></div>`;
  }

  function home() {
    const last = articleById.get(stored('bandit-last-article', ''));
    const etc = articleFor(/Explore-Then/i), lower = articleFor(/Two-Environment/), linear = articleFor(/^Stochastic Linear Bandits$/);
    return `<div class="page home-page"><div class="home-hero"><div class="hero-copy"><div class="eyebrow">A FIELD GUIDE TO SEQUENTIAL LEARNING</div><h1>Good decisions.<br><em>Incomplete information.</em></h1><p class="page-lead">The primary reference for these study notes is <a href="#/references@ref-LaSze19:book"><em>Bandit Algorithms</em></a> by Tor Lattimore and Csaba Szepesvári (Cambridge University Press, 2020).</p><div class="hero-actions"><a class="button" href="${href(last || articles[0])}">${last ? 'Continue reading' : 'Start with the foundations'}</a><a class="button secondary" href="#/experiments">Run a bandit experiment</a></div><div class="meta-row"><span>${data.chapters.length} chapters</span><span>${articles.length} articles</span><span>${data.stats.statements} formal statements</span><span>${data.stats.algorithms} algorithms</span></div></div>${heroGraphic()}</div>
      <section aria-labelledby="chapters-heading"><div class="section-heading"><div><div class="eyebrow">THE LIBRARY</div><h2 id="chapters-heading">One idea builds on the next.</h2></div><span class="muted">Based on Team 333’s study notes</span></div><div class="chapter-grid">${data.chapters.map((c, i) => { const aa = articles.filter(a => Number(a.chapter) === i); return `<a class="chapter-card" href="${href(aa[0])}"><div class="chapter-card-top"><span class="chapter-kicker">CHAPTER ${i}</span><span class="chapter-symbol" aria-hidden="true">${symbols[i]}</span></div><h2>${esc(chapterNames[i])}</h2><p>${chapterDescriptions[i]}</p><div class="card-meta">${aa.length} articles <span>Read chapter</span></div></a>`; }).join('')}</div></section>
      <section class="reading-section" aria-labelledby="path-heading"><div class="section-heading"><div><div class="eyebrow">A FIRST PASS</div><h2 id="path-heading">A path through the subject</h2></div></div><div class="reading-path">${[[articles[0], 'Define the game', 'Actions, rewards, policies, and regret.'],[etc, 'Learn a first algorithm', 'Explore, commit, and quantify the tradeoff.'],[lower, 'Find the limits', 'Why some exploration is unavoidable.'],[linear, 'Use the structure', 'Learn across actions through a shared parameter.']].map(([a,t,d],i) => `<a class="path-step" href="${href(a)}"><span class="step-index">${i+1}</span><div><h3>${t}</h3><p>${d}</p></div></a>`).join('')}</div></section>
      <section class="quick-reference"><div><div class="eyebrow">THE CENTRAL IDENTITY</div><h2>The cost of learning,<br>one action at a time.</h2><p>For finitely or countably many stochastic arms, expected regret decomposes into the gap of each action times its expected number of plays. This identity is the starting point for stochastic-bandit analysis.</p><a class="text-link" href="${href(articles[0])}">Read the regret decomposition</a></div><div class="formula-card"><div class="math-display">\\[R_n(\\pi,\\nu)=\\sum_{a\\in\\mathcal A}\\Delta_a\\,\\mathbb E[T_a(n)]\\]</div><p><span>\\(\\Delta_a = \\mu^* - \\mu_a\\)</span> Reward gap <span>\\(T_a(n)\\)</span> Number of plays</p></div></section>
      <section class="utility-grid"><a class="utility-card" href="#/theorems"><span class="eyebrow">LOOK IT UP</span><h3>Statements &amp; algorithms</h3><p>Find a definition, jump to a theorem, or revisit an algorithm.</p></a><a class="utility-card" href="#/notation"><span class="eyebrow">KEEP IT CLOSE</span><h3>A common language</h3><p>Decode the symbols used throughout the notes.</p></a><a class="utility-card" href="#/references"><span class="eyebrow">GO TO THE SOURCE</span><h3>Notes &amp; further reading</h3><p>The original LaTeX, supplementary material, and seven references.</p></a></section></div>`;
  }

  function articlePage(a) {
    const i = articles.indexOf(a), chapter = chapterOf(a);
    let headings = a.headings || [];
    if (!headings.length) {
      const preview = document.createElement('div'); preview.innerHTML = a.html;
      headings = [...preview.querySelectorAll('.statement[id], .algorithm[id]')].filter(el => !el.classList.contains('remark')).map(el => ({id:el.id, title:el.querySelector('.statement-header, .algorithm-title')?.textContent || '', level:2}));
    }
    const printTitle = `Print ${a.title}`;
    const experimentArticles = ['stochastic-bandits', 'the-explore-then-commit-algorithm', 'the-upper-confidence-bound-algorithm'];
    const experimentLink = experimentArticles.includes(a.id)
      ? '<a class="small-button" href="#/experiments">Try these policies in the lab</a>'
      : '';
    return `<div class="page article-page"><header class="article-header"><div class="eyebrow">CHAPTER ${a.chapter} · ${esc(chapterNames[a.chapter])}</div><h1>${esc(a.title)}</h1><div class="article-meta"><span class="source-badge">§ ${esc(a.number || '')}</span><span>${words(a)} min reading</span><a class="source-link" href="https://github.com/wronskian0103/Bandit_wiki/blob/be701b7c46bb85378352b853aacce7bacae6b0d1/main.tex" target="_blank" rel="noopener">main.tex · lines ${a.sourceStart}–${a.sourceEnd}</a></div><div class="article-tools"><button class="small-button" id="toggle-proofs" aria-pressed="false">Expand all proofs</button><button class="small-button" id="copy-link">Copy article link</button><button class="small-button" id="print-article" aria-label="${esc(printTitle)}">Print article</button>${experimentLink}</div></header><div class="article-layout"><article class="article-body prose" id="article-body">${a.html}</article><aside class="page-toc" aria-label="On this page"><div class="eyebrow">ON THIS PAGE</div><a href="${href(a)}" class="toc-start">${esc(a.title)}</a>${headings.map(h => `<a class="toc-level-${h.level}" href="${href(a,h.id)}">${esc(strip(h.title))}</a>`).join('')}<div class="toc-footer">Part of <strong>${esc(chapter?.title || chapterNames[a.chapter])}</strong><a href="#/theorems">Browse all statements</a></div></aside></div><nav class="article-footer" aria-label="Article navigation">${i ? `<a href="${href(articles[i-1])}"><span>PREVIOUS ARTICLE</span><strong>${esc(articles[i-1].title)}</strong></a>` : '<div></div>'}${i < articles.length-1 ? `<a href="${href(articles[i+1])}"><span>NEXT ARTICLE</span><strong>${esc(articles[i+1].title)}</strong></a>` : '<a href="#/references"><span>KEEP EXPLORING</span><strong>References &amp; source files</strong></a>'}</nav></div>`;
  }

  const notation = [
    ['\\(\\mathcal A,\\; k\\)', 'Actions and number of arms', 'The available action set; k is its size when finite.'],
    ['\\(A_t,\\; X_t\\)', 'Action and observed reward', 'The learner chooses an action at round t, then observes its reward.'],
    ['\\(H_{t-1},\\;\\pi_t\\)', 'History and policy', 'Past actions and rewards, and the conditional distribution of the next action.'],
    ['\\(\\nu=(P_a:a\\in\\mathcal A)\\)', 'Stochastic environment', 'Each action has an unknown reward distribution.'],
    ['\\(\\mu_a,\\;\\mu^*,\\;\\Delta_a\\)', 'Means and gaps', 'The mean of arm a, the largest mean, and the difference μ* − μₐ.'],
    ['\\(T_a(t),\\;\\hat\\mu_a(t)\\)', 'Counts and estimates', 'The number of plays of arm a and its empirical mean by round t.'],
    ['\\(R_n(\\pi,\\nu)\\)', 'Expected stochastic regret', 'For fixed arms this is n times the largest mean minus the expected cumulative reward. In contextual models the best available mean can change each round.'],
    ['\\(\\bar R_n,\\;\\hat R_n\\)', 'Random pseudo-regret', 'Sum of the mean-reward gaps along the sequence of chosen actions. The stochastic lower bounds use a bar and the linear-bandit section uses a hat. Its expectation is the expected stochastic regret.'],
    ['\\(\\sigma,\\;\\delta\\)', 'Noise scale and failure probability', 'Subgaussian scale and the probability allowed outside a confidence event. The notes use a centered subgaussian convention.'],
    ['\\(\\eta,\\;\\gamma\\)', 'Learning rate and exploration', 'Parameters controlling exponential weights, explicit exploration, or implicit exploration, depending on the algorithm.'],
    ['\\(D(P,Q)\\)', 'Relative entropy', 'The Kullback–Leibler divergence from P to Q. The order matters in the change-of-environment bounds.'],
    ['\\(d,\\;\\theta_*,\\;\\langle a,\\theta_*\\rangle\\)', 'Linear structure', 'Feature dimension, unknown parameter, and the mean reward of an action vector.'],
    ['\\(V_t,\\;\\hat\\theta_t\\)', 'Design and estimate', 'The regularized design matrix and least-squares parameter estimate; indexing follows each article.'],
    ['\\(\\|x\\|_V=\\sqrt{x^\\top Vx}\\)', 'Matrix-weighted norm', 'For symmetric positive definite V this is a norm. A singular positive semidefinite V gives a seminorm and can assign length zero to a nonzero vector.'],
    ['\\(\\beta_t\\)', 'LinUCB confidence bound', 'In the LinUCB theorem, βₜ bounds the squared distance in the design-matrix norm. The enclosing ellipsoid has radius √βₜ in that norm.'],
    ['\\(\\|\\theta_*\\|_0,\\;m_0\\)', 'Sparsity', 'The first quantity counts the nonzero coordinates of the unknown parameter. The sparse-bandit algorithms use m₀ as a known upper bound.']
  ];
  function notationPage() {
    return `<div class="page"><header class="article-header"><div class="eyebrow">REFERENCE DESK</div><h1>Notation guide</h1><p class="page-lead">The symbols you will meet throughout the notes. Local definitions and indexing in each article take precedence.</p></header><div class="glossary-grid">${notation.map(([symbol,title,description]) => `<section class="glossary-entry"><div class="notation-symbol">${symbol}</div><h2>${title}</h2><p>${description}</p></section>`).join('')}</div><div class="callout"><strong>Two conventions to keep in mind.</strong> Subgaussian random variables are centered in the preliminary definition. In linear-bandit algorithms, distinguish a confidence radius from its square.</div></div>`;
  }

  let statements;
  function getStatements() {
    if (statements) return statements;
    statements = [];
    articles.forEach(a => {
      const doc = document.createElement('div'); doc.innerHTML = a.html;
      doc.querySelectorAll('.statement, .algorithm').forEach((el,i) => {
        const head = el.querySelector('.statement-header, .algorithm-title');
        if (!head) return;
        const anchor = el.id || el.querySelector('[id]')?.id;
        statements.push({article:a, title:head.textContent, anchor:anchor || '', type:el.classList.contains('algorithm') ? 'Algorithm' : [...el.classList].find(c => c !== 'statement') || 'Statement'});
      });
    });
    return statements;
  }
  function statementsPage() {
    return `<div class="page"><header class="article-header"><div class="eyebrow">REFERENCE DESK</div><h1>Statements &amp; algorithms</h1><p class="page-lead">An index of definitions, results, remarks, and algorithms, linked to their context and proofs.</p><label class="sr-only" for="index-search">Filter statements</label><input class="index-search" id="index-search" type="search" placeholder="Filter by title, type, or chapter…"><p class="muted" id="index-count" aria-live="polite"></p></header><div id="statement-list" class="reference-list"></div></div>`;
  }
  function filterStatements() {
    const query = document.getElementById('index-search').value.trim().toLowerCase();
    const ss = getStatements().filter(s => `${s.title} ${s.type} ${s.article.title} ${chapterNames[s.article.chapter]}`.toLowerCase().includes(query));
    document.getElementById('index-count').textContent = `${ss.length} entries`;
    document.getElementById('statement-list').innerHTML = ss.map(s => `<a class="statement-index-entry" href="${href(s.article,s.anchor)}"><span class="source-badge">${esc(s.type)}</span><div><h2>${esc(s.title)}</h2><p>Chapter ${s.article.chapter} · ${esc(s.article.title)}</p></div></a>`).join('') || '<p class="search-empty">No matching statements. Try a broader term.</p>';
    typeset(document.getElementById('statement-list'));
  }

  function referencesPage() {
    return `<div class="page"><header class="article-header"><div class="eyebrow">REFERENCE DESK</div><h1>References &amp; source files</h1><p class="page-lead">The reading behind the notes, and the original files for further study.</p></header><section class="prose"><h2>About these notes</h2><p>This wiki presents the study-group notes by <strong>Juhyeok Choi, Minsuk Yoo, and Haejun Park</strong> of Team 333 — BanditBury Group. The primary reference is <em>Bandit Algorithms</em> by Tor Lattimore and Csaba Szepesvári.</p><p>The articles follow the structure of <code>main.tex</code>. The notes retain textbook theorem and exercise numbers in some statement titles; internal numbering follows the study notes. Proofs are expandable, and equations, citations, and result references link to their destinations.</p><h2>Original materials</h2><p>The source downloads require access to the private GitHub repository.</p></section><div class="utility-grid source-grid"><a class="utility-card" href="https://github.com/wronskian0103/Bandit_wiki/blob/be701b7c46bb85378352b853aacce7bacae6b0d1/main.tex" target="_blank" rel="noopener"><span class="eyebrow">LATEX SOURCE</span><h3>Complete study notes</h3><p>Download main.tex, the source of the wiki’s articles.</p></a><a class="utility-card" href="https://github.com/wronskian0103/Bandit_wiki/blob/be701b7c46bb85378352b853aacce7bacae6b0d1/references.bib" target="_blank" rel="noopener"><span class="eyebrow">BIBTEX</span><h3>Bibliography</h3><p>All seven reference entries in their original form.</p></a><a class="utility-card" href="https://github.com/wronskian0103/Bandit_wiki/blob/be701b7c46bb85378352b853aacce7bacae6b0d1/Supplementary/MMLT%20Chapter%200%20Notes%20%28240411%29.pdf" target="_blank" rel="noopener"><span class="eyebrow">SUPPLEMENTARY PDF</span><h3>MMLT Chapter 0 Notes</h3><p>The supplementary notes dated April 11, 2024.</p></a><a class="utility-card" href="#/article/stochastic-linear-bandits@label-fig-stochastic-contextual-bandit"><span class="eyebrow">VISUAL GUIDE</span><h3>Contextual-bandit protocol</h3><p>Follow the context, action, and observed reward within one round.</p></a></div><section class="prose"><h2>Cited literature</h2></section><ol class="reference-list bibliography">${data.references.map((r,i) => `<li class="reference-entry" id="ref-${esc(r.id)}"><span class="reference-number">[${i+1}]</span><div><h2><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></h2><p>${esc(r.authors || r.author)} · ${esc(r.year)}</p>${r.venue ? `<p class="muted">${esc(r.venue)}</p>` : ''}</div></li>`).join('')}</ol><section class="prose"><h2>Study-group record</h2><p>The repository also includes a historical June–July 2026 study schedule. <a href="https://github.com/wronskian0103/Bandit_wiki/blob/be701b7c46bb85378352b853aacce7bacae6b0d1/StudyPlan.txt" target="_blank" rel="noopener">View the original study plan in the private repository</a>.</p><p>The two files under <code>sections/0-Preliminaries/</code> are empty placeholders in this version of the source. All substantive article text comes from <code>main.tex</code>.</p></section></div>`;
  }

  async function typeset(element = main) {
    if (!window.MathJax?.startup?.promise) return;
    try {
      await window.MathJax.startup.promise;
      if (element.isConnected) await window.MathJax.typesetPromise([element]);
    } catch (err) { console.warn('Math rendering:', err.message); }
  }
  function setActive(page, a) {
    document.querySelectorAll('.nav-link').forEach(el => {
      const active = a ? el.dataset.article === a.id : el.dataset.page === page;
      el.classList.toggle('active', active);
      if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    if (a) {
      const group = document.querySelector(`.nav-group[data-chapter="${a.chapter}"]`);
      group?.querySelector('button')?.setAttribute('aria-expanded','true');
      if (group) group.querySelector('.nav-group-links').hidden = false;
    }
  }
  function scrollAnchor(anchor) {
    const el = document.getElementById(anchor);
    if (!el) return;
    let parent = el.parentElement;
    while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
    const target = el.closest('figure') || el;
    target.scrollIntoView({behavior:'instant',block:'start'});
    target.classList.add('anchor-highlight');
    setTimeout(() => target.classList.remove('anchor-highlight'),1800);
  }
  function observeTOC() {
    observer?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      const visible = entries.find(e => e.isIntersecting);
      if (!visible) return;
      document.querySelectorAll('.page-toc a').forEach(a => a.classList.toggle('active', a.hash.endsWith('@'+visible.target.id)));
    },{rootMargin:'-80px 0px -65% 0px'});
    main.querySelectorAll('h2[id], h3[id], .statement[id], .algorithm[id]').forEach(el => observer.observe(el));
  }
  async function render() {
    const version = ++renderVersion;
    const route = decodeURI(location.hash.slice(1) || '/');
    const [path, anchor] = route.split('@');
    const parts = path.split('/').filter(Boolean);
    const page = parts[0] || 'home';
    const a = page === 'article' ? articleById.get(parts[1]) : null;
    if (page === 'article' && a && activeArticle === a && main.querySelector('#article-body')) {
      if (anchor) { await typeset(); if (version===renderVersion) scrollAnchor(anchor); } else window.scrollTo(0,0);
      return;
    }
    activeArticle = a;
    if (window.MathJax?.typesetClear) window.MathJax.typesetClear([main]);
    if (a) {
      main.innerHTML = articlePage(a); remember('bandit-last-article',a.id);
      document.title = `${a.title} · Bandit Algorithms Wiki`;
      document.getElementById('breadcrumbs').innerHTML = `<a href="#/">Library</a><span>/</span><span>${esc(chapterNames[a.chapter])}</span>`;
    } else {
      const pages = new Map([
        ['home', ['Overview', home]],
        ['experiments', ['Bandit lab', window.BanditLab.render]],
        ['notation', ['Notation guide', notationPage]],
        ['theorems', ['Statements & algorithms', statementsPage]],
        ['references', ['References & source files', referencesPage]]
      ]);
      const [title, renderPage] = pages.get(page) || ['Page not found', () => '<div class="page"><h1>Article not found</h1><p>Return to the <a href="#/">overview</a> to find a chapter.</p></div>'];
      main.innerHTML = renderPage();
      document.title = `${title} · Bandit Algorithms Wiki`;
      document.getElementById('breadcrumbs').innerHTML = `<a href="#/">Library</a><span>/</span><span>${esc(title)}</span>`;
    }
    setActive(page,a); closeMenu();
    window.scrollTo(0,0);
    if (a) bindArticleTools();
    if (page === 'experiments') window.BanditLab.mount(main);
    if (page === 'theorems') { filterStatements(); document.getElementById('index-search').addEventListener('input',filterStatements); }
    await typeset();
    if (version !== renderVersion) return;
    if (anchor) scrollAnchor(anchor);
    observeTOC();
  }

  function bindArticleTools() {
    const proofs = [...main.querySelectorAll('details.proof')];
    const button = document.getElementById('toggle-proofs');
    button.hidden = !proofs.length;
    const sync = () => { const open = proofs.every(p => p.open); button.textContent = open ? 'Collapse all proofs' : 'Expand all proofs'; button.setAttribute('aria-pressed',String(open)); };
    button.addEventListener('click',() => { const open = !proofs.every(p => p.open); proofs.forEach(p => {p.open=open;}); sync(); });
    proofs.forEach(p => p.addEventListener('toggle',sync));
    document.getElementById('copy-link').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); toast('Article link copied'); }
      catch (_) { toast('Select and copy the address from your browser’s address bar.'); }
    });
    document.getElementById('print-article').addEventListener('click',() => window.print());
  }
  let printProofs = [];
  window.addEventListener('beforeprint',() => { printProofs = [...main.querySelectorAll('details.proof')].map(p => [p,p.open]); printProofs.forEach(([p]) => {p.open=true;}); });
  window.addEventListener('afterprint',() => { printProofs.forEach(([p,open]) => {p.open=open;}); });
  let toastTimer;
  function toast(message) { const el=document.getElementById('toast'); el.textContent=message; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(() => {el.hidden=true;},3500); }

  const dialog = document.getElementById('search-dialog');
  const searchInput = document.getElementById('search-input');
  function openSearch(query='') { if (!dialog.open) dialog.showModal(); searchInput.value=query; runSearch(); searchInput.focus(); }
  function mark(text,terms) {
    if (!terms.length) return esc(text);
    const escapedTerms=terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
    const pattern = new RegExp('('+escapedTerms.join('|')+')','ig');
    return text.split(pattern).map((part,i) => i % 2 ? '<mark>'+esc(part)+'</mark>' : esc(part)).join('');
  }
  function runSearch() {
    const q=searchInput.value.trim().toLowerCase();
    const terms=q.split(/\s+/).filter(Boolean);
    const chapter=document.getElementById('search-chapter').value;
    const matches=articles.filter(a => chapter==='all'||String(a.chapter)===chapter).map(a => {
      const title=a.title.toLowerCase(),text=(a.text||'').toLowerCase();
      const score=terms.reduce((s,t) => s+(title.includes(t)?10:0)+(text.includes(t)?1:0),0);
      return {a,score,valid:terms.every(t => title.includes(t)||text.includes(t))};
    }).filter(r=>r.valid).sort((a,b)=>b.score-a.score);
    document.getElementById('search-count').textContent=terms.length?`${matches.length} articles`:'';
    document.getElementById('search-results').innerHTML = !terms.length ? `<div class="search-empty"><h2>What are you studying?</h2><p>Try a concept, a result, or an algorithm.</p><div class="suggested-searches">${['UCB','regret decomposition','Exp3','least squares','sparsity','optimism'].map(s=>`<button class="small-button" data-query="${s}">${s}</button>`).join('')}</div></div>` : matches.length ? matches.map(({a}) => {
      const raw=(a.text||'').replace(/\s+/g,' '), lower=raw.toLowerCase();
      const pos=Math.max(0,lower.indexOf(terms.find(t=>lower.includes(t))||''));
      const start=Math.max(0,pos-75),end=Math.min(raw.length,start+240);
      return `<a class="search-result" href="${href(a)}"><span class="result-path">CHAPTER ${a.chapter} · ${esc(chapterNames[a.chapter])}</span><strong class="result-title">${mark(a.title,terms)}</strong><span class="result-snippet">${start?'…':''}${mark(raw.slice(start,end),terms)}${end<raw.length?'…':''}</span></a>`;
    }).join('') : `<div class="search-empty"><h2>No matching articles</h2><p>Try fewer words, another spelling, or all chapters.</p></div>`;
    document.querySelectorAll('[data-query]').forEach(b=>b.addEventListener('click',()=>{searchInput.value=b.dataset.query;runSearch();searchInput.focus();}));
    document.querySelectorAll('.search-result').forEach(a=>a.addEventListener('click',()=>dialog.close()));
  }
  searchInput.addEventListener('input',runSearch);
  document.getElementById('search-chapter').addEventListener('change',runSearch);
  document.getElementById('open-search').addEventListener('click',()=>openSearch());
  document.getElementById('close-search').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  document.addEventListener('keydown',e=>{
    if ((e.key==='/' || (e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey))) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) {e.preventDefault();openSearch();}
    if (e.key==='Escape') closeMenu();
  });
  const menuButton=document.getElementById('menu-toggle');
  document.querySelector('.skip-link').addEventListener('click', e => { e.preventDefault(); main.focus(); main.scrollIntoView({block:'start'}); });
  function closeMenu() {document.body.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');document.getElementById('mobile-scrim').hidden=true;}
  menuButton.addEventListener('click',()=>{const open=!document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',open);menuButton.setAttribute('aria-expanded',String(open));document.getElementById('mobile-scrim').hidden=!open;});
  document.getElementById('mobile-scrim').addEventListener('click',closeMenu);
  const themeButton=document.getElementById('theme-toggle');
  const syncTheme=()=>themeButton.setAttribute('aria-label',`Switch to ${document.documentElement.dataset.theme==='dark'?'light':'dark'} theme`);
  themeButton.addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;remember('bandit-theme',theme);syncTheme();});
  syncTheme();initNav();
  window.addEventListener('hashchange',render);
  window.addEventListener('load',()=>typeset());
  render();
})();
