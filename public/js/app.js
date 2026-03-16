const DOM = {
  homeView: document.getElementById('home-view'),
  resultsView: document.getElementById('results-view'),
  searchFormHome: document.getElementById('search-form'),
  searchInputHome: document.getElementById('search-input-home'),
  btnSearchHome: document.getElementById('btn-search-home'),

  searchFormTop: document.getElementById('search-form-top'),
  searchInputTop: document.getElementById('search-input-top'),
  logoSmall: document.getElementById('logo-small'),

  resultStats: document.getElementById('result-stats'),
  resultsContainer: document.getElementById('results-container'),
  pagination: document.getElementById('pagination'),
  timeFilter: document.getElementById('time-filter'),
  sortFilter: document.getElementById('sort-filter'),

  previewPanel: document.getElementById('preview-panel'),
  previewClose: document.getElementById('close-preview'),
  previewTitle: document.getElementById('preview-title'),
  previewText: document.getElementById('preview-text'),
  previewDownloadBtn: document.getElementById('preview-download-btn'),

  clearBtnHome: document.getElementById('clear-btn-home'),
  clearBtnTop: document.getElementById('clear-btn-top'),

  systemFooter: document.getElementById('system-footer')
};

let currentQuery = '';
let currentPage = 1;
let currentPeriod = 'all';
let currentSort = 'desc';
const LIMIT = 10;
let lastSelectedDocId = null;

function init() {
  bindEvents();
  checkUrlParams();
  loadSystemStatus();
}

function bindEvents() {
  DOM.searchFormHome.addEventListener('submit', function (e) {
    e.preventDefault();
    performSearch(DOM.searchInputHome.value, 1);
  });

  DOM.btnSearchHome.addEventListener('click', function () {
    performSearch(DOM.searchInputHome.value, 1);
  });

  DOM.searchFormTop.addEventListener('submit', function (e) {
    e.preventDefault();
    performSearch(DOM.searchInputTop.value, 1);
  });

  DOM.logoSmall.addEventListener('click', function () {
    window.history.pushState({}, '', '/');
    showHome();
  });

  window.addEventListener('popstate', checkUrlParams);

  if (DOM.previewClose) {
    DOM.previewClose.addEventListener('click', closePreview);
  }

  // Time filter buttons
  DOM.timeFilter.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    var period = btn.getAttribute('data-period');
    if (period === currentPeriod) return;
    currentPeriod = period;
    updateFilterButtons();
    performSearch(currentQuery, 1);
  });
  
  // Sort filter buttons
  DOM.sortFilter.addEventListener('click', function (e) {
    var btn = e.target.closest('.sort-btn');
    if (!btn) return;
    var sort = btn.getAttribute('data-sort');
    if (sort === currentSort) return;
    currentSort = sort;
    updateFilterButtons();
    performSearch(currentQuery, 1);
  });

  // Clear buttons
  DOM.clearBtnHome.addEventListener('click', function () {
    DOM.searchInputHome.value = '';
    DOM.clearBtnHome.classList.add('hidden');
    DOM.searchInputHome.focus();
  });
  DOM.clearBtnTop.addEventListener('click', function () {
    DOM.searchInputTop.value = '';
    DOM.clearBtnTop.classList.add('hidden');
    DOM.searchInputTop.focus();
  });

  // Toggle clear button visibility on input
  DOM.searchInputHome.addEventListener('input', function () {
    DOM.clearBtnHome.classList.toggle('hidden', !DOM.searchInputHome.value);
  });
  DOM.searchInputTop.addEventListener('input', function () {
    DOM.clearBtnTop.classList.toggle('hidden', !DOM.searchInputTop.value);
  });
}

function updateFilterButtons() {
  // Period buttons
  var pButtons = DOM.timeFilter.querySelectorAll('.filter-btn');
  for (var i = 0; i < pButtons.length; i++) {
    if (pButtons[i].getAttribute('data-period') === currentPeriod) {
      pButtons[i].classList.add('active');
    } else {
      pButtons[i].classList.remove('active');
    }
  }
  
  // Sort buttons
  var sButtons = DOM.sortFilter.querySelectorAll('.sort-btn');
  for (var j = 0; j < sButtons.length; j++) {
    if (sButtons[j].getAttribute('data-sort') === currentSort) {
      sButtons[j].classList.add('active');
    } else {
      sButtons[j].classList.remove('active');
    }
  }
}

function showHome() {
  DOM.homeView.classList.remove('hidden');
  DOM.resultsView.classList.add('hidden');
  DOM.searchInputHome.value = '';
  document.title = '文档搜索引擎';
}

function showResults() {
  DOM.homeView.classList.add('hidden');
  DOM.resultsView.classList.remove('hidden');
}

function checkUrlParams() {
  var urlParams = new URLSearchParams(window.location.search);
  var q = urlParams.get('q');
  var page = parseInt(urlParams.get('page')) || 1;
  var period = urlParams.get('period') || 'all';

  if (q) {
    DOM.searchInputTop.value = q;
    DOM.clearBtnTop.classList.toggle('hidden', !q);
    currentQuery = q;
    currentPage = page;
    currentPeriod = period;
    currentSort = urlParams.get('sort') || 'desc';
    updateFilterButtons();
    fetchResults(q, page);
  } else {
    showHome();
  }
}

function performSearch(query, page) {
  if (!query.trim()) return;
  var url = '/?q=' + encodeURIComponent(query) + '&page=' + page;
  if (currentPeriod !== 'all') {
    url += '&period=' + currentPeriod;
  }
  if (currentSort !== 'desc') {
    url += '&sort=' + currentSort;
  }
  window.history.pushState({ query: query, page: page, period: currentPeriod, sort: currentSort }, '', url);
  currentQuery = query;
  currentPage = page;
  DOM.searchInputTop.value = query;
  DOM.clearBtnTop.classList.toggle('hidden', !query);
  fetchResults(query, page);
}

async function fetchResults(query, page) {
  showResults();
  closePreview();
  document.title = query + ' - 文档搜索引擎';
  DOM.resultsContainer.innerHTML = '<p style="color:#70757a; font-size:14px;">正在全库高速检索，请稍候...</p>';
  DOM.resultStats.textContent = '';
  DOM.pagination.innerHTML = '';

  try {
    var start = performance.now();
    var apiUrl = '/api/search?q=' + encodeURIComponent(query) + '&page=' + page + '&limit=' + LIMIT;
    if (currentPeriod !== 'all') {
      apiUrl += '&period=' + currentPeriod;
    }
    if (currentSort !== 'desc') {
      apiUrl += '&sort=' + currentSort;
    }
    var res = await fetch(apiUrl);
    var data = await res.json();
    var time = ((performance.now() - start) / 1000).toFixed(3);

    DOM.resultStats.textContent = '找到约 ' + data.total + ' 条结果 （用时 ' + time + ' 秒）';
    renderResults(data.data);
    renderPagination(data.total, page);
  } catch (err) {
    DOM.resultsContainer.innerHTML = '<p style="color:#d93025">请求失败: 与搜索服务器失去连接 (' + err.message + ')</p>';
  }
}

function formatTime(mtime) {
  if (!mtime) return '';
  var d = new Date(mtime);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var h = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + day + ' ' + h + ':' + min;
}

function renderResults(items) {
  if (!items || items.length === 0) {
    DOM.resultsContainer.innerHTML =
      '<div style="margin-top:30px">' +
      '<p>找不到和您查询的 "<b>' + escapeHtml(currentQuery) + '</b>" 相符的文档。</p>' +
      '<p style="margin-top:20px">建议：</p>' +
      '<ul style="margin-top:5px; padding-left:20px; color:#3c4043; line-height: 1.6">' +
      '<li>请检查输入字词有无错误。</li>' +
      '<li>请尝试使用其他查询词。</li>' +
      '<li>请尝试使用较短的查询词。</li>' +
      '</ul>' +
      '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var safeName = escapeHtml(item.filename).replace(/'/g, "\\'");
    html += '<div class="result-item" id="doc-' + item.id + '" onclick="openPreview(\'' + item.id + '\', \'' + safeName + '\')">';
    html += '<div class="result-title">' + escapeHtml(item.filename) + '<span class="result-mtime">' + formatTime(item.mtime) + '</span></div>';
    html += '<div class="result-snippet">' + (item.snippet || '该文档未提取到明显对应的文字片段') + '</div>';
    html += '<div class="result-path">' + escapeHtml(item.absolutePath || item.filepath) + '</div>';
    html += '</div>';
  }

  DOM.resultsContainer.innerHTML = html;
}

function renderPagination(total, currentPage) {
  if (total <= LIMIT) return;

  var totalPages = Math.ceil(total / LIMIT);
  var html = '';

  if (currentPage > 1) {
    html += '<span class="page-btn" onclick="performSearch(\'' + currentQuery + '\', ' + (currentPage - 1) + ')">上一页</span>';
  }

  var startPage = Math.max(1, currentPage - 5);
  var endPage = Math.min(totalPages, startPage + 9);

  for (var i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      html += '<span class="page-current">' + i + '</span>';
    } else {
      html += '<span class="page-btn" onclick="performSearch(\'' + currentQuery + '\', ' + i + ')">' + i + '</span>';
    }
  }

  if (currentPage < totalPages) {
    html += '<span class="page-btn" onclick="performSearch(\'' + currentQuery + '\', ' + (currentPage + 1) + ')">下一页</span>';
  }

  DOM.pagination.innerHTML = html;
}

async function openPreview(id, filename) {
  // Update highlighting in list
  if (lastSelectedDocId) {
    var oldItem = document.getElementById('doc-' + lastSelectedDocId);
    if (oldItem) oldItem.classList.remove('active');
  }
  var newItem = document.getElementById('doc-' + id);
  if (newItem) newItem.classList.add('active');
  lastSelectedDocId = id;

  // Show panel and load content
  DOM.previewPanel.classList.remove('hidden');
  DOM.previewTitle.textContent = filename;
  DOM.previewText.innerHTML = '<span style="color:#70757a">正在加载预览内容...</span>';
  DOM.previewDownloadBtn.href = '/api/document/' + id + '/download';

  // Scroll to top of preview body
  DOM.previewPanel.querySelector('.preview-body').scrollTop = 0;

  try {
    var res = await fetch('/api/document/' + id + '/text');
    var data = await res.json();
    if (res.ok) {
      var content = data.content || '该文档无可用纯文本内容或抽取失败（请下载原文件查看）';
      DOM.previewText.innerHTML = highlightText(content, currentQuery);
    } else {
      DOM.previewText.textContent = '加载失败: ' + (data.error || '未知错误');
    }
  } catch (err) {
    DOM.previewText.textContent = '网络错误: ' + err.message;
  }
}

function highlightText(text, query) {
  if (!query || !query.trim()) return escapeHtml(text);

  var keywords = query.trim().split(/\s+/).filter(function (k) { return k.length > 0; });
  if (keywords.length === 0) return escapeHtml(text);

  var safeText = escapeHtml(text);

  var pattern = keywords.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
  var regex = new RegExp('(' + pattern + ')', 'gi');

  safeText = safeText.replace(regex, '<mark class="preview-highlight">$1</mark>');

  return safeText;
}

function closePreview() {
  if (DOM.previewPanel) DOM.previewPanel.classList.add('hidden');
  if (lastSelectedDocId) {
    var item = document.getElementById('doc-' + lastSelectedDocId);
    if (item) item.classList.remove('active');
  }
  lastSelectedDocId = null;
}

async function loadSystemStatus() {
  try {
    var res = await fetch('/api/system/status');
    var data = await res.json();
    if (res.ok) {
      var dirs = Array.isArray(data.docDirectories) ? data.docDirectories.join(', ') : (data.docDirectory || '-');
      DOM.systemFooter.innerHTML =
        '索引文档数: ' + data.documentCount +
        ' | 运行时间: ' + Math.floor(data.uptime / 60) + ' 分钟 | ' +
        '<span style="cursor:help" title="热替换监控路径: ' + dirs + '">文件监听正常</span> | ' + 'Doc Search v' + (data.version || '-');
    }
  } catch (err) {
    console.error('Failed to load system status', err);
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

init();
