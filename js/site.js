/* ==========================================================================
   Enabley Varejo · coreografia
   Eixo alterna: horizontal (pinado, o vertical para) ↔ vertical (fluxo).
   Cada ato horizontal é um ScrollTrigger com pin: enquanto ele está ativo,
   a página não sobe nem um pixel até a trilha terminar.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function norm(p, r) { return clamp((p - r[0]) / (r[1] - r[0]), 0, 1); }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------
     Conversa do AI Companion, função pura do progresso p (0..1).
     Rolar para trás desfaz a conversa; nada depende de estado anterior.
     ------------------------------------------------------------------ */
  var Q1 = 'Cliente quer trocar um produto sem nota fiscal. Posso fazer a troca?';
  var Q2 = 'E se for alimento perecível?';
  var S = {
    q1: [0.05, 0.22], send1: 0.235, dots1: [0.245, 0.31], a1: [0.31, 0.6], src1: 0.615,
    q2: [0.67, 0.75], send2: 0.765, dots2: [0.775, 0.82], a2: [0.82, 0.93], src2: 0.945
  };
  var el = {
    q1: $('#q1'), q2: $('#q2'), a1: $('#a1'), a2: $('#a2'), dots: $('#dots'),
    typed: $('#typed'), ph: $('#ph'), field: $('.app__field'), send: $('#send'), sub: $('#appSub')
  };
  el.q1.textContent = Q1;
  el.q2.textContent = Q2;

  // Quebra a resposta em palavras para o "streaming".
  function wordify(msg) {
    var words = [];
    $$('p, li', msg).forEach(function (block) {
      var text = block.textContent;
      block.textContent = '';
      text.split(/(\s+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { block.appendChild(document.createTextNode(tok)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = tok;
        block.appendChild(s);
        words.push(s);
      });
    });
    return { words: words, blocks: $$('li', msg), src: $('.src', msg), lit: -1 };
  }
  var A1 = wordify(el.a1), A2 = wordify(el.a2);

  function setWords(A, t) {
    var n = Math.round(A.words.length * t);
    if (n === A.lit) return;
    A.lit = n;
    for (var i = 0; i < A.words.length; i++) A.words[i].classList.toggle('on', i < n);
    A.blocks.forEach(function (li) { li.classList.toggle('empty', !li.querySelector('.w.on')); });
  }
  function show(node, on) { if (node.classList.contains('show') !== on) node.classList.toggle('show', on); }

  var lastSent = 0;
  function renderChat(p) {
    var typed = '';
    if (p >= S.q1[0] && p < S.send1) typed = Q1.slice(0, Math.round(Q1.length * norm(p, S.q1)));
    else if (p >= S.q2[0] && p < S.send2) typed = Q2.slice(0, Math.round(Q2.length * norm(p, S.q2)));
    var typing = (p >= S.q1[0] && p < S.send1) || (p >= S.q2[0] && p < S.send2);
    if (el.typed.textContent !== typed) el.typed.textContent = typed;
    el.ph.style.display = typed ? 'none' : '';
    el.field.classList.toggle('typing', typing);
    el.send.classList.toggle('ready', typed.length > 0);

    show(el.q1, p >= S.send1);
    show(el.q2, p >= S.send2);
    var thinking = (p >= S.dots1[0] && p < S.a1[0]) || (p >= S.dots2[0] && p < S.a2[0]);
    show(el.dots, thinking);
    el.sub.textContent = thinking ? 'digitando…' : 'Responde com os conteúdos da sua loja';
    el.sub.classList.toggle('is-typing', thinking);

    show(el.a1, p >= S.a1[0]);
    setWords(A1, norm(p, S.a1));
    A1.src.classList.toggle('on', p >= S.src1);
    show(el.a2, p >= S.a2[0]);
    setWords(A2, norm(p, S.a2));
    A2.src.classList.toggle('on', p >= S.src2);

    // Um pequeno "toque" no aparelho quando a mensagem é enviada (só para frente).
    var sent = (p >= S.send2) ? 2 : (p >= S.send1 ? 1 : 0);
    if (sent > lastSent && hasGSAP && !RM) {
      gsap.fromTo('#phone', { scale: 1 }, { scale: 1.025, duration: 0.14, ease: 'power2.out', yoyo: true, repeat: 1 });
    }
    lastSent = sent;
  }

  /* ------------------------------------------------------------------
     Simulador
     ------------------------------------------------------------------ */
  var sim = (function () {
    var f = { adm: $('#iAdm'), sal: $('#iSal'), hoje: $('#iHoje'), novo: $('#iNovo') };
    var o = { adm: $('#oAdm'), sal: $('#oSal'), hoje: $('#oHoje'), novo: $('#oNovo') };
    var v = { money: $('#vMoney'), days: $('#vDays'), people: $('#vPeople') };
    var tilesBox = $('#tiles');
    var TILES = 300, PER = 150;
    var tiles = [];
    for (var i = 0; i < TILES; i++) {
      var t = document.createElement('i');
      t.style.transitionDelay = (i * 1.6) + 'ms';
      tilesBox.appendChild(t);
      tiles.push(t);
    }
    var shown = { money: 0, days: 0, people: 0 };
    var target = { money: 0, days: 0, people: 0 };
    var armed = false;

    function fmtMoney(x) {
      if (x >= 1e6) {
        var m = x / 1e6;
        return 'R$ ' + m.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + (m < 1.95 ? ' milhão' : ' milhões');
      }
      if (x >= 1e3) return 'R$ ' + Math.round(x / 1e3).toLocaleString('pt-BR') + ' mil';
      return 'R$ ' + Math.round(x).toLocaleString('pt-BR');
    }
    function paint() {
      v.money.textContent = fmtMoney(shown.money);
      v.days.textContent = Math.round(shown.days).toLocaleString('pt-BR');
      v.people.textContent = Math.round(shown.people).toLocaleString('pt-BR');
    }
    function fill(input) {
      var pct = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--fill', pct + '%');
    }
    function compute() {
      var adm = +f.adm.value, sal = +f.sal.value, hoje = +f.hoje.value, novo = +f.novo.value;
      if (novo > hoje) { novo = hoje; f.novo.value = hoje; }
      o.adm.textContent = adm.toLocaleString('pt-BR');
      o.sal.textContent = 'R$ ' + sal.toLocaleString('pt-BR');
      o.hoje.textContent = hoje + (hoje === 1 ? ' dia' : ' dias');
      o.novo.textContent = novo + (novo === 1 ? ' dia' : ' dias');
      Object.keys(f).forEach(function (k) { fill(f[k]); });

      var custoDia = sal * 1.8 / 30;
      var dias = Math.max(0, hoje - novo) * adm;
      target.money = dias * custoDia;
      target.days = dias;
      target.people = dias / 220;
      if (!armed) return;
      var lit = Math.min(TILES, Math.round(dias / PER));
      tiles.forEach(function (t, i) { t.classList.toggle('on', i < lit); });
      if (hasGSAP && !RM) gsap.to(shown, { money: target.money, days: target.days, people: target.people, duration: 0.7, ease: 'expo.out', onUpdate: paint, overwrite: true });
      else { shown.money = target.money; shown.days = target.days; shown.people = target.people; paint(); }
    }
    Object.keys(f).forEach(function (k) { f[k].addEventListener('input', compute); });
    compute();
    return { arm: function () { if (armed) return; armed = true; compute(); } };
  })();

  /* ------------------------------------------------------------------
     Faixas de logos (fundo do ato 3)
     ------------------------------------------------------------------ */
  var LOGOS = ['unilever', 'novo-atacarejo', 'cocacola', 'chillibeans', 'ambev', 'giraffas', 'dpaschoal', 'vivo', 'msig'];
  $$('.logos__row').forEach(function (row, r) {
    for (var k = 0; k < 3; k++) {
      LOGOS.forEach(function (name, i) {
        var s = document.createElement('span');
        var img = document.createElement('img');
        img.src = 'assets/logos/c/' + name + '.png'; img.alt = ''; img.loading = 'lazy';
        s.appendChild(img);
        row.appendChild(s);
      });
    }
    if (r === 1) row.appendChild(row.firstChild);
  });


  /* Cases: grade de certificados (DPaschoal) e pontos de países (MSIG) */
  $$('.viz[data-n]').forEach(function (box) {
    for (var i = 0; i < +box.dataset.n; i++) {
      var d = document.createElement('i');
      d.style.setProperty('--i', i);
      box.appendChild(d);
    }
  });

  /* QR code ilustrativo do iPhone de demonstração (padrão fixo, não decodifica) */
  (function () {
    var svg = $('#qr'); if (!svg) return;
    var N = 25, seed = 7, out = '';
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    function finder(x, y) { return x < 7 && y < 7; }
    function inFinder(x, y) {
      var f = [[0, 0], [N - 7, 0], [0, N - 7]];
      for (var k = 0; k < 3; k++) {
        var fx = x - f[k][0], fy = y - f[k][1];
        if (finder(fx, fy) && fx >= 0 && fy >= 0) {
          var ring = Math.max(Math.abs(fx - 3), Math.abs(fy - 3));
          return ring === 3 || ring <= 1 ? 1 : 0;
        }
        if (fx >= -1 && fy >= -1 && fx <= 7 && fy <= 7) return 0;
      }
      return -1;
    }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var f = inFinder(x, y);
      if (f === 1 || (f === -1 && rnd() > 0.52)) out += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    svg.innerHTML = out;
  })();

  /* ------------------------------------------------------------------
     Vídeos (Vimeo): prévia muda ao entrar no ato, som sob demanda.
     ------------------------------------------------------------------ */
  var vcards = $$('.vcard');
  function vimeoSrc(card, sound) {
    var base = 'https://player.vimeo.com/video/' + card.dataset.vimeo + '?h=' + card.dataset.hash + '&dnt=1';
    return sound ? base + '&autoplay=1&muted=0&controls=1&title=0&byline=0&portrait=0'
                 : base + '&background=1&autoplay=1&loop=1&muted=1';
  }
  function mount(card, sound) {
    var frame = $('.vcard__frame', card);
    var ifr = $('iframe', frame);
    if (!ifr) {
      ifr = document.createElement('iframe');
      ifr.allow = 'autoplay; fullscreen; picture-in-picture';
      ifr.title = 'Depoimento em vídeo';
      ifr.addEventListener('load', function () { card.classList.add('is-loaded'); });
      frame.appendChild(ifr);
    }
    var src = vimeoSrc(card, sound);
    if (ifr.src !== src) ifr.src = src;
    card.dataset.sound = sound ? '1' : '';
    $('.vcard__play', card).textContent = sound ? '■ Voltar à prévia' : '▶ Ouvir com som';
  }
  var videosMounted = false;
  function mountVideos() {
    if (videosMounted) return;
    videosMounted = true;
    vcards.forEach(function (c) { mount(c, false); });
  }
  vcards.forEach(function (card) {
    $('.vcard__play', card).addEventListener('click', function () {
      var on = !card.dataset.sound;
      vcards.forEach(function (c) { if (c !== card && c.dataset.sound) mount(c, false); });
      mount(card, on);
    });
  });

  /* Escala: pontinhos de "pessoas" */
  var people = $('.people');
  if (people) for (var pi = 0; pi < 64; pi++) { var pd = document.createElement('i'); pd.style.setProperty('--i', pi); people.appendChild(pd); }

  /* Vídeos em loop: tocam só quando visíveis; movimento reduzido fica no pôster */
  var loops = $$('video[data-loop]');
  loops.forEach(function (v) { v.muted = true; });
  if (RM) loops.forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
  else {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var pr = e.target.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else e.target.pause();
      });
    }, { rootMargin: '200px' });
    loops.forEach(function (v) { vio.observe(v); });
  }

  /* Dinheiro vazando: moedas só caem com a seção na tela */
  var leak = $('.leak');
  if (leak && !RM) new IntersectionObserver(function (es) { es.forEach(function (e) { leak.classList.toggle('run', e.isIntersecting); }); }).observe(leak);

  /* ------------------------------------------------------------------
     Sem GSAP ou com movimento reduzido: estado final, rolagem nativa.
     ------------------------------------------------------------------ */
  if (!hasGSAP || RM) {
    renderChat(1);
    $$('.lp--end').forEach(function (n) { n.classList.add('play'); });
    $$('.lcard').forEach(function (c) { c.classList.add('live'); });
    $$('.reveal').forEach(function (n) { n.classList.add('in'); });
    $$('[data-count]').forEach(function (n) { n.textContent = n.dataset.count; });
    sim.arm();
    mountVideos();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  var mobile = window.matchMedia('(max-width: 767px)').matches;

  /* Scroll suave (desktop). Toque continua nativo. */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var target = id.length > 1 && $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  function axis(self) { root.classList.toggle('is-h', self.isActive); }

  /* ------------------------------------------------------------------
     Abertura (no carregamento, não na rolagem)
     ------------------------------------------------------------------ */
  var intro = gsap.timeline({ delay: 0.15 });
  intro
    .from('.hero__title .line > span', { yPercent: 115, duration: 1.2, ease: 'expo.out', stagger: 0.12 })
    .from('.hp--intro .eyebrow, .hp--intro .hero__lede', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1 }, 0.25)
    .from('#phone', { y: 220, opacity: 0, rotateX: 28, rotateZ: 6, duration: 1.6, ease: 'expo.out' }, 0.1)
    .from('.phone-note', { opacity: 0, duration: 0.6 }, 1.1)
    .from('.hero__words', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0)
    .from('.nav', { y: -30, opacity: 0, duration: 0.8, ease: 'expo.out' }, 0.4);

  /* ------------------------------------------------------------------
     ATO 1 · Hero horizontal com quatro planos
     fundo (palavras, 0.35x) · trilha (1x) · iPhone (fixo, gira) · chips (1.25x)
     ------------------------------------------------------------------ */
  var heroTrack = $('.hero__track');
  function heroDist() { return Math.max(0, heroTrack.scrollWidth - window.innerWidth); }
  var hero = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#hero', start: 'top top', pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
      end: function () { return '+=' + Math.round(heroDist() * 1.7 + window.innerHeight * 0.5); },
      onToggle: axis
    },
    onUpdate: function () { renderChat(clamp(hero.time(), 0, 1)); }
  });
  hero
    .to(heroTrack, { x: function () { return -heroDist(); }, duration: 1 }, 0)
    .to('.hero__words', { x: function () { return -heroDist() * 0.35; }, duration: 1 }, 0)
    .to('.hero__chips', { x: function () { return -heroDist() * 1.25; }, duration: 1 }, 0)
    .fromTo('.hero .shot video', { xPercent: -7 }, { xPercent: 7, duration: 1 }, 0)
    .fromTo('#phone', { rotateY: mobile ? -6 : -16, rotateX: 4 }, { rotateY: mobile ? 6 : 12, rotateX: -2, duration: 1 }, 0)
    .to('.hero__glow', { xPercent: -40, duration: 1 }, 0)
    .to('.hero .hx-progress i', { scaleX: 1, duration: 1 }, 0)
    .to({}, { duration: 0.08 });
  renderChat(0);

  /* ------------------------------------------------------------------
     Atos horizontais genéricos
     ------------------------------------------------------------------ */
  function hScroll(sec, opts) {
    opts = opts || {};
    var track = $('.hx-track', sec);
    function dist() { return Math.max(0, track.scrollWidth - window.innerWidth); }
    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: sec, start: 'top top', pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        end: function () { return '+=' + Math.round(dist() * (opts.speed || 1.15) + window.innerHeight * 0.3); },
        onToggle: function (self) { axis(self); if (opts.onToggle) opts.onToggle(self); }
      }
    });
    tl.to(track, { x: function () { return -dist(); }, duration: 1 }, 0)
      .to($('.hx-progress i', sec), { scaleX: 1, duration: 1 }, 0);
    tl.to({}, { duration: 0.1 }, 1);
    return tl;
  }

  /* ATO 3 · logos: cartões girando em 3D ao cruzar o centro + faixas opostas */
  var logosSec = $('#clientes');
  var logosTl = hScroll(logosSec, { speed: 1.25 });
  logosTl
    .fromTo('.logos__row--a', { xPercent: 0 }, { xPercent: -38, duration: 1 }, 0)
    .fromTo('.logos__row--b', { xPercent: -38 }, { xPercent: 0, duration: 1 }, 0);
  var lcards = $$('.lcard');
  var lcardLogos = lcards.map(function (c) { return $('.lcard__logo img', c); });
  var scaleEnd = $('.lp--end'), scalePlaying = false;
  function playScale(on) {
    if (on === scalePlaying) return;
    scalePlaying = on;
    scaleEnd.classList.toggle('play', on);
    if (!on) return;
    var u = $('[data-users]', scaleEnd), o = { v: 0 };
    gsap.to(o, { v: 1000000, duration: 1.8, ease: 'expo.out', onUpdate: function () { u.textContent = '+' + Math.round(o.v).toLocaleString('pt-BR'); }, onComplete: function () { u.textContent = '+1 milhão'; } });
    $$('[data-to]', scaleEnd).forEach(function (n) {
      var t = { v: 0 }, end = +n.dataset.to;
      gsap.to(t, { v: end, duration: 1.4, ease: 'expo.out', onUpdate: function () { n.textContent = Math.round(t.v); } });
    });
  }
  function cardDepth() {
    var vw = window.innerWidth;
    if (scaleEnd) {
      var er = scaleEnd.getBoundingClientRect();
      var ed = Math.abs((er.left + er.width / 2) - vw / 2) / vw;
      if (ed < 0.45) playScale(true); else if (ed > 1.1) playScale(false);
    }
    lcards.forEach(function (c, i) {
      var r = c.getBoundingClientRect();
      if (r.right < -vw * 0.5 || r.left > vw * 1.5) return;
      var d = clamp(((r.left + r.width / 2) - vw / 2) / vw, -1, 1);
      var ad = Math.abs(d);
      c.style.transform = 'translateZ(' + (-ad * 260).toFixed(1) + 'px) rotateY(' + (-d * 42).toFixed(2) + 'deg) rotateZ(' + (d * 3).toFixed(2) + 'deg)';
      c.style.opacity = (1 - ad * 0.35).toFixed(3);
      lcardLogos[i].style.transform = 'translateX(' + (d * -4).toFixed(1) + '%) scale(' + (1 - ad * 0.06).toFixed(3) + ')';
      if (ad < 0.42) c.classList.add('live');
    });
  }

  /* ATO 5 · vídeos: o celular do centro cresce */
  var videosTl = hScroll($('#videos'), {
    speed: 1.2,
    onToggle: function (self) { if (self.isActive) mountVideos(); }
  });
  function videoDepth() {
    var vw = window.innerWidth;
    vcards.forEach(function (c) {
      var r = c.getBoundingClientRect();
      if (r.right < -vw * 0.5 || r.left > vw * 1.5) return;
      var d = clamp(((r.left + r.width / 2) - vw / 2) / vw, -1, 1);
      var ad = Math.abs(d);
      c.style.transform = 'scale(' + (1 - ad * 0.18).toFixed(3) + ') translateY(' + (ad * 30).toFixed(1) + 'px) rotate(' + (d * 4).toFixed(2) + 'deg)';
    });
  }
  ScrollTrigger.create({ trigger: '#videos', start: 'top 150%', once: true, onEnter: mountVideos });

  gsap.ticker.add(function () {
    if (logosTl.scrollTrigger && logosTl.scrollTrigger.isActive) cardDepth();
    if (videosTl.scrollTrigger && videosTl.scrollTrigger.isActive) videoDepth();
  });
  cardDepth();
  videoDepth();

  /* ------------------------------------------------------------------
     Atos verticais: títulos por palavra, reveals, contadores, cortina
     ------------------------------------------------------------------ */
  $$('[data-split]').forEach(function (h) {
    var out = document.createDocumentFragment();
    function addWords(text, cls) {
      text.split(/(\s+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { out.appendChild(document.createTextNode(' ')); return; }
        var w = document.createElement('span'); w.className = 'wd';
        var inner = document.createElement('span'); inner.textContent = tok;
        if (cls) inner.className = cls;
        w.appendChild(inner); out.appendChild(w);
      });
    }
    Array.prototype.slice.call(h.childNodes).forEach(function (n) {
      if (n.nodeType === 3) addWords(n.textContent, '');
      else if (n.nodeName === 'BR') out.appendChild(document.createElement('br'));
      else addWords(n.textContent, n.className);
    });
    h.textContent = '';
    h.appendChild(out);
    gsap.from($$('.wd > span', h), {
      yPercent: 110, rotate: 4, duration: 1.1, ease: 'expo.out', stagger: 0.045,
      scrollTrigger: { trigger: h, start: 'top 82%', once: true }
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('.reveal').forEach(function (n, i) {
    var sib = n.parentElement ? $$('.reveal', n.parentElement).indexOf(n) : 0;
    n.style.transitionDelay = (Math.max(0, sib) * 90) + 'ms';
    io.observe(n);
  });

  $$('[data-count]').forEach(function (n) {
    var end = +n.dataset.count, o = { v: 0 };
    ScrollTrigger.create({
      trigger: n, start: 'top 85%', once: true,
      onEnter: function () { gsap.to(o, { v: end, duration: 1.6, ease: 'expo.out', onUpdate: function () { n.textContent = Math.round(o.v); } }); }
    });
  });

  gsap.fromTo('.pain__frame video', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.pain__grid', start: 'top bottom', end: 'bottom top', scrub: true } });

  gsap.timeline({ scrollTrigger: { trigger: '.proof__img', start: 'top 85%', end: 'top 30%', scrub: 1 } })
    .to('.curtain', { clipPath: 'inset(0 0 0% 0)', ease: 'none' }, 0)
    .to('.curtain video', { scale: 1, ease: 'none' }, 0);

  gsap.fromTo('.leak__fill', { scaleX: 1 }, { scaleX: 0.34, ease: 'none', scrollTrigger: { trigger: '.leak', start: 'top 85%', end: 'bottom 15%', scrub: 1 } });

  gsap.fromTo('.lever', { y: 0 }, { y: function (i) { return (i - 1) * -40; }, ease: 'none', scrollTrigger: { trigger: '.levers', start: 'top bottom', end: 'bottom top', scrub: true } });

  ScrollTrigger.create({ trigger: '#simulador', start: 'top 70%', once: true, onEnter: sim.arm });
  ScrollTrigger.create({ trigger: '#simulador', start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: root, className: 'on-light' } });

  gsap.fromTo('.close__logos', { yPercent: -35, rotate: -14 }, { yPercent: -65, rotate: -4, ease: 'none', scrollTrigger: { trigger: '.close', start: 'top bottom', end: 'bottom top', scrub: true } });

  function refresh() { ScrollTrigger.refresh(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh);
})();
