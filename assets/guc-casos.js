(function($){
  $(function(){

    /* =========================
     *  Referencias base (UI)
     * ========================= */
    const $root  = $('#gcas-casos-app');
    if (!$root.length) return;

    let $modal = $('#gcas-casos-app-modal');               // modal crear/editar/ver
    const $open  = $root.find('#gcas-casos-open-modal');
    const $form  = $('#gcas-casos-form-caso');
    const $save  = $('#gcas-casos-save');
    const $user  = $('#gcas-casos-user-select');
    const $tbody = $root.find('#gcas-casos-table');
    const $searchForm   = $root.find('#gcas-casos-search-form');
    const $searchInput  = $root.find('#gcas-casos-search-expediente');
    const $filterToggle = $root.find('#gcas-casos-filter-toggle');
    const $filterMenu   = $root.find('#gcas-casos-filter-menu');
    const $filterWrapper= $root.find('[data-filter-wrapper]');

    let currentSearch = '';
    let currentFilter = '';
    let filterMenuOpen = false;

    function updateSearchUI(){
      if ($searchInput.length) {
        $searchInput.val(currentSearch);
      }
    }

    function updateFilterUI(){
      if ($filterToggle.length) {
        var label = 'Todos';
        if (currentFilter === 'TAR') label = 'TAR';
        else if (currentFilter === 'JPRD') label = 'JPRD';
        $filterToggle.attr('data-filter-value', currentFilter || '');
        var $label = $filterToggle.find('.gcas-filter-text');
        if ($label.length) { $label.text(label); }
      }
      if ($filterWrapper.length) {
        $filterWrapper.attr('data-filter-active', currentFilter ? '1' : '0');
      }
      if ($filterMenu.length) {
        $filterMenu.find('button[data-filter]').each(function(){
          var val = $(this).attr('data-filter') || '';
          var isActive = (val === currentFilter);
          $(this).toggleClass('is-active', isActive);
          $(this).attr('aria-checked', isActive ? 'true' : 'false');
        });
      }
    }

    function handleFilterDocClick(e){
      if (!$filterMenu.length) return;
      var $target = $(e.target);
      if ($target.closest('#gcas-casos-app [data-filter-wrapper]').length) return;
      closeFilterMenu();
    }

    function handleFilterFocus(e){
      if (!filterMenuOpen) return;
      var $target = $(e.target);
      if ($target.closest('#gcas-casos-app [data-filter-wrapper]').length) return;
      closeFilterMenu();
    }

    function handleFilterKeydown(e){
      var key = e.key || e.keyCode;
      if (key === 'Escape' || key === 'Esc' || key === 27) {
        closeFilterMenu();
      }
    }

    function openFilterMenu(){
      if (!$filterMenu.length || !$filterToggle.length) return;
      if (filterMenuOpen) return;
      filterMenuOpen = true;
      $filterToggle.attr('aria-expanded','true');
      if ($filterWrapper.length) $filterWrapper.addClass('is-open');
      $filterMenu.removeAttr('hidden');
      setTimeout(function(){
        $(document)
          .on('click.gcasFilter', handleFilterDocClick)
          .on('focusin.gcasFilter', handleFilterFocus)
          .on('keydown.gcasFilter', handleFilterKeydown);
      }, 0);
      setTimeout(function(){
        if (!$filterMenu.length) return;
        var $focusTarget = $filterMenu.find('button.is-active').first();
        if (!$focusTarget.length) {
          $focusTarget = $filterMenu.find('button').first();
        }
        if ($focusTarget.length) {
          $focusTarget.trigger('focus');
        }
      }, 30);
    }

    function closeFilterMenu(force){
      if (!$filterMenu.length || !$filterToggle.length) return;
      var wasOpen = filterMenuOpen;
      filterMenuOpen = false;
      $filterToggle.attr('aria-expanded','false');
      if ($filterWrapper.length) $filterWrapper.removeClass('is-open');
      $filterMenu.attr('hidden','hidden');
      $(document).off('.gcasFilter');
      if (force === true || !wasOpen) return;
      if ($filterToggle.length) {
        $filterToggle.trigger('blur');
      }
    }

    function applySearch(raw){
      var next = raw ? String(raw).trim() : '';
      if (next === currentSearch) {
        return;
      }
      currentSearch = next;
      updateSearchUI();
      loadTable();
    }

    function applyFilter(value){
      var next = (value === 'TAR' || value === 'JPRD') ? value : '';
      if (next === currentFilter) {
        closeFilterMenu();
        return;
      }
      currentFilter = next;
      updateFilterUI();
      closeFilterMenu();
      loadTable();
    }

    if ($searchForm.length) {
      $searchForm.on('submit', function(e){
        e.preventDefault();
        applySearch($searchInput.length ? $searchInput.val() : '');
      });
    }

    if ($searchInput.length) {
      $searchInput.on('keydown', function(e){
        if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
          if (currentSearch) {
            e.preventDefault();
            applySearch('');
          } else {
            $(this).blur();
          }
        }
      });
      $searchInput.on('input', function(){
        var val = $(this).val();
        if (!val || !String(val).trim()) {
          if (currentSearch !== '') {
            applySearch('');
          }
        }
      });
    }

    if ($filterToggle.length) {
      $filterToggle.on('click', function(e){
        e.preventDefault();
        if (filterMenuOpen) closeFilterMenu();
        else openFilterMenu();
      });
    }

    if ($filterMenu.length) {
      $filterMenu.on('click', 'button[data-filter]', function(e){
        e.preventDefault();
        var val = $(this).attr('data-filter') || '';
        applyFilter(val);
      });
    }


    // Mover modales a body (evita cortes por overflow)
    if ($modal.length && $modal.parent()[0] !== document.body) {
      $modal = $modal.detach().appendTo('body');
    }
    const $close = $modal.find('.gcas-modal-close, #gcas-casos-cancel');

    // Modal "Inicio / Acción"
    let $startModal = $('#gcas-casos-app-modal-start');
    let $startForm  = $('#gcas-casos-form-inicio');
    const $startSave   = $('#gcas-casos-save-start');
    const $startCancel = $('#gcas-casos-cancel-start');
    const $pdfField    = $('#gcas-casos-action-pdf');
    const $pdfName     = $('#gcas-casos-action-pdf-name');
    const $pdfLink     = $('#gcas-casos-action-pdf-open');
    const $pdfUploadBtn= $('#gcas-casos-action-pdf-upload');
    const $pdfDeleteBtn= $('#gcas-casos-action-pdf-delete');

    if ($startModal.length && $startModal.parent()[0] !== document.body) {
      $startModal = $startModal.detach().appendTo('body');
    }
    $startModal.removeClass('show').attr('aria-hidden','true').hide();

    let startDirty = false;
    const START_TITLES = {
      edit: 'Editar acción',
      default: 'Registrar acción'
    };

    function fileNameFromUrl(url){
      if(!url) return '';
      try {
        const clean = url.split('/').pop().split('#')[0].split('?')[0];
        return decodeURIComponent(clean);
      } catch(e){
        return url;
      }
    }

    function setPdfInfo(url){
      if(!$pdfField.length) return;
      const has = !!url;
      const safeUrl = url || '';
      $pdfField.attr('data-has-pdf', has ? '1' : '0');
      $pdfField.attr('data-current-pdf', safeUrl);
      if ($pdfName.length) {
        $pdfName.text(has ? fileNameFromUrl(safeUrl) : 'Sin archivo adjunto');
      }
      if ($pdfLink.length) {
        if (has) {
          $pdfLink.attr('href', safeUrl).removeAttr('hidden');
        } else {
          $pdfLink.attr('href', '#').attr('hidden', true);
        }
      }
      if ($pdfUploadBtn.length) {
        $pdfUploadBtn.attr('data-has-pdf', has ? '1' : '0');
        $pdfUploadBtn.toggleClass('has-pdf', has);
      }
      if ($pdfDeleteBtn.length) {
        $pdfDeleteBtn.prop('disabled', !has);
      }
    }

    function showPdfField(show){
      if(!$pdfField.length) return;
      $pdfField.toggleClass('gcas-hidden', !show);
      $pdfField.attr('aria-hidden', show ? 'false' : 'true');
      if (!show) {
        setPdfInfo('');
        $startModal.removeAttr('data-edit-section data-edit-case');
      }
    }

    function setStartModalMode(mode){
      const key = (mode === 'edit') ? 'edit' : 'default';
      $startModal.attr('data-mode', key);
      $startModal.find('.gcas-modal-header h3').text(START_TITLES[key]);
      showPdfField(mode === 'edit');
    }

    function resetStartModal(){
      startDirty = false;
      $startModal.removeAttr('data-target-section data-edit-row data-mode data-edit-case data-edit-section');
      if ($startForm[0]) {
        $startForm[0].reset();
      }
      setPdfInfo('');
      showPdfField(false);
    }

    $startForm.on('input change', 'input, textarea', function(){ startDirty = true; });

    if ($pdfUploadBtn.length) {
      $pdfUploadBtn.on('click', function(){
        if ($startModal.attr('data-mode') !== 'edit') return;
        const rowId = $startModal.attr('data-edit-row');
        const section = $startModal.attr('data-edit-section');
        const caseId = $startModal.attr('data-edit-case');
        if (!rowId || !section) return;
        const $btn = $(this);
        const $input = $('<input type="file" accept="application/pdf" style="display:none">');
        $('body').append($input);
        $input.on('change', function(){
          if (!this.files || !this.files[0]) { $input.remove(); return; }
          $btn.prop('disabled', true).attr('data-loading','1');
          doPdfUpload(section, rowId, this.files[0]).done(function(res){
            if (res && res.success) {
              const nextUrl = (res.data && res.data.pdf_url) ? res.data.pdf_url : '';
              setPdfInfo(nextUrl);
              if (caseId) refreshSectionFor(caseId, section);
            } else {
              const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo subir el PDF';
              alert(message);
            }
          }).fail(function(){
            alert('Error de conexión al subir PDF');
          }).always(function(){
            $btn.prop('disabled', false).removeAttr('data-loading');
            $input.remove();
          });
        }).trigger('click');
      });
    }

    if ($pdfDeleteBtn.length) {
      $pdfDeleteBtn.on('click', function(){
        const $btn = $(this);
        if ($btn.prop('disabled')) return;
        const rowId = $startModal.attr('data-edit-row');
        const section = $startModal.attr('data-edit-section');
        const caseId = $startModal.attr('data-edit-case');
        if (!rowId || !section) return;
        if (!confirm('¿Eliminar el PDF de esta acción?')) return;
        $btn.attr('data-loading','1');
        doPdfClear(section, rowId).done(function(res){
          if (res && res.success){
            setPdfInfo('');
            if (caseId) refreshSectionFor(caseId, section);
          } else {
            const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo eliminar el PDF';
            alert(message);
            $btn.prop('disabled', false);
          }
        }).fail(function(){
          alert('Error de conexión al eliminar PDF');
          $btn.prop('disabled', false);
        }).always(function(){
          $btn.removeAttr('data-loading');
        });
      });
    }

    function reallyCloseStart(){
      $startModal.removeClass('show').attr('aria-hidden','true').hide();
      $('body').removeClass('gcas-casos-app-no-scroll');
      resetStartModal();
    }

    function closeStart(force){
      if (force && typeof force.preventDefault === 'function') {
        force.preventDefault();
        force = false;
      }
      const shouldForce = force === true;
      if (!shouldForce && startDirty && $startModal.attr('data-mode') !== 'view'){
        if(!confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
      }
      reallyCloseStart();
    }

    function openStart(mode){
      setStartModalMode(mode);
      startDirty = false;
      $startModal.addClass('show').attr('aria-hidden','false').show();
      $('body').addClass('gcas-casos-app-no-scroll');
    }

    $startModal.find('.gcas-modal-close').off('click').on('click', closeStart);
    $startCancel.on('click', closeStart);
    $startModal.on('mousedown', function(e){
      const $dialog = $startModal.find('.gcas-modal-dialog');
      if ($dialog.is(e.target) || $dialog.has(e.target).length) return;
      closeStart();
    });

    // Modal estado del caso
    let $statusModal = $('#gcas-casos-app-modal-status');
    let $statusForm  = $('#gcas-casos-form-status');
    const $statusSave   = $('#gcas-casos-save-status');
    const $statusCancel = $('#gcas-casos-cancel-status');
    let statusDirty = false;

    if ($statusModal.length && $statusModal.parent()[0] !== document.body) {
      $statusModal = $statusModal.detach().appendTo('body');
      $statusForm = $('#gcas-casos-form-status');
    }
    if ($statusModal.length) {
      $statusModal.removeClass('show').attr('aria-hidden','true').hide();
    }

    function resetStatusModal(){
      statusDirty = false;
      if ($statusForm && $statusForm[0]) {
        $statusForm[0].reset();
      }
    }

    function closeStatus(force){
      if (!$statusModal.length) return;
      if (force && typeof force.preventDefault === 'function') {
        force.preventDefault();
        force = false;
      }
      const shouldForce = force === true;
      if (!shouldForce && statusDirty){
        if (!confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
      }
      $statusModal.removeClass('show').attr('aria-hidden','true').hide();
      if (!$modal.hasClass('show') && !$startModal.hasClass('show')) {
        $('body').removeClass('gcas-casos-app-no-scroll');
      }
      resetStatusModal();
    }

    function openStatus(){
      if (!$statusModal.length) return;
      statusDirty = false;
      $statusModal.addClass('show').attr('aria-hidden','false').show();
      $('body').addClass('gcas-casos-app-no-scroll');
    }

    if ($statusModal.length){
      $statusModal.find('.gcas-modal-close').off('click').on('click', closeStatus);
      $statusCancel.on('click', closeStatus);
      $statusModal.on('mousedown', function(e){
        const $dialog = $statusModal.find('.gcas-modal-dialog');
        if ($dialog.is(e.target) || $dialog.has(e.target).length) return;
        closeStatus();
      });
      $statusForm.on('input change', 'input, select', function(){ statusDirty = true; });
    }

    /* =========================
     *  Modal general (casos)
     * ========================= */
    let dirty = false, mode = 'create';
    function setDirty(v){ dirty = !!v; }

    function resetForm(){
      if ($form[0]) $form[0].reset();
      $form.find('[name=id]').val('');
      $form.find('[name=entidad],[name=expediente]').val('');
      $form.find('[name=case_type]').prop('disabled', false);
      $form.find('input, textarea, select').prop('disabled', false).removeClass('gcas-readonly');
      $user.prop('disabled', false);
      setDirty(false);
    }

    function openModal(){ $modal.addClass('show').attr('aria-hidden','false').show(); $('body').addClass('gcas-casos-app-no-scroll'); }
    function closeModal(){
      if (dirty && mode !== 'view') {
        if (!confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
      }
      $modal.removeClass('show').attr('aria-hidden','true').hide();
      $('body').removeClass('gcas-casos-app-no-scroll');
    }

    function setMode(m){
      mode = m;
      const readonly = (m === 'view');
      $('#gcas-casos-modal-title').text(
        m === 'create' ? 'Crear nuevo caso' :
        m === 'edit'   ? 'Editar caso'      : 'Ver caso'
      );
      if (readonly) {
        $form.find('input, textarea, select').prop('disabled', true).addClass('gcas-readonly');
      } else {
        $form.find('input, textarea, select').prop('disabled', false).removeClass('gcas-readonly');
        const disableFixed = (m !== 'create');
        $user.prop('disabled', disableFixed);
        $form.find('[name=case_type]').prop('disabled', disableFixed);
        $form.find('[name=entidad],[name=expediente]').prop('disabled', true).addClass('gcas-readonly');
      }
      $save.toggle(m !== 'view').text(m === 'edit' ? 'Actualizar' : 'Guardar');
    }

    function fillForm(d){
      $form.find('[name=id]').val(d.id || '');
      const nomen = d.nomenclatura || d.nomenclature || '';
      $form.find('[name=nomenclatura]').val(nomen);
      $form.find('[name=convocatoria]').val(d.convocatoria || '');
      $form.find('[name=expediente]').val(d.exediente || d.expediente || '');
      $form.find('[name=entidad]').val(d.entidad || '');
      $form.find('[name=objeto]').val(d.objeto || '');
      $form.find('[name=descripcion]').val(d.descripcion || '');
      $form.find('[name=case_type]').val(d.case_type || '');
      if ($user.length && d.user_id) $user.val(String(d.user_id));
    }


    /* =========================
     *  Helpers: state & UX
     * ========================= */
    const STORAGE_KEY = 'gcasCasosState';
    const LEGACY_STORAGE_KEY = 'gucCasosState';

    function readStoredState(){
      const keys = [STORAGE_KEY, LEGACY_STORAGE_KEY];
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!key) continue;
        try {
          const raw = window.localStorage.getItem(key);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            if (key === LEGACY_STORAGE_KEY && STORAGE_KEY !== LEGACY_STORAGE_KEY) {
              try { window.localStorage.removeItem(LEGACY_STORAGE_KEY); } catch(e){}
            }
            return parsed;
          }
        } catch(e){}
      }
      return null;
    }

    function rememberState(state){
      try {
        if (!state) return;
        const payload = {
          openCases: Array.isArray(state.openCases) ? state.openCases : [],
          panels: state.panels && typeof state.panels === 'object' ? state.panels : {},
          secretariaBucket: state.secretariaBucket && typeof state.secretariaBucket === 'object' ? state.secretariaBucket : {}
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        if (LEGACY_STORAGE_KEY && LEGACY_STORAGE_KEY !== STORAGE_KEY) {
          try { window.localStorage.removeItem(LEGACY_STORAGE_KEY); } catch(e){}
        }
      } catch(e){}
    }

    updateSearchUI();
    updateFilterUI();
    closeFilterMenu(true);

    function captureState(){
      const state = { openCases: [], panels:{}, secretariaBucket:{}, search: currentSearch || '', filter: currentFilter || '' };
      $root.find('tr.gcas-subrow').each(function(){
        const caseId = String($(this).attr('data-parent') || '');
        if(!caseId) return;
        if (!state.openCases.includes(caseId)) state.openCases.push(caseId);
        state.panels[caseId] = [];
        $(this).find('.gcas-sec .gcas-toggle').each(function(idx){
          state.panels[caseId][idx] = ($(this).attr('aria-expanded') === 'true');
        });
        const $secWrap = $(this).find('.gcas-subtable-wrap[data-section="secretaria"]');
        const b = $secWrap.attr('data-bucket');
        if (b) state.secretariaBucket[caseId] = b;
      });
      return state;
    }

    function applyPanelState($sub, arr){
      const cfg = arr || [];
      $sub.find('.gcas-sec .gcas-toggle').each(function(idx){
        const wantOpen = (cfg[idx] !== false);
        const $btn = $(this);
        const $panel = $btn.next('.gcas-panel');
        $btn.attr('aria-expanded', wantOpen ? 'true' : 'false');
        $btn.find('.gcas-caret').text(wantOpen ? '▴' : '▾');
        if (wantOpen) $panel.show(); else $panel.hide();
      });
    }

    function setCaseHasActions(caseId, has){
      const cid = String(caseId);
      const $btn = $root.find('.gcas-start[data-id="'+cid+'"]').first();
      if ($btn.length) {
        $btn.text(has ? 'Agregar acción' : 'Iniciar caso');
        $btn.closest('tr').attr('data-has-actions', has ? '1' : '0');
      }
    }

    function updateCaseHasActions($sub){
      if(!$sub || !$sub.length) return;
      const caseId = $sub.attr('data-parent');
      if(!caseId) return;
      const has = $sub.find('tbody tr[data-row-id]').length > 0;
      setCaseHasActions(caseId, has);
    }

    function resolveSectionKey($btn){
      let section = $btn.data('section');
      if(!section){
        const $wrap = $btn.closest('.gcas-subtable-wrap');
        const secKey = $wrap.data('section');
        if (secKey === 'secretaria') section = $wrap.attr('data-bucket') || 'sec_general';
        else section = (secKey === 'pre') ? 'pre' : 'arb';
      }
      return section;
    }

    function refreshSectionFor(caseId, sectionKey){
      if(!caseId) return;
      const cid = String(caseId);
      const $sub = $root.find('tr.gcas-subrow[data-parent="'+cid+'"]').first();
      if(!$sub.length) return;
      let $wrap;
      if (sectionKey === 'pre') {
        $wrap = $sub.find('.gcas-subtable-wrap[data-section="pre"]');
      } else if (sectionKey === 'arb') {
        $wrap = $sub.find('.gcas-subtable-wrap[data-section="arb"]');
      } else {
        $wrap = $sub.find('.gcas-subtable-wrap[data-section="secretaria"]');
        if ($wrap.length) {
          $wrap.attr('data-bucket', sectionKey);
          $sub.find('[data-secretaria-title]').text(sectionKey === 'sec_arbitral' ? 'Secretaría Arbitral' : 'Secretaría General');
        }
      }
      if ($wrap && $wrap.length) {
        renderSection($wrap);
      }
    }

    function openCaseRow($row, caseId, state){
      if(!$row || !$row.length) return null;
      const cid = String(caseId);
      const $sub = ensureSubrow($row, cid);
      if(!$sub || !$sub.length) return null;

      const secBucket = state && state.secretariaBucket ? state.secretariaBucket[cid] : undefined;
      if (secBucket) {
        const $wrap = $sub.find('.gcas-subtable-wrap[data-section="secretaria"]');
        $wrap.attr('data-bucket', secBucket);
        $sub.find('[data-secretaria-title]').text(secBucket === 'sec_arbitral' ? 'Secretaría Arbitral' : 'Secretaría General');
      }

      const $preWrap = $sub.find('.gcas-subtable-wrap[data-section="pre"]');
      const $secWrap = $sub.find('.gcas-subtable-wrap[data-section="secretaria"]');
      const $arbWrap = $sub.find('.gcas-subtable-wrap[data-section="arb"]');

      renderSection($preWrap);
      renderSection($secWrap);
      renderSection($arbWrap);

      const panelState = (state && state.panels) ? state.panels[cid] : undefined;
      applyPanelState($sub, panelState);
      return $sub;
    }

    function restoreState(state){
      const stored = state || readStoredState() || { openCases:[], panels:{}, secretariaBucket:{}, search:'', filter:'' };
      currentSearch = stored.search ? String(stored.search) : '';
      const storedFilter = stored.filter ? String(stored.filter) : '';
      currentFilter = (storedFilter === 'TAR' || storedFilter === 'JPRD') ? storedFilter : '';
      updateSearchUI();
      updateFilterUI();
      const requested = new Set((stored.openCases || []).map(String));
      const opened = new Set();

      requested.forEach(function(cid){
        const $row = $tbody.find('tr[data-id="'+cid+'"]').first();
        if(!$row.length) return;
        if (openCaseRow($row, cid, stored)) {
          opened.add(cid);
        }
      });

      $tbody.find('tr[data-id][data-has-actions="1"]').each(function(){
        const cid = String($(this).data('id'));
        if(opened.has(cid)) return;
        if (openCaseRow($(this), cid, stored)) {
          opened.add(cid);
        }
      });

      rememberState(captureState());
    }


    /* =========================
     *  Datos (AJAX)
     * ========================= */
    function loadTable(){
      closeFilterMenu();
      const runtimeState = captureState();
      rememberState(runtimeState);
      $.post(GUC_CASOS.ajax, {
        action:'guc_list_cases',
        nonce:GUC_CASOS.nonce,
        search: currentSearch,
        filter: currentFilter
      }, function(res){
        if (res && res.success) {
          $tbody.html(res.data.html);
          restoreState(runtimeState.openCases && runtimeState.openCases.length ? runtimeState : null);
        } else {
          $tbody.html('<tr><td colspan="6" class="gcas-empty">Error al cargar.</td></tr>');
        }
      }, 'json').fail(function(){
        $tbody.html('<tr><td colspan="6" class="gcas-empty">Error de conexión.</td></tr>');
      });
    }

    function loadUsers(selectedId, includeId){
      const payload = { action:'guc_list_users', nonce:GUC_CASOS.nonce };
      if (includeId) payload.include_id = includeId;
      return $.post(GUC_CASOS.ajax, payload, function(res){
        if (res && res.success) {
          $user.empty().append('<option value="">— Selecciona un usuario —</option>');
          res.data.forEach(function(u){
            $user.append('<option value="'+u.id+'" data-entity="'+(u.entity||'')+'" data-expediente="'+(u.expediente||'')+'">'+(u.username || ('ID '+u.id))+'</option>');
          });
          if (selectedId) {
            const sid = String(selectedId);
            if (!$user.find('option[value="'+sid+'"]').length && res.data){
              const current = res.data.find(function(u){ return String(u.id) === sid; });
              if (current) {
                $user.append('<option value="'+current.id+'" data-entity="'+(current.entity||'')+'" data-expediente="'+(current.expediente||'')+'">'+(current.username || ('ID '+current.id))+'</option>');
              }
            }
            $user.val(sid);
          }
        } else {
          const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudieron cargar usuarios';
          alert(message);
        }
      }, 'json');
    }

    /* =========================
     *  UI base
     * ========================= */
    $modal.removeClass('show').attr('aria-hidden','true').hide();

    $open.on('click', async function(){
      resetForm(); setMode('create'); await loadUsers('');
      openModal();
    });
    $close.on('click', closeModal);

    $(document).on('keydown.gcasCasos', function(e){
      if (e.key === 'Escape') {
        if ($statusModal.length && $statusModal.hasClass('show')) { closeStatus(); }
        if ($startModal.hasClass('show')) { closeStart(); }
        if ($modal.hasClass('show')) { closeModal(); }
      }
    });
    $modal.on('mousedown', function(e){
      const $dialog = $modal.find('.gcas-modal-dialog').first();
      if ($dialog.is(e.target) || $dialog.has(e.target).length) return;
      closeModal();
    });

    // autocompletar entidad/expediente con el usuario
    $user.on('change', function(){
      const opt = this.options[this.selectedIndex];
      $form.find('[name=entidad]').val(opt ? (opt.getAttribute('data-entity') || '') : '');
      $form.find('[name=expediente]').val(opt ? (opt.getAttribute('data-expediente') || '') : '');
      setDirty(true);
    });

    $form.on('input change', 'input, textarea, select', function(){ setDirty(true); });

    // crear/actualizar caso
    $save.on('click', function(){
      const data = Object.fromEntries(new FormData($form[0]).entries());
      if (mode !== 'view' && !data.user_id) { alert('Selecciona un usuario para asignar el caso.'); return; }
      const action = data.id ? 'guc_update_case' : 'guc_create_case';
      $save.prop('disabled', true);
      $.post(GUC_CASOS.ajax, { action, nonce:GUC_CASOS.nonce, data }, function(res){
        $save.prop('disabled', false);
        if (res && res.success) { setDirty(false); closeModal(); loadTable(); }
        else {
          const message = (res && res.data && res.data.message) ? res.data.message : 'Error al guardar';
          alert(message);
        }
      }, 'json').fail(function(){
        $save.prop('disabled', false); alert('Error de conexión');
      });
    });

    // estado del caso
    $tbody.on('click', '.gcas-status', function(){
      if (!$statusModal.length) return;
      const id = $(this).data('id');
      if (!id) return;
      $.post(GUC_CASOS.ajax, { action:'guc_get_case', nonce:GUC_CASOS.nonce, id }, function(res){
        if (!(res && res.success)) { alert('No se pudo cargar el caso'); return; }
        const d = res.data || {};
        resetStatusModal();
        if ($statusForm.length) {
          $statusForm.find('[name=case_id]').val(d.id || '');
          $statusForm.find('[name=estado]').val(d.estado || '');
          const fecha = d.estado_fecha || '';
          if (fecha) {
            const iso = fecha.replace(' ', 'T').slice(0,16);
            $statusForm.find('[name=estado_fecha]').val(iso);
          }
        }
        statusDirty = false;
        openStatus();
      }, 'json').fail(function(){ alert('Error de conexión'); });
    });

    if ($statusSave.length){
      $statusSave.on('click', function(){
        if (!$statusForm.length) return;
        const data = Object.fromEntries(new FormData($statusForm[0]).entries());
        if (!data.case_id) { alert('Caso inválido'); return; }
        if (!data.estado) { alert('Selecciona un estado'); return; }
        $statusSave.prop('disabled', true);
        $.post(GUC_CASOS.ajax, { action:'guc_update_case_status', nonce:GUC_CASOS.nonce, data }, function(res){
          $statusSave.prop('disabled', false);
          if (res && res.success) {
            statusDirty = false;
            closeStatus(true);
            loadTable();
          } else {
            const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo actualizar el estado';
            alert(message);
          }
        }, 'json').fail(function(){
          $statusSave.prop('disabled', false);
          alert('Error de conexión');
        });
      });
    }

    // ver/editar/eliminar
    $tbody.on('click', '.gcas-view, .gcas-edit, .gcas-del', function(){
      const id = $(this).data('id');

      if ($(this).hasClass('gcas-del')) {
        if (!confirm('¿Eliminar este caso?')) return;
        $.post(GUC_CASOS.ajax, { action:'guc_delete_case', nonce:GUC_CASOS.nonce, id }, function(res){
          if (res && res.success) loadTable();
          else {
            const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo eliminar';
            alert(message);
          }
        }, 'json').fail(function(){ alert('Error de conexión al eliminar'); });
        return;
      }

      $.post(GUC_CASOS.ajax, { action:'guc_get_case', nonce:GUC_CASOS.nonce, id }, async function(res){
        if (!(res && res.success)) { alert('No se pudo cargar el caso'); return; }
        const d = res.data || {};
        resetForm(); await loadUsers(d.user_id, d.user_id); fillForm(d);
        if ($(this).hasClass('gcas-view')) setMode('view'); else setMode('edit');
        openModal(); setDirty(false);
      }.bind(this), 'json').fail(function(){ alert('Error de conexión al cargar'); });
    });

    /* ==========================================================
     *  Subfilas PRE / ARBITRALES
     * ========================================================== */
    let $lastStartRow = null;

    // abrir “Inicio de caso” desde la columna HISTORIAL
    $tbody.on('click', '.gcas-start', function(){
      $lastStartRow = $(this).closest('tr');
      const id = $(this).data('id');
      resetStartModal();
      $startForm.find('[name=case_id]').val(id || '');

      // autollenar fecha actual
      const $fecha = $startForm.find('[name=fecha]');
      if ($fecha.length && !$fecha.val()) {
        const now = new Date();
        const iso = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
        $fecha.val(iso);
      }
      openStart();
    });

    // crea la subfila (si no existe) y devuelve el jQuery del <tr> subrow
    function ensureSubrow($row, caseId){
      if (!$row || !$row.length) return null;
      if ($row.next().hasClass('gcas-subrow')) return $row.next();
      const colSpan = $row.children('td,th').length || 6;
      const html = `
        <tr class="gcas-subrow" data-parent="${String(caseId)}">
          <td class="gcas-subrow-cell" colspan="${colSpan}">
            <div class="gcas-accordion">
              <div class="gcas-sec">
                <button type="button" class="gcas-toggle" aria-expanded="true">
                  <span class="gcas-caret">▴</span> PRE ARBITRALES
                </button>
                <div class="gcas-panel" style="display:block">
                  <div class="gcas-section" data-section="pre">
                    <div class="gcas-subtable-wrap" data-case-id="${String(caseId)}" data-section="pre"></div>
                  </div>
                </div>
              </div>
              <div class="gcas-sec">
                <button type="button" class="gcas-toggle" aria-expanded="true">
                  <span class="gcas-caret">▴</span> ARBITRALES
                </button>
                <div class="gcas-panel" style="display:block">
                  <div class="gcas-section" data-section="secretaria">
                    <h4 class="gcas-subtitle" data-secretaria-title>Secretaría</h4>
                    <div class="gcas-subtable-wrap" data-case-id="${String(caseId)}" data-section="secretaria"></div>
                  </div>
                  <div class="gcas-section" data-section="arb">
                    <h4 class="gcas-subtitle">Arbitral</h4>
                    <div class="gcas-subtable-wrap" data-case-id="${String(caseId)}" data-section="arb"></div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>`;
      return $(html).insertAfter($row).css('display','table-row');
    }

    // título/bucket de Secretaría (TAR ⇒ Arbitral, JPRD ⇒ General)
    function loadSecretariaTitle(caseId, $container){
      return $.post(GUC_CASOS.ajax, { action:'guc_secretaria_title', nonce:GUC_CASOS.nonce, case_id: caseId }, function(res){
        if (res && res.success) {
          $container.find('[data-secretaria-title]').text(res.data.title);
          $container.find('.gcas-subtable-wrap[data-section="secretaria"]').attr('data-bucket', res.data.bucket);
        }
      }, 'json');
    }

    // renderiza una subtabla (PRE / Secretaría / Arbitral)
    function renderSection($wrap){
      const caseId = $wrap.data('case-id');
      const section = $wrap.data('section'); // pre | secretaria | arb
      if (!caseId) return;

      if (section === 'secretaria') {
        const bucket = $wrap.attr('data-bucket'); // sec_arbitral | sec_general
        const doList = function(bucketKey){
          $.post(GUC_CASOS.ajax, { action:'guc_list_section', nonce:GUC_CASOS.nonce, case_id:caseId, section: bucketKey }, function(res){
            if (res && res.success) {
              $wrap.html(res.data.html);
              updateCaseHasActions($wrap.closest('tr.gcas-subrow'));
              rememberState(captureState());
            }
            else $wrap.html('<div class="gcas-empty">No se pudo cargar Secretaría.</div>');
          }, 'json').fail(function(){ $wrap.html('<div class="gcas-empty">Error de conexión.</div>'); });
        };
        if (bucket) doList(bucket);
        else {
          $.post(GUC_CASOS.ajax, { action:'guc_secretaria_title', nonce:GUC_CASOS.nonce, case_id: caseId }, function(res){
            if (res && res.success) {
              $wrap.attr('data-bucket', res.data.bucket);
              $wrap.closest('.gcas-section[data-section="secretaria"]').find('[data-secretaria-title]').text(res.data.title);
              doList(res.data.bucket);
            } else {
              $wrap.html('<div class="gcas-empty">No se pudo determinar Secretaría.</div>');
            }
          }, 'json').fail(function(){ $wrap.html('<div class="gcas-empty">Error de conexión.</div>'); });
        }
      } else {
        const key = section === 'pre' ? 'pre' : 'arb';
        $.post(GUC_CASOS.ajax, { action:'guc_list_section', nonce:GUC_CASOS.nonce, case_id:caseId, section:key }, function(res){
          if (res && res.success) {
            $wrap.html(res.data.html);
            updateCaseHasActions($wrap.closest('tr.gcas-subrow'));
            rememberState(captureState());
          }
          else $wrap.html('<div class="gcas-empty">No se pudo cargar.</div>');
        }, 'json').fail(function(){ $wrap.html('<div class="gcas-empty">Error de conexión.</div>'); });
      }
    }

    // acordeón
    $root.on('click', '.gcas-toggle', function () {
      const $btn = $(this);
      const $panel = $btn.next('.gcas-panel');
      const expanded = $btn.attr('aria-expanded') === 'true';
      $btn.attr('aria-expanded', !expanded);
      $btn.find('.gcas-caret').text(expanded ? '▾' : '▴');
      if (expanded) { $panel.slideUp(160); } else { $panel.slideDown(160); }
      rememberState(captureState());
    });

    /* ==========================================================
     *  Botón "Agregar acción" (marca el destino)
     * ========================================================== */
    $root.on('click', '.gcas-add-action', function(){
      const sectionKey = $(this).data('section'); // pre | sec_arbitral | sec_general | arb
      const caseId = $(this).data('case-id');

      resetStartModal();
      $startForm.find('[name=case_id]').val(caseId);
      $startModal.attr('data-target-section', sectionKey); // <- destino explícito

      const $fecha = $startForm.find('[name=fecha]');
      if ($fecha.length && !$fecha.val()) {
        const now = new Date();
        const iso = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
        $fecha.val(iso);
      }
      openStart();
    });


    /* ==========================================================
     *  Editar fila de acción (reutiliza el mismo modal)
     * ========================================================== */
    $root.on('click', '.gcas-row-edit', function(){
      const $btn = $(this);
      const $row = $btn.closest('tr');
      const rowId = $row.data('row-id');
      if(!rowId) return;
      // infer section from container if not provided in data-section
      const section = resolveSectionKey($btn);

      $.post(GUC_CASOS.ajax, { action:'guc_get_section_row', nonce:GUC_CASOS.nonce, section, row_id: rowId }, function(res){
        if(!(res && res.success)){
          const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo obtener la fila';
          alert(message);
          return;
        }
        const d = res.data || {};
        resetStartModal();
        $startModal.attr('data-target-section', section)
                   .attr('data-edit-row', String(rowId))
                   .attr('data-edit-section', section);
        if (d.case_id) {
          $startModal.attr('data-edit-case', String(d.case_id));
        }
        $startForm.find('[name=case_id]').val(d.case_id || '');
        $startForm.find('[name=situacion]').val(d.situacion || '');
        $startForm.find('[name=motivo]').val(d.motivo || '');
        if (d.fecha) {
          // ensure format yyyy-mm-ddThh:mm
          const isoLocal = d.fecha.replace(' ', 'T').slice(0,16);
          $startForm.find('[name=fecha]').val(isoLocal);
        }
        const pdfUrl = d.pdf_url || d.pdf || d.file_url || d.attachment_url || '';
        showPdfField(true);
        setPdfInfo(pdfUrl);
        openStart('edit');
      }, 'json').fail(function(){ alert('Error de conexión'); });
    });

    $root.on('click', '.gcas-row-del', function(){
      const $btn = $(this);
      const section = resolveSectionKey($btn);
      const rowId = $btn.closest('tr').data('row-id');
      if (!rowId || !section) return;
      const $wrap = $btn.closest('.gcas-subtable-wrap');
      if (!confirm('¿Eliminar esta acción?')) return;
      $btn.prop('disabled', true);
      $.post(GUC_CASOS.ajax, { action:'guc_delete_section_row', nonce:GUC_CASOS.nonce, section, row_id: rowId }, function(res){
        if (res && res.success){
          renderSection($wrap);
        } else {
          const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo eliminar la acción';
          alert(message);
          $btn.prop('disabled', false);
        }
      }, 'json').fail(function(){
        alert('Error de conexión al eliminar');
        $btn.prop('disabled', false);
      });
    });


    /* ==========================================================
     *  Guardar (UNIFICADO) para INICIAR CASO y AGREGAR ACCIÓN
     * ========================================================== */
    $startSave.off('click'); // por si había handlers previos
    $startSave.on('click', function(){
      const target = $startModal.attr('data-target-section'); // undefined | 'pre' | 'arb' | 'sec_arbitral' | 'sec_general'
      const data = Object.fromEntries(new FormData($startForm[0]).entries());

      // validaciones comunes
      if (!data.case_id) { alert('ID del caso no válido.'); return; }
      if (!data.situacion || !String(data.situacion).trim()) { alert('Describe la situación.'); return; }
      if (!data.motivo || !String(data.motivo).trim())    { alert('Indica el motivo.'); return; }

      $startSave.prop('disabled', true);

      // ---------- Rama A: AGREGAR/EDITAR ACCIÓN ----------
      if (target) {
        const editingRow = $startModal.attr('data-edit-row') || '';

        // si el target pedido es "secretaria", ya viene resuelto (sec_arbitral o sec_general) desde el botón
        const bucket = (target === 'secretaria') ? 'sec_general' : target; // fallback; normalmente vendrá sec_arbitral o sec_general

        // pero si vino literalmente "secretaria" (desde la primera carga), resolvemos según último inicio:
        const resolveBucket = (cb)=>{
          if (target !== 'secretaria') return cb(bucket);
          $.post(GUC_CASOS.ajax, { action:'guc_secretaria_title', nonce:GUC_CASOS.nonce, case_id: data.case_id }, function(res){
            cb((res && res.success) ? res.data.bucket : 'sec_general');
          }, 'json').fail(function(){ cb('sec_general'); });
        };

        resolveBucket(function(finalBucket){
          const payload = {
            nonce: GUC_CASOS.nonce,
            section: finalBucket, case_id: data.case_id,
            data: { situacion: data.situacion, motivo: data.motivo, fecha: data.fecha }
          };
          let endpoint = 'guc_create_section_action';
          if (editingRow) { endpoint = 'guc_update_section_row'; payload['row_id'] = editingRow; }
          $.post(GUC_CASOS.ajax, Object.assign({ action:endpoint }, payload), function(res){
            $startSave.prop('disabled', false);
            if (!(res && res.success)) {
              var fallback = editingRow ? 'No se pudo actualizar la acción' : 'No se pudo registrar la acción';
              var message = (res && res.data && res.data.message) ? res.data.message : fallback;
              alert(message);
              return;
            }

            startDirty = false;
            closeStart(true); // cerrar modal y limpiar destino

            // refrescar SOLO la subtabla correspondiente
            const $sub = $root.find('tr.gcas-subrow[data-parent="'+data.case_id+'"]').first();
            let $wrap;
            if (finalBucket === 'pre') {
              $wrap = $sub.find('.gcas-subtable-wrap[data-section="pre"]');
            } else if (finalBucket === 'arb') {
              $wrap = $sub.find('.gcas-subtable-wrap[data-section="arb"]');
            } else {
              // secretaría
              $wrap = $sub.find('.gcas-subtable-wrap[data-section="secretaria"]');
              if ($wrap.length) {
                $wrap.attr('data-bucket', finalBucket);
                $sub.find('[data-secretaria-title]').text(finalBucket === 'sec_arbitral' ? 'Secretaría Arbitral' : 'Secretaría General');
              }
            }
            if ($wrap && $wrap.length) {
              renderSection($wrap);
            }
          }, 'json').fail(function(){
            $startSave.prop('disabled', false);
            alert('Error de conexión al registrar la acción');
          });
        });

        return; // IMPORTANTE: no ejecutar la rama de iniciar caso
      }

      // ---------- Rama B: INICIAR CASO ----------

      $.post(GUC_CASOS.ajax, { action:'guc_create_case_event', nonce:GUC_CASOS.nonce, data }, function(res){
        $startSave.prop('disabled', false);
        if (!(res && res.success)) {
          const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo registrar el evento';
          alert(message);
          return;
        }

        startDirty = false;
        closeStart(true);

        // asegurar subfila
        const $row = ($lastStartRow && $lastStartRow.length) ? $lastStartRow : $root.find('.gcas-start[data-id="'+ data.case_id +'"]').first().closest('tr');
        const $sub = ensureSubrow($row, data.case_id);

        // 1) insertar PRIMER registro visible en PRE
        $.post(GUC_CASOS.ajax, {
          action:'guc_create_section_action', nonce:GUC_CASOS.nonce,
          section:'pre', case_id: data.case_id,
          data: { situacion: data.situacion, motivo: data.motivo, fecha: data.fecha }
        }, function(){
          const $preWrap = $sub.find('.gcas-subtable-wrap[data-section="pre"]');
          renderSection($preWrap);
        }, 'json');

        // 2) setear Secretaría según último tipo y renderizar tablas
        loadSecretariaTitle(data.case_id, $sub).then(function(){
          const $secWrap = $sub.find('.gcas-subtable-wrap[data-section="secretaria"]');
          renderSection($secWrap);
        });
        const $arbWrap = $sub.find('.gcas-subtable-wrap[data-section="arb"]');
        renderSection($arbWrap);

      }, 'json').fail(function(){
        $startSave.prop('disabled', false);
        alert('Error de conexión al registrar el evento');
      });
    });

    function doPdfUpload(section, rowId, file){
      const fd = new FormData();
      fd.append('action','guc_upload_pdf');
      fd.append('nonce', GUC_CASOS.nonce);
      fd.append('section', section);
      fd.append('row_id', rowId);
      fd.append('file', file);
      return $.ajax({
        url: GUC_CASOS.ajax,
        type: 'POST',
        data: fd,
        contentType: false,
        processData: false,
        dataType: 'json'
      });
    }

    function doPdfClear(section, rowId){
      return $.post(GUC_CASOS.ajax, {
        action: 'guc_clear_pdf',
        nonce: GUC_CASOS.nonce,
        section,
        row_id: rowId
      }, null, 'json');
    }

    /* ==========================================================
     *  Subida de PDF (delegado por fila)
     * ========================================================== */
    $root.on('click', '.gcas-upload', function(){
      const $btn = $(this);
      const section = resolveSectionKey($btn); // pre | sec_arbitral | sec_general | arb
      const $row = $btn.closest('tr');
      const rowId   = $row.data('row-id');
      const caseId  = $row.data('case-id');
      if (!rowId || !section) return;

      const $wrap = $btn.closest('.gcas-subtable-wrap');

      const $input = $('<input type="file" accept="application/pdf" style="display:none">');
      $('body').append($input);
      $input.on('change', function(){
        if (!this.files || !this.files[0]) { $input.remove(); return; }
        $btn.prop('disabled', true).attr('data-loading','1');
        doPdfUpload(section, rowId, this.files[0]).done(function(res){
          if (res && res.success) {
            if ($wrap.length) {
              renderSection($wrap);
            } else if (caseId) {
              refreshSectionFor(caseId, section);
            }
          } else {
            const message = (res && res.data && res.data.message) ? res.data.message : 'No se pudo subir el PDF';
            alert(message);
          }
        }).fail(function(){
          alert('Error de conexión al subir PDF');
        }).always(function(){
          $btn.removeAttr('data-loading').prop('disabled', false);
          $input.remove();
        });
      }).trigger('click');
    });
    /* ==========================================================
     *  Carga inicial de tabla de casos
     * ========================================================== */
    loadTable();
  });

})(jQuery);
