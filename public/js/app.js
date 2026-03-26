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

// 静态模式判定：从 URL 或之前存储的状态预判 (防止由于接口报错导致的模式误判)
const URL_PARAMS = new URLSearchParams(window.location.search);
window.isRemoteMode = URL_PARAMS.has('remote') || window.location.port == '3005'; 

let currentQuery = '';
let currentPage = 1;
let currentPeriod = 'all';
let currentSort = 'desc';
const LIMIT = 10;
let lastSelectedDocId = null;

// 系统状态存储
window.systemStatus = {
  isRemoteMode: false,
  isAvailable: false,
  pollInterval: 30
};

function init() {
  bindEvents();
  checkUrlParams();
  startStatusPolling();
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

  // Time filter links
  DOM.timeFilter.addEventListener('click', function (e) {
    var link = e.target.closest('.filter-link');
    if (!link) return;
    var period = link.getAttribute('data-period');
    if (period === currentPeriod) return;
    currentPeriod = period;
    updateFilterButtons();
    performSearch(currentQuery, 1);
  });

  // Sort filter links
  DOM.sortFilter.addEventListener('click', function (e) {
    var link = e.target.closest('.filter-link');
    if (!link) return;
    var sort = link.getAttribute('data-sort');
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
  // Period links
  var pLinks = DOM.timeFilter.querySelectorAll('.filter-link');
  for (var i = 0; i < pLinks.length; i++) {
    if (pLinks[i].getAttribute('data-period') === currentPeriod) {
      pLinks[i].classList.add('active');
    } else {
      pLinks[i].classList.remove('active');
    }
  }

  // Sort links
  var sLinks = DOM.sortFilter.querySelectorAll('.filter-link');
  for (var j = 0; j < sLinks.length; j++) {
    if (sLinks[j].getAttribute('data-sort') === currentSort) {
      sLinks[j].classList.add('active');
    } else {
      sLinks[j].classList.remove('active');
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

async function loadSystemStatus() {
  try {
    var res = await fetch('/api/system/status');
    var data = await res.json();
    
    // 如果接口返回非 200 (例如 500)，视为不可用，进入 catch
    if (!res.ok) {
      throw new Error(data.error || 'Server error');
    }

    window.systemStatus.isAvailable = true;
    window.systemStatus.isRemoteMode = data.isRemoteMode;
    window.systemStatus.pollInterval = data.statusPollInterval || 30;
    window.isRemoteMode = data.isRemoteMode; 

    var modeStr = data.isRemoteMode ? '<span style="color:#d93025; font-weight:bold;">[远程模式]</span> ' : '';
    var lastIndexStr = data.lastIndexTime ? '索引时间: ' + formatTime(data.lastIndexTime) : '获取索引时间失败';
    DOM.systemFooter.innerHTML =
      modeStr + '索引文档: ' + data.documentCount + ' | ' + lastIndexStr +
      ' | 运行时间: ' + Math.floor(data.uptime / 60) + ' 分钟 | ' + ' v' + (data.version || '-');
    
    return true;
  } catch (err) {
    window.systemStatus.isAvailable = false;
    console.error('Failed to load system status', err);
    
    // 使用全局预定义的模式标识
    var modeStr = window.isRemoteMode ? '<span style="color:#d93025; font-weight:bold;">[远程模式] ⚠️ </span>' : '<span style="color:#70757a;">[本地模式] ⚠️ </span>';
    
    DOM.systemFooter.innerHTML = 
      modeStr + '<span style="color:#d93025; font-weight:bold;">服务暂时不可用 (数据请求失败)</span> | ' +
      '<span style="font-size:11px; color:#d93025;">尝试自动重连中...</span>';
    
    return false;
  } finally {
    // 这种失败后，如果连续 3 次失败，临时增加轮询间隔以保护终端资源
    if (!window.systemStatus.isAvailable) {
      window.systemStatus.failureCount = (window.systemStatus.failureCount || 0) + 1;
      if (window.systemStatus.failureCount >= 3) {
        console.warn('Persistent link failure. Slowing down polling...');
      }
    } else {
      window.systemStatus.failureCount = 0;
    }
  }
}

async function startStatusPolling() {
  // 首次加载，获取配置的轮询间隔
  await loadSystemStatus();
  var interval = (window.systemStatus.pollInterval || 30) * 1000;
  setInterval(loadSystemStatus, interval);
}

async function fetchResults(query, page) {
  // 1. 发起即时拨测，不等待轮询间隔，确保状态最新
  var isAvailable = await loadSystemStatus(); 
  
  // 2. 状态校验拦截
  if (!isAvailable) {
    DOM.resultStats.textContent = '';
    DOM.pagination.innerHTML = '';
    DOM.resultsContainer.innerHTML = 
      '<div class="error-box">' +
      '<div class="error-icon">🔌</div>' +
      '<div class="error-msg"><b>搜索服务离线 (即时探测)</b></div>' +
      '<div class="error-detail">提示：发起查询前探测到 RSE 后端不可达。<br>请检查串口桥状态或 A 网实例(3004)是否异常。</div>' +
      '</div>';
    return;
  }

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
    
    if (!res.ok) {
      throw new Error(data.error || 'Server Internal Error');
    }
    
    var time = ((performance.now() - start) / 1000).toFixed(3);

    DOM.resultStats.textContent = '找到约 ' + data.total + ' 条结果 （用时 ' + time + ' 秒）';
    renderResults(data.data);
    renderPagination(data.total, page);
  } catch (err) {
    DOM.resultStats.textContent = '';
    DOM.pagination.innerHTML = '';
    DOM.resultsContainer.innerHTML = 
      '<div class="error-box">' +
      '<div class="error-icon">⚠️</div>' +
      '<div class="error-msg"><b>搜索服务暂时不可用</b></div>' +
      '<div class="error-detail">' + (window.isRemoteMode ? '提示：无法连接到远程 RSE 数据中心，请检查网络或串口桥状态。' : '提示：本地数据库查询出错。') + '<br>(' + err.message + ')</div>' +
      '</div>';
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
  if (lastSelectedDocId) {
    var oldItem = document.getElementById('doc-' + lastSelectedDocId);
    if (oldItem) oldItem.classList.remove('active');
  }
  var newItem = document.getElementById('doc-' + id);
  if (newItem) newItem.classList.add('active');
  lastSelectedDocId = id;

  DOM.previewPanel.classList.remove('hidden');
  DOM.previewTitle.textContent = filename;
  DOM.previewText.innerHTML = '<span style="color:#70757a">正在加载预览内容...</span>';
  
  DOM.previewDownloadBtn.textContent = '下载原文件';

  if (window.isRemoteMode) {
    DOM.previewDownloadBtn.removeAttribute('href');
    DOM.previewDownloadBtn.classList.add('disabled');
    DOM.previewDownloadBtn.title = '远程模式下禁用原文件下载';
  } else {
    DOM.previewDownloadBtn.href = '/api/document/' + id + '/download';
    DOM.previewDownloadBtn.classList.remove('disabled');
    DOM.previewDownloadBtn.title = '';
  }

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
  return safeText.replace(regex, '<mark class="preview-highlight">$1</mark>');
}

function closePreview() {
  if (DOM.previewPanel) DOM.previewPanel.classList.add('hidden');
  if (lastSelectedDocId) {
    var item = document.getElementById('doc-' + lastSelectedDocId);
    if (item) item.classList.remove('active');
  }
  lastSelectedDocId = null;
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
