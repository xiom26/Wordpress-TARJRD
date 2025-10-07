(function($){
  $(function(){

    /* =========================
     *  Referencias base (UI)
     * ========================= */
    let $modal = $('#guc-modal');               // modal crear/editar/ver
    const $open  = $('#guc-open-modal');
    const $close = $('.guc-modal-close, #guc-cancel');
    const $form  = $('#guc-form-caso');
    const $save  = $('#guc-save');
    const $user  = $('#guc-user-select');
    const $tbody = $('#guc-cases-table');

    // Mover modales a body (evita cortes por overflow)
    if ($modal.length && $modal.parent()[0] !== document.body) {
      $modal = $modal.detach().appendTo('body');
    }

    // Modal "Inicio de caso" (reutilizado para Agregar acción)
    let $startModal = $('#guc-modal-start');
    let $startForm  = $('#guc-form-inicio');
    const $startSave   = $('#guc-save-start');
    const $startCancel = $('#guc-cancel-start');

    if ($startModal.length && $startModal.parent()[0] !== document.body) {
      $startModal = $startModal.detach().appendTo('body');
    }
    $startModal.removeClass('show').attr('aria-hidden','true').hide();
    // --- Dirty tracking for start modal ---
    let startDirty = false;
    $startForm.on('input change', 'input, textarea', function(){ startDirty = true; });
    function reallyCloseStart(){
      $startModal.removeClass('show').attr('aria-hidden','true').hide();
      $('body').removeClass('guc-no-scroll');
      $startModal.removeAttr('data-target-section');
      startDirty = false;
    }
    function closeStart(){
      if (startDirty){
        if(!confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
      }
      reallyCloseStart();
    }
    $startModal.find('.guc-modal-close').off('click').on('click', closeStart);


    function openStart(){ $startModal.addClass('show').attr('aria-hidden','false').show(); $('body').addClass('guc-no-scroll'); }
    function closeStart(){ $startModal.removeClass('show').attr('aria-hidden','true').hide();
    // --- Dirty tracking for start modal ---
    let startDirty = false;
    $startForm.on('input change', 'input, textarea', function(){ startDirty = true; });
    function reallyCloseStart(){
      $startModal.removeClass('show').attr('aria-hidden','true').hide();
      $('body').removeClass('guc-no-scroll');
      $startModal.removeAttr('data-target-section');
      startDirty = false;
    }
    function closeStart(){
      if (startDirty){
        if(!confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
      }
      reallyCloseStart();
    }
    $startModal.find('.guc-modal-close').off('click').on('click', closeStart);
 $('body').removeClass('guc-no-scroll'); $startModal.removeAttr('data-target-section'); }
    $startCancel.on('click', closeStart);
    $startModal.on('mousedown', function(e){
      const $dialog = $startModal.find('.guc-modal-dialog');
      if ($dialog.is(e.target) || $dialog.has(e.target).length) return;
      closeStart();
    });

    /* =========================
     *  Modal general (casos)
     * ========================= */
    let dirty = false, mode = 'create';
    function setDirty(v){ dirty = !!v; }

    function resetForm(){
      if ($form[0]) $form[0].reset();
      $form.find('[name=id]').val('');
      $form.find('[name=entidad],[name=expediente]').val('');
      setDirty(false);
    }

    function openModal(){ $modal.addClass('show').attr('aria-hidden','false').show(); $('body').addClass('guc-no-scroll'); }
    function closeModal(){
      if (dirty && mode !== 'view') {
        if (!confirm('Tienes cambios sin guardar. ¿Cerrar de todos modos?')) return;
      }
      $modal.removeClass('show').attr('aria-hidden','true').hide();
      $('body').removeClass('guc-no-scroll');
    }

    function setMode(m){
      mode = m;
      const readonly = (m === 'view');
      $('#guc-modal-title').text(
        m === 'create' ? 'Crear nuevo caso' :
        m === 'edit'   ? 'Editar caso'      : 'Ver caso'
      );
      $form.find('input, textarea, select').prop('disabled', readonly).toggleClass('guc-readonly', readonly);
      $save.toggle(m !== 'view').text(m === 'edit' ? 'Actualizar' : 'Guardar');
    }

    function fillForm(d){
      $form.find('[name=id]').val(d.id || '');
      $form.find('[name=nomenclatura]').val(d.nomenclatura || '');
      $form.find('[name=convocatoria]').val(d.convocatoria || '');
      $form.find('[name=expediente]').val(d.exediente || d.expediente || '');
      $form.find('[name=entidad]').val(d.entidad || '');
      $form.find('[name=objeto]').val(d.objeto || '');
      $form.find('[name=descripcion]').val(d.descripcion || '');
      if ($user.length && d.user_id) $user.val(String(d.user_id));
    }


    /* =========================
     *  Helpers: state & UX
     * ========================= */
    function captureState(){
      const state = { openCases: [], panels:{}, secretariaBucket:{} };
      $('tr.guc-subrow').each(function(){
        const caseId = $(this).attr('data-parent');
        if(!caseId) return;
        state.openCases.push(caseId);
        state.panels[caseId] = [];
        $(this).find('.guc-sec .guc-toggle').each(function(idx){
          state.panels[caseId][idx] = ($(this).attr('aria-expanded') === 'true');
        });
        // record current secretaria bucket if present
        const $secWrap = $(this).find('.guc-subtable-wrap[data-section="secretaria"]');
        const b = $secWrap.attr('data-bucket');
        if (b) state.secretariaBucket[caseId] = b;
      });
      return state;
    }

    function restoreState(state){
      if(!state || !state.openCases) return;
      state.openCases.forEach(function(caseId){
        const $row = $('.guc-start[data-id="'+caseId+'"]').first().closest('tr');
        if(!$row.length) return;
        const $sub = ensureSubrow($row, caseId);
        // restore secretaria bucket/title if remembered
        if (state.secretariaBucket[caseId]) {
          const b = state.secretariaBucket[caseId];
          const $wrap = $sub.find('.guc-subtable-wrap[data-section="secretaria"]');
          $wrap.attr('data-bucket', b);
          $sub.find('[data-secretaria-title]').text(b === 'sec_arbitral' ? 'Secretaría Arbitral' : 'Secretaría General');
        }
        // render all wraps
        $sub.find('.guc-subtable-wrap').each(function(){ renderSection($(this)); });

        // restore panel expanded/collapsed
        const arr = state.panels[caseId] || [];
        $sub.find('.guc-sec .guc-toggle').each(function(idx){
          const wantOpen = (arr[idx] !== false); // default open
          const $btn = $(this);
          const $panel = $btn.next('.guc-panel');
          $btn.attr('aria-expanded', wantOpen ? 'true' : 'false');
          $btn.find('.guc-caret').text(wantOpen ? '▴' : '▾');
          if (wantOpen) $panel.show(); else $panel.hide();
        });
      });
      enhanceActionButtons($('#guc-cases-table'));
    }

    function enhanceActionButtons($scope){
      const S = $scope || $(document);
      S.find('.guc-view').each(function(){ if(!$(this).text().trim()) $(this).html('👁 Ver'); });
      S.find('.guc-edit').each(function(){ if(!$(this).text().trim()) $(this).html('✎ Editar'); });
      S.find('.guc-del').each(function(){ if(!$(this).text().trim()) $(this).html('🗑 Eliminar'); });
      S.find('.guc-upload').each(function(){ if(!$(this).text().trim()) $(this).html('⤴ Subir PDF'); });
      S.find('.guc-pdf').each(function(){ if(!$(this).text().trim()) $(this).html('📄 PDF'); });
    }


    /* =========================
     *  Datos (AJAX)
     * ========================= */
    function loadTable(){
      const _state = captureState();
      $.post(GUC_CASOS.ajax, { action:'guc_list_cases', nonce:GUC_CASOS.nonce }, function(res){
        if (res && res.success) {
          $tbody.html(res.data.html);
          enhanceActionButtons($tbody);
          restoreState(_state);
        } else {
          $tbody.html('<tr><td colspan="6" class="guc-empty">Error al cargar.</td></tr>');
        }
      }, 'json').fail(function(){
        $tbody.html('<tr><td colspan="6" class="guc-empty">Error de conexión.</td></tr>');
      });
    }

    function loadUsers(selectedId){
      return $.post(GUC_CASOS.ajax, { action:'guc_list_users', nonce:GUC_CASOS.nonce }, function(res){
        if (res && res.success) {
          $user.empty().append('<option value="">— Selecciona un usuario —</option>');
          res.data.forEach(function(u){
            $user.append('<option value="'+u.id+'" data-entity="'+(u.entity||'')+'" data-expediente="'+(u.expediente||'')+'">'+(u.username || ('ID '+u.id))+'</option>');
          });
          if (selectedId) $user.val(String(selectedId));
        } else {
          alert(res?.data?.message || 'No se pudieron cargar usuarios');
        }
      }, 'json');
    }

    /* =========================
     *  UI base
     * ========================= */
    $modal.removeClass('show').attr('aria-hidden','true').hide();

    $open.on('click', async function(){
      resetForm(); setMode('create'); await loadUsers('');
      $form.find('[name=entidad],[name=expediente]').prop('disabled', true).addClass('guc-readonly');
      openModal();
    });
    $close.on('click', closeModal);

    $(document).on('keydown.gucCasos', function(e){
      if (e.key === 'Escape' && ($modal.hasClass('show') || $startModal.hasClass('show'))) { closeModal(); closeStart(); }
    });
    $modal.on('mousedown', function(e){
      const $dialog = $('.guc-modal-dialog').first();
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
        else alert(res?.data?.message || 'Error al guardar');
      }, 'json').fail(function(){
        $save.prop('disabled', false); alert('Error de conexión');
      });
    });

    // ver/editar/eliminar
    $tbody.on('click', '.guc-view, .guc-edit, .guc-del', function(){
      const id = $(this).data('id');

      if ($(this).hasClass('guc-del')) {
        if (!confirm('¿Eliminar este caso?')) return;
        $.post(GUC_CASOS.ajax, { action:'guc_delete_case', nonce:GUC_CASOS.nonce, id }, function(res){
          if (res && res.success) loadTable();
          else alert(res?.data?.message || 'No se pudo eliminar');
        }, 'json').fail(function(){ alert('Error de conexión al eliminar'); });
        return;
      }

      $.post(GUC_CASOS.ajax, { action:'guc_get_case', nonce:GUC_CASOS.nonce, id }, async function(res){
        if (!(res && res.success)) { alert('No se pudo cargar el caso'); return; }
        const d = res.data || {};
        resetForm(); await loadUsers(d.user_id); fillForm(d); $form.find('[name=entidad],[name=expediente]').prop('disabled', true).addClass('guc-readonly');
        if ($(this).hasClass('guc-view')) setMode('view'); else setMode('edit');
        openModal(); setDirty(false);
      }.bind(this), 'json').fail(function(){ alert('Error de conexión al cargar'); });
    });

    /* ==========================================================
     *  Subfilas PRE / ARBITRALES
     * ========================================================== */
    let $lastStartRow = null;

    // abrir “Inicio de caso” desde la columna HISTORIAL
    $tbody.on('click', '.guc-start', function(){
      $lastStartRow = $(this).closest('tr');
      const id = $(this).data('id');
      if ($startForm[0]) $startForm[0].reset();
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
      if ($row.next().hasClass('guc-subrow')) return $row.next();
      const colSpan = $row.children('td,th').length || 6;
      const html = `
        <tr class="guc-subrow" data-parent="${String(caseId)}">
          <td class="guc-subrow-cell" colspan="${colSpan}">
            <div class="guc-accordion">
              <div class="guc-sec">
                <button type="button" class="guc-toggle" aria-expanded="true">
                  <span class="guc-caret">▴</span> PRE ARBITRALES
                </button>
                <div class="guc-panel" style="display:block">
                  <div class="guc-section" data-section="pre">
                    <div class="guc-subtable-wrap" data-case-id="${String(caseId)}" data-section="pre"></div>
                  </div>
                </div>
              </div>
              <div class="guc-sec">
                <button type="button" class="guc-toggle" aria-expanded="true">
                  <span class="guc-caret">▴</span> ARBITRALES
                </button>
                <div class="guc-panel" style="display:block">
                  <div class="guc-section" data-section="secretaria">
                    <h4 class="guc-subtitle" data-secretaria-title>Secretaría</h4>
                    <div class="guc-subtable-wrap" data-case-id="${String(caseId)}" data-section="secretaria"></div>
                  </div>
                  <div class="guc-section" data-section="arb">
                    <h4 class="guc-subtitle">Arbitral</h4>
                    <div class="guc-subtable-wrap" data-case-id="${String(caseId)}" data-section="arb"></div>
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
          $container.find('.guc-subtable-wrap[data-section="secretaria"]').attr('data-bucket', res.data.bucket);
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
            if (res && res.success) { $wrap.html(res.data.html); enhanceActionButtons($wrap); }
            else $wrap.html('<div class="guc-empty">No se pudo cargar Secretaría.</div>');
          }, 'json').fail(function(){ $wrap.html('<div class="guc-empty">Error de conexión.</div>'); });
        };
        if (bucket) doList(bucket);
        else {
          $.post(GUC_CASOS.ajax, { action:'guc_secretaria_title', nonce:GUC_CASOS.nonce, case_id: caseId }, function(res){
            if (res && res.success) {
              $wrap.attr('data-bucket', res.data.bucket);
              $wrap.closest('.guc-section[data-section="secretaria"]').find('[data-secretaria-title]').text(res.data.title);
              doList(res.data.bucket);
            } else {
              $wrap.html('<div class="guc-empty">No se pudo determinar Secretaría.</div>');
            }
          }, 'json').fail(function(){ $wrap.html('<div class="guc-empty">Error de conexión.</div>'); });
        }
      } else {
        const key = section === 'pre' ? 'pre' : 'arb';
        $.post(GUC_CASOS.ajax, { action:'guc_list_section', nonce:GUC_CASOS.nonce, case_id:caseId, section:key }, function(res){
          if (res && res.success) { $wrap.html(res.data.html); enhanceActionButtons($wrap); }
          else $wrap.html('<div class="guc-empty">No se pudo cargar.</div>');
        }, 'json').fail(function(){ $wrap.html('<div class="guc-empty">Error de conexión.</div>'); });
      }
    }

    // acordeón
    $(document).on('click', '.guc-toggle', function () {
      const $btn = $(this);
      const $panel = $btn.next('.guc-panel');
      const expanded = $btn.attr('aria-expanded') === 'true';
      $btn.attr('aria-expanded', !expanded);
      $btn.find('.guc-caret').text(expanded ? '▾' : '▴');
      if (expanded) { $panel.slideUp(160); } else { $panel.slideDown(160); }
    });

    /* ==========================================================
     *  Botón "Agregar acción" (marca el destino)
     * ========================================================== */
    $(document).on('click', '.guc-add-action', function(){
      const sectionKey = $(this).data('section'); // pre | sec_arbitral | sec_general | arb
      const caseId = $(this).data('case-id');

      if ($startForm[0]) $startForm[0].reset();
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
    $(document).on('click', '.guc-row-edit', function(){
      const $btn = $(this);
      const $row = $btn.closest('tr');
      const rowId = $row.data('row-id');
      if(!rowId) return;
      // infer section from container if not provided in data-section
      let section = $btn.data('section');
      if(!section){
        const $wrap = $btn.closest('.guc-subtable-wrap');
        const secKey = $wrap.data('section'); // pre | secretaria | arb
        if (secKey === 'secretaria') section = $wrap.attr('data-bucket') || 'sec_general';
        else section = (secKey === 'pre') ? 'pre' : 'arb';
      }

      $.post(GUC_CASOS.ajax, { action:'guc_get_section_row', nonce:GUC_CASOS.nonce, section, row_id: rowId }, function(res){
        if(!(res && res.success)){ alert(res?.data?.message || 'No se pudo obtener la fila'); return; }
        const d = res.data || {};
        if ($startForm[0]) $startForm[0].reset();
        $startModal.attr('data-target-section', section).attr('data-edit-row', String(rowId));
        $startForm.find('[name=case_id]').val(d.case_id || '');
        $startForm.find('[name=situacion]').val(d.situacion || '');
        $startForm.find('[name=motivo]').val(d.motivo || '');
        if (d.fecha) {
          // ensure format yyyy-mm-ddThh:mm
          const isoLocal = d.fecha.replace(' ', 'T').slice(0,16);
          $startForm.find('[name=fecha]').val(isoLocal);
        }
        openStart();
      }, 'json').fail(function(){ alert('Error de conexión'); });
    });


    /* ==========================================================
     *  Guardar (UNIFICADO) para INICIAR CASO y AGREGAR ACCIÓN
     * ========================================================== */
    $startSave.off('click'); // por si había handlers previos
    $startSave.on('click', function(){
      const target = $startModal.attr('data-target-section'); // undefined | 'pre' | 'arb' | 'sec_arbitral' | 'sec_general'
      const data = Object.fromEntries(new FormData($startForm[0]).entries());

      // validaciones comunes
      if (!data.case_id)           { alert('ID del caso no válido.'); return; }
      if (!data.situacion?.trim()) { alert('Describe la situación.'); return; }
      if (!data.motivo?.trim())    { alert('Indica el motivo.'); return; }

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
            if (!(res && res.success)) { alert(res?.data?.message || (editingRow?'No se pudo actualizar la acción':'No se pudo registrar la acción')); return; }

            closeStart(); // cerrar modal y limpiar destino
            $startModal.removeAttr('data-target-section').removeAttr('data-edit-row');

            // refrescar SOLO la subtabla correspondiente
            const $sub = $('tr.guc-subrow[data-parent="'+data.case_id+'"]');
            let $wrap;
            if (finalBucket === 'pre') {
              $wrap = $sub.find('.guc-subtable-wrap[data-section="pre"]');
            } else if (finalBucket === 'arb') {
              $wrap = $sub.find('.guc-subtable-wrap[data-section="arb"]');
            } else {
              // secretaría
              $wrap = $sub.find('.guc-subtable-wrap[data-section="secretaria"]');
              $wrap.attr('data-bucket', finalBucket);
              $sub.find('[data-secretaria-title]').text(finalBucket === 'sec_arbitral' ? 'Secretaría Arbitral' : 'Secretaría General');
            }
            renderSection($wrap);
          }, 'json').fail(function(){
            $startSave.prop('disabled', false);
            alert('Error de conexión al registrar la acción');
          });
        });

        return; // IMPORTANTE: no ejecutar la rama de iniciar caso
      }

      // ---------- Rama B: INICIAR CASO ---------- }

      $.post(GUC_CASOS.ajax, { action:'guc_create_case_event', nonce:GUC_CASOS.nonce, data }, function(res){
        $startSave.prop('disabled', false);
        if (!(res && res.success)) { alert(res?.data?.message || 'No se pudo registrar el evento'); return; }

        closeStart();

        // asegurar subfila
        const $row = ($lastStartRow && $lastStartRow.length) ? $lastStartRow : $('.guc-start[data-id="'+ data.case_id +'"]').first().closest('tr');
        const $sub = ensureSubrow($row, data.case_id);

        // 1) insertar PRIMER registro visible en PRE
        $.post(GUC_CASOS.ajax, {
          action:'guc_create_section_action', nonce:GUC_CASOS.nonce,
          section:'pre', case_id: data.case_id,
          data: { situacion: data.situacion, motivo: data.motivo, fecha: data.fecha }
        }, function(){
          const $preWrap = $sub.find('.guc-subtable-wrap[data-section="pre"]');
          renderSection($preWrap);
        }, 'json');

        // 2) setear Secretaría según último tipo y renderizar tablas
        loadSecretariaTitle(data.case_id, $sub).then(function(){
          const $secWrap = $sub.find('.guc-subtable-wrap[data-section="secretaria"]');
          renderSection($secWrap);
        });
        const $arbWrap = $sub.find('.guc-subtable-wrap[data-section="arb"]');
        renderSection($arbWrap);

      }, 'json').fail(function(){
        $startSave.prop('disabled', false);
        alert('Error de conexión al registrar el evento');
      });
    });

    /* ==========================================================
     *  Subida de PDF (delegado por fila)
     * ========================================================== */
    $(document).on('click', '.guc-upload', function(){
      const $btn = $(this);
      const section = $btn.data('section'); // pre | sec_arbitral | sec_general | arb
      const rowId   = $btn.closest('tr').data('row-id');
      if (!rowId) return;

      const $input = $('<input type="file" accept="application/pdf" style="display:none">');
      $('body').append($input);
      $input.on('change', function(){
        if (!this.files || !this.files[0]) { $input.remove(); return; }
        const fd = new FormData();
        fd.append('action','guc_upload_pdf');
        fd.append('nonce', GUC_CASOS.nonce);
        fd.append('section', section);
        fd.append('row_id', rowId);
        fd.append('file', this.files[0]);

        $btn.prop('disabled', true).text('Subiendo...');
        $.ajax({
          url: GUC_CASOS.ajax,
          type: 'POST',
          data: fd, contentType:false, processData:false, dataType:'json'
        }).done(function(res){
          if (res && res.success) {
            $btn.replaceWith('<a class="guc-btn guc-btn-secondary" target="_blank" rel="noopener" href="'+res.data.pdf_url+'">PDF subido</a>');
          } else {
            alert(res?.data?.message || 'No se pudo subir el PDF');
            $btn.prop('disabled', false).text('Subir PDF');
          }
        }).fail(function(){
          alert('Error de conexión al subir PDF');
          $btn.prop('disabled', false).text('Subir PDF');
        }).always(function(){ $input.remove(); });
      }).trigger('click');
    });


    /* ==========================================================
     *  PDF: menú Ver / Reemplazar / Eliminar
     * ========================================================== */
    function buildPdfMenu($anchor, opts){
      $('.guc-pdf-menu').remove(); // close others
      const menu = $('<div class="guc-pdf-menu" />').css({
        position:'absolute', zIndex: 100002, background:'#fff', border:'1px solid #eadfce', borderRadius:'8px',
        boxShadow:'0 8px 20px rgba(0,0,0,.12)', overflow:'hidden'
      });
      const mkBtn = (label, cls)=> $('<button type="button" />').addClass(cls).css({display:'block',padding:'8px 12px',border:0,background:'#fff',width:'100%',textAlign:'left',cursor:'pointer'}).text(label);
      const $v = mkBtn('Ver', 'guc-pdf-view');
      const $r = mkBtn('Reemplazar', 'guc-pdf-replace');
      const $d = mkBtn('Eliminar', 'guc-pdf-delete');
      menu.append($v,$r,$d);
      $('body').append(menu);
      const off = $anchor.offset(); const h = $anchor.outerHeight();
      menu.css({left: off.left, top: off.top + h + 6});
      setTimeout(function(){
        $(document).one('mousedown.gucPdfMenu', function(e){
          if ($(e.target).closest('.guc-pdf-menu, .guc-pdf').length) return;
          $('.guc-pdf-menu').remove();
        });
      }, 0);
      return menu;
    }

    $(document).on('click', '.guc-pdf', function(){
      const $btn = $(this);
      const $row = $btn.closest('tr');
      const rowId = $row.data('row-id'); if(!rowId) return;
      let section = $btn.data('section');
      if(!section){
        const $wrap = $btn.closest('.guc-subtable-wrap');
        const secKey = $wrap.data('section');
        if (secKey === 'secretaria') section = $wrap.attr('data-bucket') || 'sec_general';
        else section = (secKey === 'pre') ? 'pre' : 'arb';
      }
      const menu = buildPdfMenu($btn);

      menu.off('click', '.guc-pdf-view').on('click', '.guc-pdf-view', function(){
        // attempt to get current URL
        $.post(GUC_CASOS.ajax, { action:'guc_get_section_row', nonce:GUC_CASOS.nonce, section, row_id: rowId }, function(res){
          if (res && res.success && res.data && res.data.pdf_url){ window.open(res.data.pdf_url, '_blank'); }
          else alert('No hay PDF para esta fila.');
          $('.guc-pdf-menu').remove();
        }, 'json').fail(function(){ alert('Error de conexión'); $('.guc-pdf-menu').remove(); });
      });

      menu.off('click', '.guc-pdf-replace').on('click', '.guc-pdf-replace', function(){
        const $input = $('<input type="file" accept="application/pdf" style="display:none">').appendTo('body');
        $input.on('change', function(){
          if (!this.files || !this.files[0]) { $input.remove(); $('.guc-pdf-menu').remove(); return; }
          const fd = new FormData();
          fd.append('action','guc_upload_pdf'); fd.append('nonce', GUC_CASOS.nonce);
          fd.append('section', section); fd.append('row_id', rowId); fd.append('file', this.files[0]);
          $.ajax({ url: GUC_CASOS.ajax, type:'POST', data: fd, contentType:false, processData:false, dataType:'json' })
          .done(function(res){
            if(res && res.success){
              // refresh only this wrap
              const $wrap = $btn.closest('.guc-subtable-wrap');
              renderSection($wrap);
            } else alert(res?.data?.message || 'No se pudo subir el PDF');
          }).fail(function(){ alert('Error de conexión'); })
          .always(function(){ $input.remove(); $('.guc-pdf-menu').remove(); });
        }).trigger('click');
      });

      menu.off('click', '.guc-pdf-delete').on('click', '.guc-pdf-delete', function(){
        if(!confirm('¿Eliminar el PDF de esta fila?')) { $('.guc-pdf-menu').remove(); return; }
        $.post(GUC_CASOS.ajax, { action:'guc_clear_pdf', nonce:GUC_CASOS.nonce, section, row_id: rowId }, function(res){
          if (res && res.success){
            const $wrap = $btn.closest('.guc-subtable-wrap');
            renderSection($wrap);
          } else alert(res?.data?.message || 'No se pudo eliminar el PDF');
          $('.guc-pdf-menu').remove();
        }, 'json').fail(function(){ alert('Error de conexión'); $('.guc-pdf-menu').remove(); });
      });
    });


    /* ==========================================================
     *  Carga inicial de tabla de casos
     * ========================================================== */
    loadTable();
  });

})(jQuery);
