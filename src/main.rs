#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::thread;
use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};
use tiny_http::{Header, Response, Server, StatusCode};
use wry::{WebContext, WebViewBuilder};

const HTML: &str = include_str!("../index.html");
const CSS: &str = include_str!("../styles.css");
const JS: &str = include_str!("../app.js");
const ICON: &str = include_str!("../icon.svg");

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

    // 2. Native Desktop Window
    let event_loop = EventLoop::new();

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

    let _webview = WebViewBuilder::new_with_web_context(&mut web_context)
        .with_url(&app_url)
        .build(&window)?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}
