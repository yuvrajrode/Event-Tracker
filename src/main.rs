#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::thread;
use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop, EventLoopBuilder},
    window::WindowBuilder,
};
use tiny_http::{Header, Response, Server, StatusCode};
use wry::{WebContext, WebViewBuilder};

const HTML: &str = include_str!("../index.html");
const CSS: &str = include_str!("../styles.css");
const JS: &str = include_str!("../app.js");
const ICON: &str = include_str!("../icon.svg");

#[derive(Debug, Clone, Copy)]
enum CustomEvent {
    GlobalQuickAdd,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Embedded background HTTP server to guarantee full localStorage & web API access
    let mut server = None;
    let mut active_port = 49200;
    for p in 49200..49250 {
        let addr = format!("127.0.0.1:{}", p);
        if let Ok(s) = Server::http(&addr) {
            server = Some(s);
            active_port = p;
            break;
        }
    }

    let server = server.expect("Failed to bind local embedded server");
    let app_url = format!("http://127.0.0.1:{}", active_port);

    thread::spawn(move || {
        for request in server.incoming_requests() {
            let url_str = request.url().to_string();

            if url_str == "/" || url_str.starts_with("/?") || url_str.starts_with("/#") || url_str == "/index.html" {
                let mut response = Response::from_string(HTML);
                response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"text/html; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
            } else if url_str.starts_with("/styles.css") {
                let mut response = Response::from_string(CSS);
                response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"text/css; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
            } else if url_str.starts_with("/app.js") {
                let mut response = Response::from_string(JS);
                response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"application/javascript; charset=utf-8"[..]).unwrap());
                let _ = request.respond(response);
            } else if url_str.starts_with("/icon.svg") {
                let mut response = Response::from_string(ICON);
                response.add_header(Header::from_bytes(&b"Content-Type"[..], &b"image/svg+xml"[..]).unwrap());
                let _ = request.respond(response);
            } else {
                let response = Response::from_string("Not Found").with_status_code(StatusCode(404));
                let _ = request.respond(response);
            }
        }
    });

    // 2. Native Desktop Window & Event Loop with Custom Events
    let event_loop: EventLoop<CustomEvent> = EventLoopBuilder::with_user_event().build();

    let window = WindowBuilder::new()
        .with_title("Gather — Personal Moment & Event Tracker")
        .with_inner_size(LogicalSize::new(1280.0, 820.0))
        .with_min_inner_size(LogicalSize::new(960.0, 600.0))
        .build(&event_loop)?;

    // 3. Isolated persistent storage for Gather in %LOCALAPPDATA%\Gather\WebView2
    let data_dir = std::env::var("LOCALAPPDATA")
        .map(|l| std::path::PathBuf::from(l).join("Gather").join("WebView2"))
        .unwrap_or_else(|_| std::path::PathBuf::from("WebView2"));
    let _ = std::fs::create_dir_all(&data_dir);

    let mut web_context = WebContext::new(Some(data_dir));

    let webview = WebViewBuilder::new_with_web_context(&mut web_context)
        .with_url(&app_url)
        .build(&window)?;

    // 4. Windows Global Hotkey Listener Thread (Ctrl + Shift + G)
    #[cfg(target_os = "windows")]
    {
        let proxy = event_loop.create_proxy();
        thread::spawn(move || unsafe {
            use windows::Win32::Foundation::HWND;
            use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, MOD_CONTROL, MOD_SHIFT};
            use windows::Win32::UI::WindowsAndMessaging::{GetMessageW, MSG, WM_HOTKEY};

            // Register Ctrl + Shift + G (0x47 is ASCII for 'G')
            let _ = RegisterHotKey(None::<HWND>, 101, MOD_CONTROL | MOD_SHIFT, 0x47);

            let mut msg = MSG::default();
            while GetMessageW(&mut msg, None::<HWND>, 0, 0).as_bool() {
                if msg.message == WM_HOTKEY && msg.wParam.0 == 101 {
                    let _ = proxy.send_event(CustomEvent::GlobalQuickAdd);
                }
            }
        });
    }

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                *control_flow = ControlFlow::Exit;
            }
            Event::UserEvent(CustomEvent::GlobalQuickAdd) => {
                window.set_visible(true);
                window.set_minimized(false);
                window.set_focus();
                let _ = webview.evaluate_script("window.focusQuickAdd && window.focusQuickAdd();");
            }
            _ => {}
        }
    });
}
