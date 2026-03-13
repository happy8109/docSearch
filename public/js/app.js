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
}

function showHome() {
  DOM.homeView.classList.remove('hidden');
  DOM.resultsView.classList.add('hidden');
  DOM.searchInputHome.value = '';
  document.title = '局域网文档搜索';
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
  fetchResults(query, page);
}

async function fetchResults(query, page) {
  showResults();
  document.title = `${query} - 文档搜索`;
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
  DOM.modalText.textContent = '正在加载大文件纯文本抽取版，请稍候...';
  DOM.modalDownloadBtn.href = `/api/document/${id}/download`;

  try {
    const res = await fetch(`/api/document/${id}/text`);
    const data = await res.json();
    if (res.ok) {
      DOM.modalText.textContent = data.content || '该文档无可用纯文本内容或抽取失败（请下载原文件查看）';
    } else {
      DOM.modalText.textContent = '加载失败: ' + (data.error || '未知错误');
    }
  } catch (err) {
    DOM.modalText.textContent = '网络错误: ' + err.message;
  }
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
      DOM.systemFooter.innerHTML = `
        系统守护进程状态: 运行中 | 当前索引文档数: ${data.documentCount} | 运行时间: ${Math.floor(data.uptime / 60)} 分钟 | 
        <span style="cursor:help" title="热替换监控路径: ${data.docDirectory}">后台文件监听系统正常 (热替换生效)</span> | SQLite FTS5 核心驱动
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
