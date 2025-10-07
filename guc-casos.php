
<?php
/**
 * Plugin Name: GUC Casos (v1.6.0)
 * Description: Gestión de Casos con subtables por sección y columna ACCIONES. case_type inmutable y un caso por usuario.
 * Version:     1.6.0
 */
if (!defined('ABSPATH')) exit;

final class GUC_Casos_Compact {
  const VERSION = '1.6.0';
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
    add_shortcode('gestion_casos', [$this,'shortcode']);

    $ax = [
      'guc_list_cases','guc_list_users','guc_create_case','guc_get_case','guc_update_case','guc_delete_case',
      'guc_create_case_event','guc_secretaria_title','guc_list_section','guc_create_section_action',
      'guc_get_section_row','guc_update_section_row','guc_delete_section_row','guc_upload_pdf','guc_clear_pdf'
    ];
    foreach($ax as $a){
      add_action("wp_ajax_$a", [$this,$a]);
      add_action("wp_ajax_nopriv_$a", [$this,$a]);
    }
  }

  function assets(){
    $base = plugin_dir_url(__FILE__);
    wp_register_style ('guc-casos', $base.'assets/guc-casos.css', [], self::VERSION);
    wp_register_script('guc-casos', $base.'assets/guc-casos.js', ['jquery'], self::VERSION, true);
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
          <button id="guc-cancel" class="guc-btn">Cancelar</button>
          <button id="guc-save"   class="guc-btn guc-btn-primary">Guardar</button>
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
          </form>
        </div>
        <div class="guc-modal-footer">
          <button id="guc-cancel-start" class="guc-btn">Cancelar</button>
          <button id="guc-save-start" class="guc-btn guc-btn-primary">Guardar</button>
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
      $has_events = intval($wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$this->t_events} WHERE case_id=%d",$r->id))) > 0;
      $hist_btn = $has_events ? 'Agregar acción' : 'Iniciar caso';

      echo '<tr data-id="'.intval($r->id).'">';
      echo "<td>{$exp}</td><td>{$ent}</td><td>{$nom}</td><td>{$usr}</td>";
      echo '<td><button class="guc-btn guc-btn-secondary guc-start" data-id="'.intval($r->id).'">'.$hist_btn.'</button></td>';
      echo '<td>';
      echo ' <div class="guc-actions" style="display:inline-block">';
      echo '   <button class="guc-act guc-view" data-id="'.intval($r->id).'">👁</button>';
      echo '   <button class="guc-act guc-edit" data-id="'.intval($r->id).'">✎</button>';
      echo '   <button class="guc-act guc-del"  data-id="'.intval($r->id).'" onclick="return confirm(\'¿Eliminar este caso?\')">🗑</button>';
      echo ' </div>';
      echo '</td></tr>';
    }
    $html = ob_get_clean();
    wp_send_json_success(['html'=>$html]);
  }

  public function guc_list_users(){
    $this->check_nonce(); global $wpdb;
    $rows = $wpdb->get_results("SELECT u.* FROM {$this->t_users} u WHERE NOT EXISTS (SELECT 1 FROM {$this->t_cases} c WHERE c.user_id=u.id) ORDER BY u.id DESC");
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
        echo '<tr data-row-id="'.intval($r->id).'">';
        echo '<td>'.$i++.'</td><td>'.$sit.'</td><td>'.$fecha.'</td><td>'.$mot.'</td>';
        echo '<td class="guc-actions">';
        if($pdf){
          echo '<a class="guc-ico guc-ico-pdf" target="_blank" rel="noopener" href="'.$pdf.'" title="Ver PDF">📄</a>';
          echo ' <button class="guc-ico guc-ico-replace guc-upload" data-section="'.esc_attr($section).'" title="Reemplazar PDF">⤴</button>';
          echo ' <button class="guc-ico guc-ico-clear guc-clear-pdf" data-section="'.esc_attr($section).'" title="Quitar PDF">✕</button>';
        }else{
          echo '<button class="guc-ico guc-ico-upload guc-upload" data-section="'.esc_attr($section).'" title="Subir PDF">⤴</button>';
        }
        echo ' <button class="guc-ico guc-ico-edit guc-row-edit" data-section="'.esc_attr($section).'" title="Editar">✎</button>';
        echo ' <button class="guc-ico guc-ico-del guc-row-del" data-section="'.esc_attr($section).'" title="Eliminar">🗑</button>';
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
