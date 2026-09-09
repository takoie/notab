use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Open (or focus) a small always-on-top popup window bound to a note or tab.
#[tauri::command]
async fn open_pinned_window(
  app: tauri::AppHandle,
  kind: String,
  id: String,
  title: String,
  x: Option<f64>,
  y: Option<f64>,
  width: Option<f64>,
  height: Option<f64>,
) -> Result<(), String> {
  if kind != "note" && kind != "tab" && kind != "board" {
    return Err("invalid kind".into());
  }
  let label = pin_label(&kind, &id);

  if let Some(win) = app.get_webview_window(&label) {
    let _ = win.unminimize();
    let _ = win.set_focus();
    return Ok(());
  }

  let url = format!(
    "index.html?window=pin&kind={}&id={}",
    urlencode(&kind),
    urlencode(&id)
  );

  let (def_w, def_h) = if kind == "board" {
    (380.0, 520.0)
  } else {
    (300.0, 380.0)
  };
  let mut builder = WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(url.into()))
    .title(title)
    .inner_size(width.unwrap_or(def_w), height.unwrap_or(def_h))
    .min_inner_size(240.0, 200.0)
    .always_on_top(true)
    .decorations(false)
    // keep a taskbar button so a minimised pin can be restored the normal way
    .skip_taskbar(false)
    .resizable(true)
    .shadow(true);

  if let (Some(x), Some(y)) = (x, y) {
    builder = builder.position(x, y);
  } else {
    builder = builder.center();
  }

  builder.build().map_err(|e| e.to_string())?;
  Ok(())
}

#[tauri::command]
async fn close_pinned_window(app: tauri::AppHandle, kind: String, id: String) -> Result<(), String> {
  let label = pin_label(&kind, &id);
  if let Some(win) = app.get_webview_window(&label) {
    win.close().map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn focus_main_window(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(win) = app.get_webview_window("main") {
    let _ = win.unminimize();
    let _ = win.set_focus();
  }
  Ok(())
}

fn pin_label(kind: &str, id: &str) -> String {
  let safe: String = id
    .chars()
    .map(|c| if c.is_ascii_alphanumeric() || c == '-' { c } else { '_' })
    .collect();
  format!("pin-{kind}-{safe}")
}

fn urlencode(s: &str) -> String {
  s.chars()
    .map(|c| match c {
      'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
      _ => format!("%{:02X}", c as u32),
    })
    .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  #[allow(unused_mut)]
  let mut builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_store::Builder::new().build());

  // The updater and window-state plugins are desktop-only. window-state
  // remembers each window's size/position across restarts; updater reads its
  // endpoints + pubkey from the `plugins.updater` block in tauri.conf.json.
  #[cfg(not(any(target_os = "android", target_os = "ios")))]
  {
    builder = builder
      .plugin(tauri_plugin_updater::Builder::new().build())
      .plugin(tauri_plugin_window_state::Builder::default().build());
  }

  builder
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_pinned_window,
      close_pinned_window,
      focus_main_window
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
