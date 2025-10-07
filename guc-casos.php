
<?php
/**
 * Plugin Name: GUC Casos (v1.6.4)
 * Description: Gestión de Casos con subtables por sección y columna ACCIONES. case_type inmutable y un caso por usuario.
 * Version:     1.6.4
 */
if (!defined('ABSPATH')) exit;

final class GUC_Casos_Compact {
  const VERSION = '1.6.4';
  private static $inst = null;
  public static function instance(){ return self::$inst ?: self::$inst = new self(); }

  private $t_cases;
  private $t_users;
  private $t_events;
  private $t_pre;
  private $t_arb;
  private $t_sec_arbitral;
  private $t_sec_general;

  private function __construct(){
    global $wpdb;
    $this->t_cases        = $wpdb->prefix.'guc_cases';
    $this->t_users        = $wpdb->prefix.'guc_users';
    $this->t_events       = $wpdb->prefix.'guc_case_events';
    $this->t_pre          = $wpdb->prefix.'guc_pre_actions';
    $this->t_arb          = $wpdb->prefix.'guc_arbitral_actions';
    $this->t_sec_arbitral = $wpdb->prefix.'guc_secretaria_arbitral_actions';
    $this->t_sec_general  = $wpdb->prefix.'guc_secretaria_general_actions';

    add_action('init', [$this,'assets']);
    add_action('plugins_loaded', [$this,'maybe_upgrade_schema']);
    add_shortcode('gestion_casos', [$this,'shortcode']);

    $ax = [
      'guc_list_cases','guc_list_users','guc_create_case','guc_get_case','guc_update_case','guc_delete_case',
      'guc_update_case_status',
      'guc_create_case_event','guc_secretaria_title','guc_list_section','guc_create_section_action',
      'guc_get_section_row','guc_update_section_row','guc_delete_section_row','guc_upload_pdf','guc_clear_pdf'
    ];
    foreach($ax as $a){
      add_action("wp_ajax_$a", [$this,$a]);
      add_action("wp_ajax_nopriv_$a", [$this,$a]);
    }
  }

  public function maybe_upgrade_schema(){
    global $wpdb;
    $table = $this->t_cases;
    if (!$table) return;
    $columns = $wpdb->get_col("SHOW COLUMNS FROM `$table`");
    if (!is_array($columns)) return;

    if (!in_array('estado', $columns, true)) {
      $wpdb->query("ALTER TABLE `$table` ADD `estado` varchar(50) DEFAULT '' AFTER `descripcion`");
    }
    if (!in_array('estado_fecha', $columns, true)) {
      $wpdb->query("ALTER TABLE `$table` ADD `estado_fecha` datetime NULL DEFAULT NULL AFTER `estado`");
    }
  }

  function assets(){
    $base = plugin_dir_url(__FILE__);
    $path = plugin_dir_path(__FILE__);

    $css_ver = self::VERSION;
    $js_ver  = self::VERSION;

    $css_path = $path.'assets/guc-casos.css';
    $js_path  = $path.'assets/guc-casos.js';

    if (file_exists($css_path)) {
      $css_ver .= '.'.filemtime($css_path);
    }
    if (file_exists($js_path)) {
      $js_ver .= '.'.filemtime($js_path);
    }

    wp_register_style ('guc-casos', $base.'assets/guc-casos.css', [], $css_ver);
    wp_register_script('guc-casos', $base.'assets/guc-casos.js', ['jquery'], $js_ver, true);
    wp_localize_script('guc-casos','GUC_CASOS',[
      'ajax'=>admin_url('admin-ajax.php'),
      'nonce'=>wp_create_nonce('guc_casos_nonce'),
    ]);
  }

  function shortcode(){
    wp_enqueue_style('guc-casos'); wp_enqueue_script('guc-casos');
    ob_start(); ?>
    <div id="guc-casos" class="guc-wrap">
      <div class="guc-header">
        <h2 class="guc-title">Gestión de Casos</h2>
        <button id="guc-open-modal" class="guc-btn guc-btn-primary"><span class="guc-icon">＋</span>Nuevo caso</button>
      </div>
      <div class="guc-card">
        <table class="guc-table">
          <thead><tr>
            <th>EXPEDIENTE</th>
            <th>ENTIDAD</th>
            <th>NOMENCLATURA</th>
            <th>USUARIO ASIGNADO</th>
            <th>HISTORIAL</th>
            <th>ACCIONES</th>
          </tr></thead>
          <tbody id="guc-cases-table"><tr><td colspan="6" class="guc-empty">Cargando…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- Modal crear/editar -->
    <div id="guc-modal" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="guc-modal-dialog">
        <div class="guc-modal-header">
          <h3 id="guc-modal-title">Crear nuevo caso</h3>
          <button type="button" class="guc-modal-close">✕</button>
        </div>
        <div class="guc-modal-body">
          <form id="guc-form-caso">
            <input type="hidden" name="id">
            <div class="guc-row">
              <div class="guc-col guc-field">
                <label>Asignar Usuario</label>
                <select id="guc-user-select" name="user_id" required></select>
                <span class="guc-help">Solo aparecen usuarios sin caso.</span>
              </div>
              <div class="guc-col guc-field">
                <label>Tipo de Caso</label>
                <select name="case_type" required>
                  <option value="">— Selecciona —</option>
                  <option value="TAR">TAR</option>
                  <option value="JPRD">JPRD</option>
                </select>
              </div>
            </div>
            <div class="guc-row">
              <div class="guc-col guc-field">
                <label>Expediente</label>
                <input type="text" name="expediente" required>
              </div>
              <div class="guc-col guc-field">
                <label>Entidad Convocante</label>
                <input type="text" name="entidad" required>
              </div>
            </div>
            <div class="guc-row">
              <div class="guc-col guc-field">
                <label>Nomenclatura</label>
                <input type="text" name="nomenclatura">
              </div>
              <div class="guc-col guc-field">
                <label>N° de Convocatoria</label>
                <input type="text" name="convocatoria">
              </div>
            </div>
            <div class="guc-row">
              <div class="guc-col guc-field">
                <label>Objeto de Contratación</label>
                <input type="text" name="objeto">
              </div>
              <div class="guc-col"></div>
            </div>
            <div class="guc-field">
              <label>Descripción del Objeto</label>
              <textarea name="descripcion"></textarea>
            </div>
          </form>
        </div>
        <div class="guc-modal-footer">
          <button type="button" id="guc-cancel" class="guc-btn">Cancelar</button>
          <button type="button" id="guc-save"   class="guc-btn guc-btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal iniciar/agregar acción -->
    <div id="guc-modal-start" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="guc-modal-dialog">
        <div class="guc-modal-header">
          <h3>Registrar acción</h3>
          <button type="button" class="guc-modal-close">✕</button>
        </div>
        <div class="guc-modal-body">
          <form id="guc-form-inicio">
            <input type="hidden" name="case_id">
            <div class="guc-row">
              <div class="guc-col guc-field">
                <label>Situación</label>
                <input type="text" name="situacion" required>
              </div>
              <div class="guc-col guc-field">
                <label>Fecha y Hora</label>
                <input type="datetime-local" name="fecha" required>
              </div>
            </div>
            <div class="guc-field">
              <label>Motivo</label>
              <textarea name="motivo" required></textarea>
            </div>
            <div class="guc-field guc-field-pdf guc-hidden" id="guc-action-pdf" aria-hidden="true" data-has-pdf="0">
              <label>PDF</label>
              <div class="guc-pdf-card">
                <div class="guc-pdf-meta">
                  <span class="guc-pdf-name" id="guc-action-pdf-name">Sin archivo adjunto</span>
                  <a href="#" target="_blank" rel="noopener" class="guc-pdf-link" id="guc-action-pdf-open" hidden>Ver documento</a>
                </div>
                <div class="guc-pdf-buttons">
                  <button type="button" class="guc-ico guc-ico-upload" id="guc-action-pdf-upload" aria-label="Subir o reemplazar PDF"></button>
                  <button type="button" class="guc-ico guc-ico-del" id="guc-action-pdf-delete" aria-label="Eliminar PDF" disabled></button>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div class="guc-modal-footer">
          <button type="button" id="guc-cancel-start" class="guc-btn">Cancelar</button>
          <button type="button" id="guc-save-start" class="guc-btn guc-btn-primary">Guardar</button>
        </div>
        </div>
      </div>
    </div>

    <!-- Modal estado del caso -->
    <div id="guc-modal-status" role="dialog" aria-modal="true" aria-hidden="true">
      <div class="guc-modal-dialog">
        <div class="guc-modal-header">
          <h3>Estado del caso</h3>
          <button type="button" class="guc-modal-close">✕</button>
        </div>
        <div class="guc-modal-body">
          <form id="guc-form-status">
            <input type="hidden" name="case_id">
            <div class="guc-modal-status-grid">
              <div class="guc-field">
                <label>Estado</label>
                <select name="estado" required>
                  <option value="">-Selecciona un estado-</option>
                  <option value="Inicio">Inicio</option>
                  <option value="En proceso">En proceso</option>
                  <option value="Terminado">Terminado</option>
                </select>
              </div>
              <div class="guc-field">
                <label>Fecha y Hora</label>
                <input type="datetime-local" name="estado_fecha">
              </div>
            </div>
          </form>
        </div>
        <div class="guc-modal-footer">
          <button type="button" id="guc-cancel-status" class="guc-btn">Cancelar</button>
          <button type="button" id="guc-save-status" class="guc-btn guc-btn-primary">Guardar</button>
        </div>
      </div>
    </div>

    <?php
    return ob_get_clean();
  }

  private function check_nonce(){
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'guc_casos_nonce')) wp_send_json_error(['message'=>'Nonce inválido']);
  }
  private function html_esc($s){ return esc_html($s ?? ''); }
  private function now(){ return current_time('mysql'); }

  // ===== Helpers =====
  private function pdf_column_for($table){
    global $wpdb;
    $cols = $wpdb->get_col("SHOW COLUMNS FROM `$table`");
    foreach(['pdf_url','pdf','file_url','attachment_url'] as $c) if (in_array($c,$cols,true)) return $c;
    return null;
  }

  private function case_has_actions($case_id){
    global $wpdb;
    $case_id = intval($case_id);
    if(!$case_id) return false;
    $tables = [$this->t_events, $this->t_pre, $this->t_arb, $this->t_sec_arbitral, $this->t_sec_general];
    foreach($tables as $t){
      if(!$t) continue;
      $count = intval($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM `$t` WHERE case_id=%d", $case_id)));
      if($count > 0) return true;
    }
    return false;
  }

  // ====== AJAX ======
  public function guc_list_cases(){
    $this->check_nonce(); global $wpdb;
    $rows = $wpdb->get_results("SELECT c.*, u.username FROM {$this->t_cases} c LEFT JOIN {$this->t_users} u ON u.id=c.user_id ORDER BY c.id DESC");
    ob_start();
    if (!$rows){ echo '<tr><td colspan="6" class="guc-empty">Sin casos.</td></tr>'; }
    else foreach($rows as $r){
      $exp = $this->html_esc($r->expediente);
      $ent = $this->html_esc($r->entidad);
      $nom = $this->html_esc($r->nomenclature);
      $usr = $this->html_esc($r->username);
      $has_actions = $this->case_has_actions($r->id);
      $hist_btn = $has_actions ? 'Agregar acción' : 'Iniciar caso';

      echo '<tr data-id="'.intval($r->id).'" data-has-actions="'.($has_actions ? '1' : '0').'">';
      echo "<td>{$exp}</td><td>{$ent}</td><td>{$nom}</td><td>{$usr}</td>";
      echo '<td><button class="guc-btn guc-btn-secondary guc-start" data-id="'.intval($r->id).'">'.$hist_btn.'</button></td>';
      echo '<td>';
      echo '  <div class="guc-actions">';
      echo '    <button type="button" class="guc-act guc-status" data-id="'.intval($r->id).'" aria-label="Actualizar estado del caso"><span class="guc-ico guc-ico-gear" aria-hidden="true"></span></button>';
      echo '    <button type="button" class="guc-act guc-view" data-id="'.intval($r->id).'" aria-label="Ver caso"><span class="guc-ico guc-ico-view" aria-hidden="true"></span></button>';
      echo '    <button type="button" class="guc-act guc-edit" data-id="'.intval($r->id).'" aria-label="Editar caso"><span class="guc-ico guc-ico-edit" aria-hidden="true"></span></button>';
      echo '    <button type="button" class="guc-act guc-del"  data-id="'.intval($r->id).'" aria-label="Eliminar caso" onclick="return confirm(\'¿Eliminar este caso?\')"><span class="guc-ico guc-ico-del" aria-hidden="true"></span></button>';
      echo '  </div>';
      echo '</td></tr>';
    }
    $html = ob_get_clean();
    wp_send_json_success(['html'=>$html]);
  }

  public function guc_list_users(){
    $this->check_nonce(); global $wpdb;
    $include_id = intval($_POST['include_id'] ?? 0);
    if ($include_id) {
      $sql = $wpdb->prepare(
        "SELECT u.* FROM {$this->t_users} u WHERE NOT EXISTS (SELECT 1 FROM {$this->t_cases} c WHERE c.user_id=u.id) OR u.id=%d ORDER BY u.id DESC",
        $include_id
      );
    } else {
      $sql = "SELECT u.* FROM {$this->t_users} u WHERE NOT EXISTS (SELECT 1 FROM {$this->t_cases} c WHERE c.user_id=u.id) ORDER BY u.id DESC";
    }
    $rows = $wpdb->get_results($sql);
    $out = [];
    foreach($rows as $r){
      $out[] = ['id'=>intval($r->id),'username'=>$r->username,'entity'=>$r->entity,'expediente'=>$r->expediente];
    }
    wp_send_json_success($out);
  }

  public function guc_create_case(){
    $this->check_nonce(); global $wpdb;
    $data = isset($_POST['data']) ? (array) $_POST['data'] : [];
    $user_id = intval($data['user_id'] ?? 0);
    if (!$user_id) wp_send_json_error(['message'=>'Usuario requerido']);

    // 1 caso por usuario
    $has = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->t_cases} WHERE user_id=%d",$user_id));
    if($has>0) wp_send_json_error(['message'=>'Este usuario ya tiene un caso.']);

    // datos del usuario
    $u = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->t_users} WHERE id=%d",$user_id));
    if(!$u) wp_send_json_error(['message'=>'Usuario no encontrado.']);

    $insert = [
      'nomenclature' => sanitize_text_field($data['nomenclatura'] ?? ''),
      'convocatoria' => sanitize_text_field($data['convocatoria'] ?? ''),
      'expediente'   => $u->expediente,
      'entidad'      => $u->entity,
      'objeto'       => sanitize_text_field($data['objeto'] ?? ''),
      'descripcion'  => sanitize_textarea_field($data['descripcion'] ?? ''),
      'estado'       => '',
      'estado_fecha' => null,
      'user_id'      => $user_id,
      'username'     => $u->username,
      'case_type'    => sanitize_text_field($data['case_type'] ?? ''),
      'created_at'   => $this->now(),
    ];
    if(!$insert['case_type']) wp_send_json_error(['message'=>'Selecciona el tipo de caso.']);

    $ok = $wpdb->insert($this->t_cases,$insert);
    if(!$ok) wp_send_json_error(['message'=>'No se pudo crear el caso']);
    wp_send_json_success(['id'=>$wpdb->insert_id]);
  }

  public function guc_get_case(){
    $this->check_nonce(); global $wpdb;
    $id = intval($_POST['id'] ?? 0);
    $r = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->t_cases} WHERE id=%d",$id), ARRAY_A);
    if(!$r) wp_send_json_error(['message'=>'No encontrado']);
    wp_send_json_success($r);
  }

  public function guc_update_case(){
    $this->check_nonce(); global $wpdb;
    $data = isset($_POST['data']) ? (array) $_POST['data'] : [];
    $id = intval($data['id'] ?? 0);
    if(!$id) wp_send_json_error(['message'=>'ID inválido']);

    $current = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->t_cases} WHERE id=%d",$id));
    if(!$current) wp_send_json_error(['message'=>'Caso no encontrado']);

    // case_type inmutable
    $incoming = sanitize_text_field($data['case_type'] ?? '');
    if($incoming && $incoming !== $current->case_type){
      wp_send_json_error(['message'=>'El tipo de caso no se puede cambiar.']);
    }

    // expediente/entidad siempre desde usuario
    $u = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->t_users} WHERE id=%d",$current->user_id));
    $upd = [
      'nomenclature' => sanitize_text_field($data['nomenclatura'] ?? $current->nomenclature),
      'convocatoria' => sanitize_text_field($data['convocatoria'] ?? $current->convocatoria),
      'expediente'   => $u ? $u->expediente : $current->expediente,
      'entidad'      => $u ? $u->entity     : $current->entidad,
      'objeto'       => sanitize_text_field($data['objeto'] ?? $current->objeto),
      'descripcion'  => sanitize_textarea_field($data['descripcion'] ?? $current->descripcion),
    ];
    $ok = $wpdb->update($this->t_cases,$upd,['id'=>$id]);
    if($ok===false) wp_send_json_error(['message'=>'No se pudo actualizar']);
    wp_send_json_success(['id'=>$id]);
  }

  public function guc_update_case_status(){
    $this->check_nonce(); global $wpdb;
    $data = isset($_POST['data']) ? (array) $_POST['data'] : [];
    $id = intval($data['case_id'] ?? 0);
    if(!$id) wp_send_json_error(['message'=>'ID inválido']);

    $estado = sanitize_text_field($data['estado'] ?? '');
    $allowed = ['Inicio','En proceso','Terminado'];
    if(!$estado || !in_array($estado, $allowed, true)){
      wp_send_json_error(['message'=>'Selecciona un estado válido']);
    }

    $exists = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->t_cases} WHERE id=%d", $id));
    if(!$exists){
      wp_send_json_error(['message'=>'Caso no encontrado']);
    }

    $fecha_in = sanitize_text_field($data['estado_fecha'] ?? '');
    $fecha_db = null;
    if($fecha_in){
      $candidate = str_replace('T',' ',$fecha_in);
      $ts = strtotime($candidate);
      if($ts){
        $fecha_db = date('Y-m-d H:i:s', $ts);
      }
    }

    $upd = ['estado'=>$estado, 'estado_fecha'=>$fecha_db];

    $ok = $wpdb->update($this->t_cases, $upd, ['id'=>$id]);
    if($ok===false) wp_send_json_error(['message'=>'No se pudo guardar el estado']);

    wp_send_json_success(['id'=>$id,'estado'=>$estado,'estado_fecha'=>$upd['estado_fecha']]);
  }

  public function guc_delete_case(){
    $this->check_nonce(); global $wpdb;
    $id = intval($_POST['id'] ?? 0);
    if(!$id) wp_send_json_error(['message'=>'ID inválido']);
    $wpdb->delete($this->t_cases,['id'=>$id]);
    wp_send_json_success();
  }

  public function guc_create_case_event(){
    $this->check_nonce(); global $wpdb;
    $data = isset($_POST['data']) ? (array) $_POST['data'] : [];
    $case_id = intval($data['case_id'] ?? 0);
    if(!$case_id) wp_send_json_error(['message'=>'Caso inválido']);

    $case = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$this->t_cases} WHERE id=%d",$case_id));
    if(!$case) wp_send_json_error(['message'=>'Caso no encontrado']);

    $ins = [
      'case_id'   => $case_id,
      'situacion' => sanitize_text_field($data['situacion'] ?? ''),
      'motivo'    => sanitize_textarea_field($data['motivo'] ?? ''),
      'tipo'      => $case->case_type, // hereda el tipo del caso
      'fecha'     => sanitize_text_field($data['fecha'] ?? $this->now()),
      'created_by'=> get_current_user_id(),
      'created_at'=> $this->now(),
    ];
    if(!$ins['situacion'] || !$ins['motivo']) wp_send_json_error(['message'=>'Completa los campos.']);
    $ok = $wpdb->insert($this->t_events,$ins);
    if(!$ok) wp_send_json_error(['message'=>'No se pudo registrar la acción']);
    wp_send_json_success(['id'=>$wpdb->insert_id]);
  }

  public function guc_secretaria_title(){
    $this->check_nonce(); global $wpdb;
    $id = intval($_POST['case_id'] ?? 0);
    $case = $wpdb->get_row($wpdb->prepare("SELECT case_type FROM {$this->t_cases} WHERE id=%d",$id));
    if(!$case) wp_send_json_error(['message'=>'Caso no encontrado']);
    $bucket = ($case->case_type==='TAR') ? 'sec_arbitral' : 'sec_general';
    $title  = ($bucket==='sec_arbitral') ? 'Secretaría Arbitral' : 'Secretaría General';
    wp_send_json_success(['bucket'=>$bucket,'title'=>$title]);
  }

  private function table_for_section($section){
    switch($section){
      case 'pre': return $this->t_pre;
      case 'arb': return $this->t_arb;
      case 'sec_arbitral': return $this->t_sec_arbitral;
      case 'sec_general': return $this->t_sec_general;
      default: return null;
    }
  }

  public function guc_list_section(){
    $this->check_nonce(); global $wpdb;
    $case_id = intval($_POST['case_id'] ?? 0);
    $section = sanitize_text_field($_POST['section'] ?? '');
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);

    $rows = $wpdb->get_results($wpdb->prepare("SELECT * FROM `$table` WHERE case_id=%d ORDER BY id DESC",$case_id));
    ob_start();
    echo '<table class="guc-subtable guc-subtable-compact"><thead><tr>';
    echo '<th style="width:56px">NRO</th><th>SITUACIÓN</th><th>FECHA Y HORA</th><th>MOTIVO</th><th style="width:210px">ACCIONES</th>';
    echo '</tr></thead><tbody>';
    if(!$rows){
      echo '<tr><td colspan="5" class="guc-empty">Sin registros.</td></tr>';
    } else {
      $i=1;
      $pdf_col = $this->pdf_column_for($table);
      foreach($rows as $r){
        $fecha = $this->html_esc($r->fecha);
        $sit   = $this->html_esc($r->situacion);
        $mot   = $this->html_esc($r->motivo);
        $pdf   = ($pdf_col && !empty($r->$pdf_col)) ? esc_url($r->$pdf_col) : '';
        $row_id = intval($r->id);
        $case_attr = ' data-case-id="'.intval($case_id).'"';
        echo '<tr data-row-id="'.$row_id.'"'.$case_attr.'>';
        echo '<td>'.$i++.'</td><td>'.$sit.'</td><td>'.$fecha.'</td><td>'.$mot.'</td>';
        echo '<td class="guc-actions">';
        $has_pdf_attr = $pdf ? ' data-has-pdf="1"' : ' data-has-pdf="0"';
        $pdf_btn_classes = 'guc-ico guc-ico-upload guc-upload'.($pdf ? ' has-pdf' : '');
        $pdf_label = $pdf ? 'Reemplazar PDF' : 'Subir PDF';
        $button = '<button type="button" class="'.esc_attr($pdf_btn_classes).'" data-section="'.esc_attr($section).'"'.$has_pdf_attr.' aria-label="'.esc_attr($pdf_label).'"';
        if ($pdf) {
          $button .= ' data-pdf-url="'.$pdf.'"';
        }
        $button .= '></button>';
        echo $button;
        echo ' <button type="button" class="guc-ico guc-ico-edit guc-row-edit" data-section="'.esc_attr($section).'" aria-label="Editar acción"></button>';
        echo ' <button type="button" class="guc-ico guc-ico-del guc-row-del" data-section="'.esc_attr($section).'" aria-label="Eliminar acción"></button>';
        echo '</td></tr>';
      }
    }
    echo '</tbody></table>';
    echo '<div class="guc-subtable-footer"><button class="guc-btn guc-btn-primary guc-add-action" data-section="'.esc_attr($section).'" data-case-id="'.intval($case_id).'">Agregar acción</button></div>';
    $html = ob_get_clean();
    wp_send_json_success(['html'=>$html]);
  }

  public function guc_create_section_action(){
    $this->check_nonce(); global $wpdb;
    $section = sanitize_text_field($_POST['section'] ?? '');
    $case_id = intval($_POST['case_id'] ?? 0);
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);

    $d = isset($_POST['data']) ? (array) $_POST['data'] : [];
    $ins = [
      'case_id'=>$case_id,
      'situacion'=>sanitize_text_field($d['situacion'] ?? ''),
      'motivo'=>sanitize_textarea_field($d['motivo'] ?? ''),
      'fecha'=>sanitize_text_field($d['fecha'] ?? $this->now()),
      'created_by'=>get_current_user_id(),
      'created_at'=>$this->now(),
    ];
    if(!$ins['situacion'] || !$ins['motivo']) wp_send_json_error(['message'=>'Completa los campos.']);
    $ok = $wpdb->insert($table,$ins);
    if(!$ok) wp_send_json_error(['message'=>'No se pudo guardar']);
    wp_send_json_success(['id'=>$wpdb->insert_id]);
  }

  public function guc_get_section_row(){
    $this->check_nonce(); global $wpdb;
    $section = sanitize_text_field($_POST['section'] ?? '');
    $row_id = intval($_POST['row_id'] ?? 0);
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);
    $r = $wpdb->get_row($wpdb->prepare("SELECT * FROM `$table` WHERE id=%d",$row_id), ARRAY_A);
    if(!$r) wp_send_json_error(['message'=>'No encontrado']);
    wp_send_json_success($r);
  }

  public function guc_update_section_row(){
    $this->check_nonce(); global $wpdb;
    $section = sanitize_text_field($_POST['section'] ?? '');
    $row_id = intval($_POST['row_id'] ?? 0);
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);
    $d = isset($_POST['data']) ? (array) $_POST['data'] : [];
    $upd = [
      'situacion'=>sanitize_text_field($d['situacion'] ?? ''),
      'motivo'=>sanitize_textarea_field($d['motivo'] ?? ''),
      'fecha'=>sanitize_text_field($d['fecha'] ?? ''),
    ];
    $ok = $wpdb->update($table,$upd,['id'=>$row_id]);
    if($ok===false) wp_send_json_error(['message'=>'No se pudo actualizar']);
    wp_send_json_success();
  }

  public function guc_delete_section_row(){
    $this->check_nonce(); global $wpdb;
    $section = sanitize_text_field($_POST['section'] ?? '');
    $row_id = intval($_POST['row_id'] ?? 0);
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);
    $wpdb->delete($table,['id'=>$row_id]);
    wp_send_json_success();
  }

  public function guc_upload_pdf(){
    $this->check_nonce(); 
    $section = sanitize_text_field($_POST['section'] ?? '');
    $row_id  = intval($_POST['row_id'] ?? 0);
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);
    if(empty($_FILES['file'])) wp_send_json_error(['message'=>'Archivo no recibido']);

    $file = $_FILES['file'];
    if($file['error'] !== UPLOAD_ERR_OK) wp_send_json_error(['message'=>'Error de subida']);
    $type = $file['type'] ?? '';
    if($type !== 'application/pdf') wp_send_json_error(['message'=>'Solo PDF']);

    require_once ABSPATH.'wp-admin/includes/file.php';
    require_once ABSPATH.'wp-admin/includes/media.php';
    require_once ABSPATH.'wp-admin/includes/image.php';

    $aid = media_handle_upload('file', 0);
    if(is_wp_error($aid)) wp_send_json_error(['message'=>'No se pudo adjuntar']);
    $url = wp_get_attachment_url($aid);

    global $wpdb;
    $col = $this->pdf_column_for($table);
    if($col){
      $wpdb->update($table, [$col=>$url], ['id'=>$row_id]);
    }
    wp_send_json_success(['pdf_url'=>$url,'attachment_id'=>$aid]);
  }

  public function guc_clear_pdf(){
    $this->check_nonce(); global $wpdb;
    $section = sanitize_text_field($_POST['section'] ?? '');
    $row_id  = intval($_POST['row_id'] ?? 0);
    $table = $this->table_for_section($section);
    if(!$table) wp_send_json_error(['message'=>'Sección inválida']);
    $col = $this->pdf_column_for($table);
    if(!$col) wp_send_json_error(['message'=>'No existe columna de PDF en esta tabla']);
    $wpdb->update($table, [$col=>null], ['id'=>$row_id]);
    wp_send_json_success();
  }
}
GUC_Casos_Compact::instance();
