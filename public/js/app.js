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
  
  modal: document.getElementById('doc-modal'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalClose: document.getElementById('modal-close'),
  modalTitle: document.getElementById('modal-title'),
  modalText: document.getElementById('modal-text'),
  modalDownloadBtn: document.getElementById('modal-download-btn'),
  
  clearBtnHome: document.getElementById('clear-btn-home'),
  clearBtnTop: document.getElementById('clear-btn-top'),
  
  systemFooter: document.getElementById('system-footer')
};

let currentQuery = '';
let currentPage = 1;
const LIMIT = 10;

function init() {
  bindEvents();
  checkUrlParams();
  loadSystemStatus();
}

function bindEvents() {
  DOM.searchFormHome.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch(DOM.searchInputHome.value, 1);
  });
  
  DOM.btnSearchHome.addEventListener('click', () => {
    performSearch(DOM.searchInputHome.value, 1);
  });

  DOM.searchFormTop.addEventListener('submit', (e) => {
    e.preventDefault();
    performSearch(DOM.searchInputTop.value, 1);
  });

  DOM.logoSmall.addEventListener('click', () => {
    window.history.pushState({}, '', '/');
    showHome();
  });

  window.addEventListener('popstate', checkUrlParams);

  DOM.modalClose.addEventListener('click', closeModal);
  DOM.modalOverlay.addEventListener('click', closeModal);

  // Clear buttons
  DOM.clearBtnHome.addEventListener('click', () => {
    DOM.searchInputHome.value = '';
    DOM.clearBtnHome.classList.add('hidden');
    DOM.searchInputHome.focus();
  });
  DOM.clearBtnTop.addEventListener('click', () => {
    DOM.searchInputTop.value = '';
    DOM.clearBtnTop.classList.add('hidden');
    DOM.searchInputTop.focus();
  });

  // Toggle clear button visibility on input
  DOM.searchInputHome.addEventListener('input', () => {
    DOM.clearBtnHome.classList.toggle('hidden', !DOM.searchInputHome.value);
  });
  DOM.searchInputTop.addEventListener('input', () => {
    DOM.clearBtnTop.classList.toggle('hidden', !DOM.searchInputTop.value);
  });
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
  const urlParams = new URLSearchParams(window.location.search);
  const q = urlParams.get('q');
  const page = parseInt(urlParams.get('page')) || 1;
  
  if (q) {
    DOM.searchInputTop.value = q;
    currentQuery = q;
    currentPage = page;
    fetchResults(q, page);
  } else {
    showHome();
  }
}

function performSearch(query, page) {
  if (!query.trim()) return;
  const url = `/?q=${encodeURIComponent(query)}&page=${page}`;
  window.history.pushState({ query, page }, '', url);
  currentQuery = query;
  currentPage = page;
  DOM.searchInputTop.value = query;
  DOM.clearBtnTop.classList.toggle('hidden', !query);
  fetchResults(query, page);
}

async function fetchResults(query, page) {
  showResults();
  document.title = `${query} - 文档搜索引擎`;
  DOM.resultsContainer.innerHTML = '<p style="color:#70757a; font-size:14px;">正在全库高速检索，请稍候...</p>';
  DOM.resultStats.textContent = '';
  DOM.pagination.innerHTML = '';

  try {
    const start = performance.now();
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${page}&limit=${LIMIT}`);
    const data = await res.json();
    const time = ((performance.now() - start) / 1000).toFixed(3);
    
    // 渲染耗时通常只有几毫秒
    DOM.resultStats.textContent = `找到约 ${data.total} 条结果 （用时 ${time} 秒）`;
    renderResults(data.data);
    renderPagination(data.total, page);
  } catch (err) {
    DOM.resultsContainer.innerHTML = `<p style="color:#d93025">请求失败: 与搜索服务器失去连接 (${err.message})</p>`;
  }
}

function renderResults(items) {
  if (!items || items.length === 0) {
    DOM.resultsContainer.innerHTML = `
      <div style="margin-top:30px">
        <p>找不到和您查询的 "<b>${escapeHtml(currentQuery)}</b>" 相符的文档。</p>
        <p style="margin-top:20px">建议：</p>
        <ul style="margin-top:5px; padding-left:20px; color:#3c4043; line-height: 1.6">
          <li>请检查输入字词有无错误。</li>
          <li>请尝试使用其他查询词。</li>
          <li>请尝试使用较短的查询词。</li>
        </ul>
      </div>`;
    return;
  }

  const html = items.map(item => `
    <div class="result-item">
      <div class="result-path">${escapeHtml(item.filepath)} &nbsp;&bull;&nbsp; 录入时间: ${new Date(item.mtime).toLocaleString()}</div>
      <div class="result-title" onclick="openDocumentModal('${item.id}', '${escapeHtml(item.filename).replace(/'/g, "\\'")}')">
        <h3>${escapeHtml(item.filename)}</h3>
      </div>
      <div class="result-snippet">${item.snippet || '该文档未提取到明显对应的文字片段'}</div>
    </div>
  `).join('');
  
  DOM.resultsContainer.innerHTML = html;
}

function renderPagination(total, currentPage) {
  if (total <= LIMIT) return;
  
  const totalPages = Math.ceil(total / LIMIT);
  let html = '';
  
  if (currentPage > 1) {
    html += `<span class="page-btn" onclick="performSearch('${currentQuery}', ${currentPage - 1})">上一页</span>`;
  }
  
  let startPage = Math.max(1, currentPage - 5);
  let endPage = Math.min(totalPages, startPage + 9);
  
  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      html += `<span class="page-current">${i}</span>`;
    } else {
      html += `<span class="page-btn" onclick="performSearch('${currentQuery}', ${i})">${i}</span>`;
    }
  }
  
  if (currentPage < totalPages) {
    html += `<span class="page-btn" onclick="performSearch('${currentQuery}', ${currentPage + 1})">下一页</span>`;
  }
  
  DOM.pagination.innerHTML = html;
}

async function openDocumentModal(id, filename) {
  DOM.modal.classList.remove('hidden');
  DOM.modalTitle.textContent = filename;
  DOM.modalText.innerHTML = '<span style="color:#70757a">正在加载大文件纯文本抽取版，请稍候...</span>';
  DOM.modalDownloadBtn.href = `/api/document/${id}/download`;

  try {
    const res = await fetch(`/api/document/${id}/text`);
    const data = await res.json();
    if (res.ok) {
      const content = data.content || '该文档无可用纯文本内容或抽取失败（请下载原文件查看）';
      DOM.modalText.innerHTML = highlightText(content, currentQuery);
    } else {
      DOM.modalText.textContent = '加载失败: ' + (data.error || '未知错误');
    }
  } catch (err) {
    DOM.modalText.textContent = '网络错误: ' + err.message;
  }
}

function highlightText(text, query) {
  if (!query || !query.trim()) return escapeHtml(text);
  
  // Split query into individual keywords (by spaces)
  const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);
  if (keywords.length === 0) return escapeHtml(text);
  
  // Escape HTML first to prevent XSS
  let safeText = escapeHtml(text);
  
  // Build a combined regex for all keywords (case insensitive)
  const pattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  
  // Wrap matches in highlight <mark> tags
  safeText = safeText.replace(regex, '<mark class="preview-highlight">$1</mark>');
  
  return safeText;
}

function closeModal() {
  DOM.modal.classList.add('hidden');
  DOM.modalText.textContent = '';
}

async function loadSystemStatus() {
  try {
    const res = await fetch('/api/system/status');
    const data = await res.json();
    if (res.ok) {
      const dirs = Array.isArray(data.docDirectories) ? data.docDirectories.join(', ') : (data.docDirectory || '-');
      DOM.systemFooter.innerHTML = `
        Doc Search v${data.version || '-'} | 索引文档数: ${data.documentCount} | 运行时间: ${Math.floor(data.uptime / 60)} 分钟 | 
        <span style="cursor:help" title="热替换监控路径: ${dirs}">文件监听正常</span> | SQLite FTS5
      `;
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
