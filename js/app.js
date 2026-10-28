/**
 * MAIN CONTROLLER & USER INTERFACE
 * DynamiQR - Dynamic QR Code Studio
 */

(function () {
  'use strict';

  // Application State
  const state = {
    qrCodes: [],
    searchQuery: '',
    selectedCategory: 'all',
    activeModal: null,
    editingQRId: null,
    creatorPreviewQR: null
  };

  // DOM Elements
  const DOM = {
    qrGrid: document.getElementById('qr-grid'),
    emptyState: document.getElementById('empty-state'),
    searchInput: document.getElementById('search-input'),
    categoryFilter: document.getElementById('category-filter'),
    
    // Stats
    statTotalQR: document.getElementById('stat-total-qr'),
    statTotalScans: document.getElementById('stat-total-scans'),
    statTopQR: document.getElementById('stat-top-qr'),
    statStatus: document.getElementById('stat-status'),
    connectionPill: document.getElementById('connection-pill'),
    connectionStatusText: document.getElementById('connection-status-text'),
    connectionDot: document.getElementById('connection-dot'),

    // Modals
    createModal: document.getElementById('create-modal'),
    updateDestModal: document.getElementById('update-dest-modal'),
    configModal: document.getElementById('config-modal'),
    downloadModal: document.getElementById('download-modal'),

    // Forms
    createForm: document.getElementById('create-qr-form'),
    updateDestForm: document.getElementById('update-dest-form'),
    configForm: document.getElementById('supabase-config-form'),

    // Inputs inside Create Form
    inputTitle: document.getElementById('qr-title'),
    inputDestUrl: document.getElementById('qr-destination-url'),
    inputSlug: document.getElementById('qr-slug'),
    inputCategory: document.getElementById('qr-category'),
    inputColorDark: document.getElementById('qr-color-dark'),
    inputColorDarkText: document.getElementById('qr-color-dark-text'),
    inputColorLight: document.getElementById('qr-color-light'),
    inputColorLightText: document.getElementById('qr-color-light-text'),
    inputDotStyle: document.getElementById('qr-dot-style'),
    inputCornerStyle: document.getElementById('qr-corner-style'),
    previewContainer: document.getElementById('creator-qr-preview'),
    previewDynamicLink: document.getElementById('preview-dynamic-link'),
    btnGenerateSlug: document.getElementById('btn-generate-slug'),

    // Inputs inside Update Dest Form
    updateQrId: document.getElementById('update-qr-id'),
    updateQrTitle: document.getElementById('update-qr-title'),
    updateQrOldDest: document.getElementById('update-qr-old-dest'),
    updateQrNewDest: document.getElementById('update-qr-new-dest'),

    // Supabase Config Inputs
    sbUrlInput: document.getElementById('sb-url-input'),
    sbKeyInput: document.getElementById('sb-key-input'),
    btnTestSb: document.getElementById('btn-test-supabase'),
    sbTestResult: document.getElementById('sb-test-result'),
    btnCopySql: document.getElementById('btn-copy-sql'),

    // Toast Container
    toastContainer: document.getElementById('toast-container')
  };

  /* =====================================================
     INITIALIZATION & DATA LOADING
  ===================================================== */

  async function initApp() {
    setupEventListeners();
    updateConnectionIndicator();
    await loadQRCodes();
    initCreatorPreview();
    
    // Lucide Icons initialization
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function updateConnectionIndicator() {
    const isSupabase = window.supabaseService.isSupabaseMode();
    if (isSupabase) {
      DOM.connectionStatusText.textContent = 'Supabase Conectado';
      DOM.connectionDot.className = 'status-dot';
      DOM.statStatus.textContent = 'Supabase Cloud';
    } else {
      DOM.connectionStatusText.textContent = 'Modo Local / Demo';
      DOM.connectionDot.className = 'status-dot local-mode';
      DOM.statStatus.textContent = 'Armazenamento Local';
    }
  }

  async function loadQRCodes() {
    try {
      state.qrCodes = await window.supabaseService.listQRCodes();
      renderStats();
      renderQRGrid();
    } catch (err) {
      showToast('Erro ao carregar QR codes: ' + err.message, 'error');
    }
  }

  function renderStats() {
    const total = state.qrCodes.length;
    const totalScans = state.qrCodes.reduce((acc, curr) => acc + (Number(curr.scans_count) || 0), 0);
    
    let topQR = '-';
    if (total > 0) {
      const sorted = [...state.qrCodes].sort((a, b) => (Number(b.scans_count) || 0) - (Number(a.scans_count) || 0));
      if (sorted[0] && (sorted[0].scans_count > 0)) {
        topQR = `${sorted[0].title} (${sorted[0].scans_count})`;
      } else {
        topQR = sorted[0].title;
      }
    }

    DOM.statTotalQR.textContent = total;
    DOM.statTotalScans.textContent = totalScans.toLocaleString('pt-BR');
    DOM.statTopQR.textContent = topQR;
  }

  /* =====================================================
     QR CODE LIST RENDERING
  ===================================================== */

  function renderQRGrid() {
    const query = state.searchQuery.toLowerCase().trim();
    const cat = state.selectedCategory;

    const filtered = state.qrCodes.filter(qr => {
      const matchesSearch = 
        qr.title.toLowerCase().includes(query) ||
        qr.destination_url.toLowerCase().includes(query) ||
        qr.slug.toLowerCase().includes(query);
      
      const matchesCat = cat === 'all' || qr.category === cat;
      return matchesSearch && matchesCat;
    });

    DOM.qrGrid.innerHTML = '';

    if (filtered.length === 0) {
      DOM.emptyState.style.display = 'block';
      return;
    }

    DOM.emptyState.style.display = 'none';

    filtered.forEach(qr => {
      const card = createQRCardElement(qr);
      DOM.qrGrid.appendChild(card);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function createQRCardElement(qr) {
    const card = document.createElement('div');
    card.className = `qr-card ${qr.status === 'paused' ? 'is-paused' : ''}`;
    card.id = `card-${qr.id}`;

    const redirectUrl = window.qrManager.buildRedirectUrl(qr.slug);
    const isPaused = qr.status === 'paused';
    const statusBadge = isPaused 
      ? '<span style="background: rgba(245,158,11,0.15); color: #fbbf24; font-size: 0.72rem; padding: 2px 8px; border-radius: 99px; font-weight: 600;">Pausado</span>'
      : '<span style="background: rgba(16,185,129,0.15); color: #34d399; font-size: 0.72rem; padding: 2px 8px; border-radius: 99px; font-weight: 600;">Ativo</span>';

    card.innerHTML = `
      <div class="qr-card-header">
        <div class="qr-card-title-group">
          <h3 class="qr-card-title" title="${escapeHtml(qr.title)}">${escapeHtml(qr.title)}</h3>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            <span class="qr-category-badge">${escapeHtml(qr.category || 'Geral')}</span>
            ${statusBadge}
          </div>
        </div>
        <div class="qr-card-actions-top">
          <button class="btn btn-secondary btn-icon btn-sm btn-action-toggle" title="${isPaused ? 'Ativar QR Code' : 'Pausar QR Code'}" data-id="${qr.id}">
            <i data-lucide="${isPaused ? 'play' : 'pause'}"></i>
          </button>
          <button class="btn btn-danger btn-icon btn-sm btn-action-delete" title="Excluir" data-id="${qr.id}">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>

      <div class="qr-card-main">
        <div class="qr-preview-wrapper" id="qr-canvas-box-${qr.id}">
          <!-- QR Canvas injetado via JS -->
        </div>
        <div class="qr-card-links">
          <div class="link-row">
            <span class="link-label">Link Fixo do QR Code:</span>
            <div class="dynamic-short-link" title="Clique para copiar">
              <span>${escapeHtml(redirectUrl)}</span>
              <button class="btn-copy-short" data-url="${escapeHtml(redirectUrl)}" style="background:none; border:none; color:inherit; cursor:pointer;" title="Copiar Link">
                <i data-lucide="copy" style="width: 14px; height: 14px;"></i>
              </button>
            </div>
          </div>

          <div class="link-row" style="margin-top: 6px;">
            <span class="link-label">Destino Atual (Redirecionamento):</span>
            <div class="destination-display">
              <span class="destination-text" title="${escapeHtml(qr.destination_url)}">${escapeHtml(qr.destination_url)}</span>
              <a href="${escapeHtml(qr.destination_url)}" target="_blank" rel="noopener noreferrer" style="color: #6366f1; text-decoration: none;" title="Abrir Link Original">
                <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="qr-card-stats">
        <div class="stat-item">
          <i data-lucide="scan" style="width: 16px; height: 16px; color: var(--emerald);"></i>
          <span>Scans: <strong>${(Number(qr.scans_count) || 0).toLocaleString('pt-BR')}</strong></span>
        </div>
        <div class="stat-item" style="font-size: 0.76rem; color: var(--text-muted);">
          <i data-lucide="clock" style="width: 14px; height: 14px;"></i>
          <span>${formatLastScan(qr.last_scanned_at)}</span>
        </div>
      </div>

      <div class="qr-card-footer">
        <button class="btn btn-update-dest btn-action-update-dest" data-id="${qr.id}" data-title="${escapeHtml(qr.title)}" data-url="${escapeHtml(qr.destination_url)}">
          <i data-lucide="refresh-cw" style="width: 15px; height: 15px;"></i>
          Alterar Destino
        </button>
        <button class="btn btn-secondary btn-sm btn-action-download" data-id="${qr.id}" data-title="${escapeHtml(qr.title)}" data-slug="${qr.slug}" title="Baixar Imagem do QR Code">
          <i data-lucide="download" style="width: 15px; height: 15px;"></i>
          Baixar
        </button>
        <a href="${escapeHtml(redirectUrl)}" target="_blank" class="btn btn-secondary btn-icon btn-sm" title="Testar Redirecionamento">
          <i data-lucide="arrow-up-right" style="width: 15px; height: 15px;"></i>
        </a>
      </div>
    `;

    // Renderiza a imagem do QR Code
    setTimeout(() => {
      const container = card.querySelector(`#qr-canvas-box-${qr.id}`);
      if (container) {
        const instance = window.qrManager.renderQRCode(container, {
          slug: qr.slug,
          size: 100,
          foregroundColor: qr.foreground_color || '#000000',
          backgroundColor: qr.background_color || '#ffffff',
          dotStyle: qr.dot_style || 'square',
          cornerStyle: qr.corner_style || 'square',
          logoUrl: qr.logo_url
        });
        window.qrManager.activeInstances.set(qr.id, instance);
      }
    }, 10);

    return card;
  }

  function formatLastScan(dateString) {
    if (!dateString) return 'Nunca escaneado';
    try {
      const d = new Date(dateString);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'Escaneado agora';
      if (diffMin < 60) return `Último há ${diffMin}m`;
      if (diffHours < 24) return `Último há ${diffHours}h`;
      return `Último há ${diffDays}d`;
    } catch (e) {
      return 'Data inválida';
    }
  }

  /* =====================================================
     CREATOR STUDIO & LIVE PREVIEW
  ===================================================== */

  function initCreatorPreview() {
    updatePreviewQR();
  }

  function updatePreviewQR() {
    const slug = DOM.inputSlug.value.trim() || 'demo';
    const fg = DOM.inputColorDark.value || '#000000';
    const bg = DOM.inputColorLight.value || '#ffffff';
    const dotStyle = DOM.inputDotStyle.value || 'square';
    const cornerStyle = DOM.inputCornerStyle.value || 'square';

    DOM.previewDynamicLink.textContent = window.qrManager.buildRedirectUrl(slug);

    state.creatorPreviewQR = window.qrManager.renderQRCode(DOM.previewContainer, {
      slug: slug,
      size: 180,
      foregroundColor: fg,
      backgroundColor: bg,
      dotStyle: dotStyle,
      cornerStyle: cornerStyle
    });
  }

  /* =====================================================
     EVENT LISTENERS & ACTIONS
  ===================================================== */

  function setupEventListeners() {
    // Search & Filter
    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderQRGrid();
    });

    DOM.categoryFilter.addEventListener('change', (e) => {
      state.selectedCategory = e.target.value;
      renderQRGrid();
    });

    // Open Create Modal
    document.getElementById('btn-open-create').addEventListener('click', () => {
      resetCreateForm();
      openModal(DOM.createModal);
      updatePreviewQR();
    });

    // Open Config Modal
    DOM.connectionPill.addEventListener('click', () => {
      loadConfigIntoModal();
      openModal(DOM.configModal);
    });

    document.getElementById('btn-open-config').addEventListener('click', () => {
      loadConfigIntoModal();
      openModal(DOM.configModal);
    });

    // Close Modals
    document.querySelectorAll('.modal-close, .btn-modal-cancel').forEach(btn => {
      btn.addEventListener('click', () => closeModal());
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    });

    // Generate Random Slug Button
    DOM.btnGenerateSlug.addEventListener('click', () => {
      DOM.inputSlug.value = window.supabaseService.generateSlug(7);
      updatePreviewQR();
    });

    // Live Color Pickers Sync
    DOM.inputColorDark.addEventListener('input', (e) => {
      DOM.inputColorDarkText.value = e.target.value;
      updatePreviewQR();
    });
    DOM.inputColorDarkText.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        DOM.inputColorDark.value = e.target.value;
        updatePreviewQR();
      }
    });

    DOM.inputColorLight.addEventListener('input', (e) => {
      DOM.inputColorLightText.value = e.target.value;
      updatePreviewQR();
    });
    DOM.inputColorLightText.addEventListener('input', (e) => {
      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
        DOM.inputColorLight.value = e.target.value;
        updatePreviewQR();
      }
    });

    // Live QR Style changes
    DOM.inputDotStyle.addEventListener('change', updatePreviewQR);
    DOM.inputCornerStyle.addEventListener('change', updatePreviewQR);
    DOM.inputSlug.addEventListener('input', () => {
      // sanitize slug: lowercase and hyphen/alphanumeric only
      DOM.inputSlug.value = DOM.inputSlug.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      updatePreviewQR();
    });

    // Submit Create Form
    DOM.createForm.addEventListener('submit', handleCreateSubmit);

    // Submit Update Destination Form
    DOM.updateDestForm.addEventListener('submit', handleUpdateDestinationSubmit);

    // Grid Delegated Click Events (Update Dest, Toggle, Delete, Download, Copy)
    DOM.qrGrid.addEventListener('click', handleGridActions);

    // Supabase Config Actions
    DOM.configForm.addEventListener('submit', handleConfigSave);
    DOM.btnTestSb.addEventListener('click', handleConfigTest);
    DOM.btnCopySql.addEventListener('click', handleCopySql);
  }

  function resetCreateForm() {
    DOM.createForm.reset();
    DOM.inputSlug.value = window.supabaseService.generateSlug(6);
    DOM.inputColorDark.value = '#000000';
    DOM.inputColorDarkText.value = '#000000';
    DOM.inputColorLight.value = '#ffffff';
    DOM.inputColorLightText.value = '#ffffff';
    DOM.inputDotStyle.value = 'rounded';
    DOM.inputCornerStyle.value = 'extra-rounded';
  }

  /* =====================================================
     ACTIONS HANDLERS
  ===================================================== */

  async function handleCreateSubmit(e) {
    e.preventDefault();
    const title = DOM.inputTitle.value.trim();
    let dest = DOM.inputDestUrl.value.trim();
    const slug = DOM.inputSlug.value.trim();
    const category = DOM.inputCategory.value;

    if (!title) {
      showToast('Por favor, informe o título do QR Code.', 'error');
      return;
    }

    if (!dest) {
      showToast('Por favor, informe a URL de destino.', 'error');
      return;
    }

    if (!dest.startsWith('http://') && !dest.startsWith('https://')) {
      dest = 'https://' + dest;
    }

    const payload = {
      title,
      destination_url: dest,
      slug: slug || window.supabaseService.generateSlug(6),
      category: category || 'Geral',
      foreground_color: DOM.inputColorDark.value || '#000000',
      background_color: DOM.inputColorLight.value || '#ffffff',
      dot_style: DOM.inputDotStyle.value || 'square',
      corner_style: DOM.inputCornerStyle.value || 'square'
    };

    const submitBtn = DOM.createForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando...';

    try {
      await window.supabaseService.createQRCode(payload);
      showToast('QR Code dinâmico criado com sucesso!', 'success');
      closeModal();
      await loadQRCodes();
    } catch (err) {
      showToast('Erro ao criar QR Code: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar QR Code Dinâmico';
    }
  }

  async function handleUpdateDestinationSubmit(e) {
    e.preventDefault();
    const id = DOM.updateQrId.value;
    let newUrl = DOM.updateQrNewDest.value.trim();

    if (!newUrl) {
      showToast('A nova URL não pode estar vazia.', 'error');
      return;
    }

    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      newUrl = 'https://' + newUrl;
    }

    const submitBtn = DOM.updateDestForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Atualizando...';

    try {
      await window.supabaseService.updateDestinationUrl(id, newUrl);
      showToast('Link de destino atualizado com sucesso! A imagem do QR Code permanece intacta.', 'success');
      closeModal();
      await loadQRCodes();
    } catch (err) {
      showToast('Falha ao atualizar destino: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Salvar Novo Destino';
    }
  }

  async function handleGridActions(e) {
    // 1. Atualizar Destino
    const updateBtn = e.target.closest('.btn-action-update-dest');
    if (updateBtn) {
      const id = updateBtn.getAttribute('data-id');
      const title = updateBtn.getAttribute('data-title');
      const url = updateBtn.getAttribute('data-url');

      DOM.updateQrId.value = id;
      DOM.updateQrTitle.textContent = title;
      DOM.updateQrOldDest.textContent = url;
      DOM.updateQrNewDest.value = url;
      openModal(DOM.updateDestModal);
      return;
    }

    // 2. Download
    const downloadBtn = e.target.closest('.btn-action-download');
    if (downloadBtn) {
      const id = downloadBtn.getAttribute('data-id');
      const title = downloadBtn.getAttribute('data-title');
      const slug = downloadBtn.getAttribute('data-slug');
      downloadQRCodeImage(id, title, slug);
      return;
    }

    // 3. Copiar Link Dinâmico
    const copyBtn = e.target.closest('.btn-copy-short');
    if (copyBtn) {
      const url = copyBtn.getAttribute('data-url');
      navigator.clipboard.writeText(url).then(() => {
        showToast('Link fixo copiado para a área de transferência!', 'success');
      }).catch(() => {
        showToast('Não foi possível copiar o link.', 'error');
      });
      return;
    }

    // 4. Toggle Pausar/Ativar
    const toggleBtn = e.target.closest('.btn-action-toggle');
    if (toggleBtn) {
      const id = toggleBtn.getAttribute('data-id');
      try {
        const updated = await window.supabaseService.toggleStatus(id);
        const statusTxt = updated.status === 'active' ? 'ativado' : 'pausado';
        showToast(`QR Code ${statusTxt} com sucesso!`, 'info');
        await loadQRCodes();
      } catch (err) {
        showToast('Erro ao alternar status: ' + err.message, 'error');
      }
      return;
    }

    // 5. Excluir
    const deleteBtn = e.target.closest('.btn-action-delete');
    if (deleteBtn) {
      const id = deleteBtn.getAttribute('data-id');
      if (confirm('Tem certeza de que deseja excluir este QR Code? Quem escanear receberá erro 404.')) {
        try {
          await window.supabaseService.deleteQRCode(id);
          showToast('QR Code excluído com sucesso.', 'info');
          await loadQRCodes();
        } catch (err) {
          showToast('Erro ao excluir: ' + err.message, 'error');
        }
      }
      return;
    }
  }

  function downloadQRCodeImage(id, title, slug) {
    const instance = window.qrManager.activeInstances.get(id);
    const cleanName = (title || slug || 'qrcode').toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    if (instance) {
      window.qrManager.download(instance, cleanName, 'png');
      showToast('Download do QR Code iniciado (PNG HD)!', 'success');
    } else {
      // Fallback: renderizar na hora para download
      const tempDiv = document.createElement('div');
      const qrData = state.qrCodes.find(q => q.id === id);
      if (qrData) {
        const tempInstance = window.qrManager.renderQRCode(tempDiv, {
          slug: qrData.slug,
          size: 512,
          foregroundColor: qrData.foreground_color || '#000000',
          backgroundColor: qrData.background_color || '#ffffff',
          dotStyle: qrData.dot_style || 'square',
          cornerStyle: qrData.corner_style || 'square'
        });
        window.qrManager.download(tempInstance, cleanName, 'png');
        showToast('Download do QR Code iniciado!', 'success');
      }
    }
  }

  /* =====================================================
     SUPABASE CONFIGURATION MODAL
  ===================================================== */

  function loadConfigIntoModal() {
    const cfg = window.supabaseService.loadConfig();
    DOM.sbUrlInput.value = cfg.url || '';
    DOM.sbKeyInput.value = cfg.anonKey || '';
    const customBaseEl = document.getElementById('custom-base-url-input');
    if (customBaseEl) {
      customBaseEl.value = localStorage.getItem('dynq_custom_base_url') || '';
    }
    DOM.sbTestResult.style.display = 'none';
  }

  async function handleConfigSave(e) {
    e.preventDefault();
    const url = DOM.sbUrlInput.value.trim();
    const key = DOM.sbKeyInput.value.trim();
    const customBaseEl = document.getElementById('custom-base-url-input');
    if (customBaseEl) {
      const customBase = customBaseEl.value.trim();
      localStorage.setItem('dynq_custom_base_url', customBase);
    }

    window.supabaseService.saveConfig(url, key);
    updateConnectionIndicator();

    showToast('Configurações salvas! Atualizando dados...', 'success');
    closeModal();
    await loadQRCodes();
  }

  async function handleConfigTest() {
    const url = DOM.sbUrlInput.value.trim();
    const key = DOM.sbKeyInput.value.trim();

    if (!url || !key) {
      showTestResult(false, 'Preencha a URL e a Anon Key antes de testar.');
      return;
    }

    DOM.btnTestSb.disabled = true;
    DOM.btnTestSb.textContent = 'Testando...';

    // Salva temporariamente para teste
    window.supabaseService.saveConfig(url, key);
    const res = await window.supabaseService.testConnection();

    DOM.btnTestSb.disabled = false;
    DOM.btnTestSb.textContent = 'Testar Conexão';

    showTestResult(res.success, res.message);
  }

  function showTestResult(success, message) {
    DOM.sbTestResult.style.display = 'block';
    DOM.sbTestResult.style.padding = '10px 14px';
    DOM.sbTestResult.style.borderRadius = '8px';
    DOM.sbTestResult.style.fontSize = '0.84rem';
    DOM.sbTestResult.style.marginTop = '12px';

    if (success) {
      DOM.sbTestResult.style.background = 'rgba(16, 185, 129, 0.15)';
      DOM.sbTestResult.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      DOM.sbTestResult.style.color = '#34d399';
    } else {
      DOM.sbTestResult.style.background = 'rgba(244, 63, 94, 0.15)';
      DOM.sbTestResult.style.border = '1px solid rgba(244, 63, 94, 0.3)';
      DOM.sbTestResult.style.color = '#fb7185';
    }
    DOM.sbTestResult.textContent = message;
  }

  async function handleCopySql() {
    try {
      const resp = await fetch('schema.sql');
      const sql = await resp.text();
      await navigator.clipboard.writeText(sql);
      showToast('Script SQL copiado com sucesso! Cole no SQL Editor do Supabase.', 'success');
    } catch (e) {
      showToast('Não foi possível carregar o arquivo schema.sql.', 'error');
    }
  }

  /* =====================================================
     MODAL CONTROLS & UTILITIES
  ===================================================== */

  function openModal(modalEl) {
    if (!modalEl) return;
    closeModal();
    modalEl.classList.add('active');
    state.activeModal = modalEl;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (state.activeModal) {
      state.activeModal.classList.remove('active');
      state.activeModal = null;
    }
    document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
    document.body.style.overflow = '';
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
      <span>${escapeHtml(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);
    if (window.lucide) {
      window.lucide.createIcons();
    }

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // DOMContentLoaded trigger
  document.addEventListener('DOMContentLoaded', initApp);

})();
