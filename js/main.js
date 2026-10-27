/* Smarto theme — interactions */
(function () {
  'use strict';

  var ROOT = (window.__ROOT__ || '/').replace(/\/?$/, '/');
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Header ---------- */
  var header = $('#site-header');
  var backTop = $('#back-top');
  var progress = $('#read-progress');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 10);
    if (backTop) backTop.classList.toggle('is-show', y > 600);
    if (progress) {
      var doc = document.documentElement;
      var total = doc.scrollHeight - window.innerHeight;
      progress.style.width = (total > 0 ? Math.min(100, (y / total) * 100) : 0) + '%';
    }
    updateToc(y);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Mobile nav ---------- */
  var toggle = $('#menu-toggle');
  var mobileNav = $('#mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('is-open');
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', mobileNav).forEach(function (a) {
      a.addEventListener('click', function () {
        mobileNav.classList.remove('is-open');
        toggle.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- Search ---------- */
  var searchIndex = null;
  var searchLoading = false;
  var searchCallbacks = [];

  function loadIndex(cb) {
    if (searchIndex) { cb(searchIndex); return; }
    searchCallbacks.push(cb);
    if (searchLoading) return;
    searchLoading = true;
    fetch(ROOT + 'search.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        searchIndex = data;
        searchCallbacks.forEach(function (fn) { fn(data); });
        searchCallbacks = [];
      })
      .catch(function () {
        searchCallbacks.forEach(function (fn) { fn([]); });
        searchCallbacks = [];
      })
      .finally(function () { searchLoading = false; });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, kw) {
    var safe = escapeHtml(text);
    if (!kw) return safe;
    var re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  }

  function searchPosts(list, q) {
    var kw = q.trim().toLowerCase();
    if (!kw) return [];
    return list.map(function (item) {
      var score = 0;
      var title = (item.title || '').toLowerCase();
      var tags = (item.tags || []).join(' ').toLowerCase();
      var cats = (item.categories || []).join(' ').toLowerCase();
      var text = (item.text || '').toLowerCase();
      if (title.indexOf(kw) > -1) score += 10;
      if (tags.indexOf(kw) > -1) score += 5;
      if (cats.indexOf(kw) > -1) score += 4;
      if (text.indexOf(kw) > -1) score += 1;
      if (!score) return null;
      var idx = text.indexOf(kw);
      var snippet = idx > -1
        ? (idx > 40 ? '…' + item.text.slice(idx - 40, idx + 100) : item.text.slice(0, 140))
        : item.text.slice(0, 140);
      return { item: item, score: score, snippet: snippet };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score; });
  }

  function renderResults(container, results, kw, prefix) {
    if (!container) return;
    if (!results.length) {
      container.innerHTML = '<p class="search-empty">没有找到和「' + escapeHtml(kw) + '」有关的文章，换个词试试？</p>';
      return;
    }
    container.innerHTML = '<p class="search-count">找到 ' + results.length + ' 篇相关文章</p>' +
      results.slice(0, 20).map(function (r) {
        var it = r.item;
        var meta = [it.date].concat(it.categories || []).join(' · ');
        return '<a class="' + prefix + '" href="' + ROOT + it.path + '">' +
          '<h3>' + highlight(it.title, kw) + '</h3>' +
          '<p>' + highlight(r.snippet, kw) + '</p>' +
          '<div class="search-meta">' + escapeHtml(meta) + '</div>' +
          '</a>';
      }).join('');
  }

  // overlay search
  var layer = $('#search-layer');
  var layerInput = $('#search-layer-input');
  var layerResults = $('#search-layer-results');
  var layerTimer;

  function openSearch() {
    if (!layer) return;
    layer.classList.add('is-open');
    layer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { if (layerInput) layerInput.focus(); }, 120);
  }
  function closeSearch() {
    if (!layer) return;
    layer.classList.remove('is-open');
    layer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  $$('.js-search-open').forEach(function (b) { b.addEventListener('click', openSearch); });
  $$('.js-search-close').forEach(function (b) { b.addEventListener('click', closeSearch); });
  if (layer) {
    layer.addEventListener('click', function (e) { if (e.target === layer) closeSearch(); });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
  });

  if (layerInput) {
    layerInput.addEventListener('input', function () {
      var q = layerInput.value;
      clearTimeout(layerTimer);
      layerTimer = setTimeout(function () {
        if (!q.trim()) { layerResults.innerHTML = ''; return; }
        loadIndex(function (list) {
          renderResults(layerResults, searchPosts(list, q), q, 'search-result-item');
        });
      }, 160);
    });
  }

  // page search
  var pageInput = $('#page-search-input');
  var pageResults = $('#page-search-results');
  var pageClear = $('#page-search-clear');
  var pageTimer;

  function runPageSearch(q) {
    if (!pageResults) return;
    if (!q.trim()) {
      pageResults.innerHTML = '<div class="search-placeholder"><p>输入关键词开始搜索</p><span>可以试试文章标题、分类名，或者正文里出现过的词。</span></div>';
      return;
    }
    loadIndex(function (list) {
      renderResults(pageResults, searchPosts(list, q), q, 'search-item');
    });
  }

  if (pageInput) {
    pageInput.addEventListener('input', function () {
      clearTimeout(pageTimer);
      var q = pageInput.value;
      pageTimer = setTimeout(function () { runPageSearch(q); }, 180);
    });
    if (pageClear) {
      pageClear.addEventListener('click', function () {
        pageInput.value = '';
        runPageSearch('');
        pageInput.focus();
      });
    }
    $$('.js-hot-tag').forEach(function (b) {
      b.addEventListener('click', function () {
        pageInput.value = b.getAttribute('data-tag');
        runPageSearch(pageInput.value);
        pageInput.focus();
      });
    });
  }

  /* ---------- Typed headline ---------- */
  var typedEl = $('#typed-text');
  if (typedEl) {
    var words = window.__TYPED_WORDS__ || [];
    if (words.length > 1) {
      var wi = 0, ci = 0, deleting = false;
      var tick = function () {
        var word = words[wi];
        if (!deleting) {
          ci++;
          typedEl.textContent = word.slice(0, ci);
          if (ci === word.length) { deleting = true; setTimeout(tick, 2000); return; }
          setTimeout(tick, 130);
        } else {
          ci--;
          typedEl.textContent = word.slice(0, ci);
          if (ci === 0) { deleting = false; wi = (wi + 1) % words.length; setTimeout(tick, 260); return; }
          setTimeout(tick, 60);
        }
      };
      setTimeout(tick, 1600);
    }
  }

  /* ---------- Skill bars ---------- */
  var bars = $$('.skill-bar i');
  if (bars.length && 'IntersectionObserver' in window) {
    var barIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          el.style.width = (el.getAttribute('data-progress') || 0) + '%';
          barIO.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { barIO.observe(b); });
  } else {
    bars.forEach(function (b) { b.style.width = (b.getAttribute('data-progress') || 0) + '%'; });
  }

  /* ---------- Quote slider ---------- */
  var slider = $('#quote-slider');
  if (slider) {
    var items = $$('.quote-item', slider);
    var dots = $$('#quote-dots button');
    var qi = 0, qTimer;
    var showQuote = function (n) {
      qi = (n + items.length) % items.length;
      items.forEach(function (it, i) { it.classList.toggle('is-active', i === qi); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === qi); });
    };
    var autoQuote = function () {
      clearInterval(qTimer);
      if (items.length > 1) qTimer = setInterval(function () { showQuote(qi + 1); }, 6000);
    };
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { showQuote(i); autoQuote(); });
    });
    autoQuote();
  }

  /* ---------- Work filter ---------- */
  var filter = $('#work-filter');
  var workGrid = $('#work-grid');
  if (filter && workGrid) {
    $$('button', filter).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('button', filter).forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var cat = btn.getAttribute('data-filter');
        $$('.work-card', workGrid).forEach(function (card) {
          var show = cat === '*' || card.getAttribute('data-cat') === cat;
          card.classList.toggle('is-hidden', !show);
        });
      });
    });
  }

  /* ---------- Copy link ---------- */
  $$('.js-copy-link').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || location.href;
      var done = function () {
        var old = btn.textContent;
        btn.textContent = '已复制 ✓';
        setTimeout(function () { btn.textContent = old; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
      }
    });
  });

  /* ---------- Subscribe ---------- */
  var subForm = $('#subscribe-form');
  if (subForm) {
    subForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input[type="email"]', subForm);
      var tip = $('#subscribe-tip');
      var email = input ? input.value.trim() : '';
      if (!email) return;
      var action = subForm.getAttribute('data-action');
      var success = subForm.getAttribute('data-success') || '订阅成功，谢谢！';
      if (action) {
        fetch(action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
        }).then(function (r) {
          if (tip) tip.textContent = r.ok ? success : '订阅失败，请稍后再试。';
          if (r.ok && input) input.value = '';
        }).catch(function () {
          if (tip) tip.textContent = '网络有点问题，请稍后再试。';
        });
      } else {
        var mail = subForm.getAttribute('data-email') || '';
        window.location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('订阅更新') + '&body=' + encodeURIComponent('你好，我想订阅「' + document.title + '」的更新。\n\n我的邮箱：' + email);
        if (tip) tip.textContent = success;
      }
    });
  }

  /* ---------- Contact form ---------- */
  var contactForm = $('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var tip = $('#contact-tip');
      var btn = contactForm.querySelector('button[type="submit"]');
      var data = new FormData(contactForm);
      var name = data.get('name') || '';
      var email = data.get('email') || '';
      var subject = data.get('subject') || '来自博客的联系';
      var message = data.get('message') || '';
      var action = contactForm.getAttribute('data-action');
      var mode = contactForm.getAttribute('data-mode');

      function say(text) { if (tip) tip.textContent = text; }
      function busy(on) { if (btn) btn.disabled = !!on; }

      /* 直接写进自己的 Waline，无需第三方表单服务 */
      if (mode === 'waline') {
        var server = (contactForm.getAttribute('data-waline-server') || '').replace(/\/$/, '');
        var page = contactForm.getAttribute('data-waline-page') || '/_contact-inbox/';
        busy(true);
        say('正在发送…');
        fetch(server + '/api/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nick: name,
            mail: email,
            url: page,
            comment: '**主题：' + subject + '**\n\n' + message,
            ua: navigator.userAgent
          })
        }).then(function (r) {
          return r.json();
        }).then(function (res) {
          busy(false);
          if (res && res.errno === 0) {
            say('留言已送达，我会尽快回复你。');
            contactForm.reset();
          } else {
            var msg = res && res.errmsg;
            if (msg && typeof msg === 'object') {
              msg = Object.keys(msg).map(function (k) { return msg[k]; }).join('；');
            }
            say('发送失败：' + (msg || '请稍后再试'));
          }
        }).catch(function () {
          busy(false);
          say('网络有点问题，也可以直接发邮件给我。');
        });
        return;
      }

      if (action) {
        fetch(action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, subject: subject, message: message })
        }).then(function (r) {
          say(r.ok ? '发送成功，我会尽快回复你。' : '发送失败，请稍后再试。');
          if (r.ok) contactForm.reset();
        }).catch(function () {
          say('网络有点问题，也可以直接发邮件给我。');
        });
      } else {
        var mail = contactForm.getAttribute('data-email') || '';
        var body = '姓名：' + name + '\n邮箱：' + email + '\n\n' + message;
        window.location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        say('已打开邮件客户端，发送即可。');
      }
    });
  }

  /* ---------- TOC active ---------- */
  var tocLinks = $$('#toc a');
  var headings = tocLinks.map(function (a) {
    var id = a.getAttribute('href').replace(/^#/, '');
    try { id = decodeURIComponent(id); } catch (err) {}
    return document.getElementById(id);
  }).filter(Boolean);

  function updateToc(y) {
    if (!tocLinks || !tocLinks.length) return;
    var current = null;
    headings.forEach(function (h) {
      if (h.getBoundingClientRect().top <= 140) current = h.id;
    });
    tocLinks.forEach(function (a) {
      var href = a.getAttribute('href').replace(/^#/, '');
      try { href = decodeURIComponent(href); } catch (err) {}
      a.classList.toggle('is-active', !!current && href === current);
    });
  }

  /* ---------- Lightbox ---------- */
  var content = $('#article-content');
  if (content) {
    var imgs = $$('img', content);
    if (imgs.length) {
      var box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = '<button type="button" aria-label="关闭">×</button><img alt="">';
      document.body.appendChild(box);
      var boxImg = $('img', box);
      imgs.forEach(function (img) {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', function () {
          boxImg.src = img.src;
          box.classList.add('is-open');
          document.body.style.overflow = 'hidden';
        });
      });
      var close = function () {
        box.classList.remove('is-open');
        document.body.style.overflow = '';
      };
      box.addEventListener('click', close);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
  }

  /* ---------- Reveal on scroll ---------- */
  var targets = $$('.post-card, .work-card, .cat-card, .friend-card, .price-card, .step-card, .section-head, .about-copy, .skill-list, .contact-card');
  if ('IntersectionObserver' in window && targets.length) {
    targets.forEach(function (el) { el.classList.add('reveal'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 代码块顶栏（语言 + 复制） ---------- */
  $$('.article-content figure.highlight, .rich-text figure.highlight').forEach(function (fig) {
    if (fig.querySelector('.code-head')) return;
    var lang = (fig.className.match(/highlight\s+([\w+#-]+)/) || [])[1] || 'code';
    var head = document.createElement('div');
    head.className = 'code-head';
    head.innerHTML = '<span class="lang">' + lang + '</span>' +
      '<button type="button" class="copy-btn" aria-label="复制代码">复制</button>';
    fig.insertBefore(head, fig.firstChild);
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.copy-btn') : null;
    if (!btn) return;
    var fig = btn.closest('figure.highlight');
    var codeArea = fig ? (fig.querySelector('.code') || fig) : (btn.closest('pre') || btn.parentElement);
    var text = codeArea ? codeArea.innerText : '';
    var done = function () {
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = '复制'; }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (err) {}
      document.body.removeChild(ta);
    }
  });

  /* ---------- 建站天数实时计算 ---------- */
  $$('.js-run-days').forEach(function (el) {
    var s = el.getAttribute('data-start');
    if (!s) return;
    var ts = new Date(s.replace(/-/g, '/')).getTime();
    if (!isNaN(ts)) el.textContent = Math.max(1, Math.floor((Date.now() - ts) / 86400000));
  });

  /* 初始触发一次（放在末尾，确保所有变量已初始化） */
  onScroll();
})();
