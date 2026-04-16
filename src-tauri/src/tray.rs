use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

/// Shared flag: when true, ExitRequested / CloseRequested will NOT be intercepted.
static SHOULD_EXIT: AtomicBool = AtomicBool::new(false);

/// Returns true if the app should actually exit (user chose "Quit" from tray).
pub fn should_exit() -> bool {
    SHOULD_EXIT.load(Ordering::SeqCst)
}

// ---------------------------------------------------------------------------
// macOS: Swizzle -[NSApplication terminate:] to intercept Cmd+Q / dock Quit.
//
// On macOS, Cmd+Q calls [NSApp terminate:] which bypasses Tao's event loop
// entirely — no CloseRequested or ExitRequested events fire. We replace
// terminate: at the ObjC runtime level so we can hide the window and keep
// the background service alive instead of letting macOS kill the process.
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
mod macos_exit {
    use objc::runtime::{
        class_getInstanceMethod, method_setImplementation, Class, Imp, Object, Sel,
    };
    use std::sync::OnceLock;

    /// Original -[NSApplication terminate:] implementation, saved during swizzle.
    static ORIGINAL_IMP: OnceLock<Imp> = OnceLock::new();

    /// Replacement for -[NSApplication terminate:].
    ///
    /// When `should_exit()` is false (Cmd+Q or dock Quit), we intercept and
    /// instead hide all windows + switch to accessory mode so the background
    /// service (scheduler + REST API) keeps running.
    ///
    /// When `should_exit()` is true (tray "Quit JobDex"), we forward to the
    /// original implementation to let the app exit normally.
    extern "C" fn swizzled_terminate(this: *mut Object, _cmd: Sel, sender: *mut Object) {
        if !super::should_exit() {
            // Prevent termination — hide all windows. Stay in Regular mode so
            // the dock icon remains visible and the user can click it to reopen.
            unsafe {
                let app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
                let windows: *mut Object = msg_send![app, windows];
                let count: usize = msg_send![windows, count];
                for i in 0..count {
                    let window: *mut Object = msg_send![windows, objectAtIndex: i];
                    let _: () = msg_send![window, orderOut: std::ptr::null_mut::<Object>()];
                }
            }
        } else {
            // User explicitly chose "Quit JobDex" from tray — proceed with termination.
            if let Some(original) = ORIGINAL_IMP.get() {
                unsafe {
                    let original_fn: unsafe extern "C" fn(*mut Object, Sel, *mut Object) =
                        std::mem::transmute(*original);
                    original_fn(this, _cmd, sender);
                }
            }
        }
    }

    /// Install the terminate: swizzle. Call once during app setup.
    pub fn install() {
        unsafe {
            let cls = Class::get("NSApplication").expect("NSApplication class not found");
            let sel = Sel::register("terminate:");

            // Get the existing method and save its implementation.
            let method = class_getInstanceMethod(cls as *const Class as *mut _, sel) as *mut _;
            let new_imp: Imp = std::mem::transmute(swizzled_terminate as *const ());
            let original_imp = method_setImplementation(method, new_imp);
            let _ = ORIGINAL_IMP.set(original_imp);
        }
    }
}

#[cfg(target_os = "macos")]
pub use macos_exit::install as install_terminate_swizzle;

/// Build and attach the system tray icon + menu.
/// Call this once inside `.setup()`.
pub fn setup(app: &AppHandle) -> Result<(), tauri::Error> {
    let show = MenuItemBuilder::with_id("show", "Show JobDex").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit JobDex").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&show)
        .separator()
        .item(&quit)
        .build()?;

    let icon =
        Image::from_bytes(include_bytes!("../icons/tray-icon.png")).expect("bundled tray icon");

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(true)
        .menu(&menu)
        .tooltip("JobDex")
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => {
                show_main_window(app);
            }
            "quit" => {
                SHOULD_EXIT.store(true, Ordering::SeqCst);
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click {
                button: tauri::tray::MouseButton::Left,
                button_state: tauri::tray::MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

pub fn show_main_window(app: &AppHandle) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
