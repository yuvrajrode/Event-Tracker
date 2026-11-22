#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};
use wry::{WebContext, WebViewBuilder};

const HTML: &str = include_str!("../index.html");
const CSS: &str = include_str!("../styles.css");
const JS: &str = include_str!("../app.js");

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let event_loop = EventLoop::new();

    let window = WindowBuilder::new()
        .with_title("Gather — Personal Moment & Event Tracker")
        .with_inner_size(LogicalSize::new(1280.0, 820.0))
        .with_min_inner_size(LogicalSize::new(960.0, 600.0))
        .build(&event_loop)?;

    let data_dir = std::env::var("LOCALAPPDATA")
        .map(|l| std::path::PathBuf::from(l).join("Gather").join("WebView2"))
        .unwrap_or_else(|_| std::path::PathBuf::from("WebView2"));
    let _ = std::fs::create_dir_all(&data_dir);

    let mut web_context = WebContext::new(Some(data_dir));

    let inlined_html = HTML
        .replace(
            r#"<link rel="stylesheet" href="styles.css" />"#,
            &format!("<style>{}</style>", CSS),
        )
        .replace(
            r#"<script src="app.js"></script>"#,
            &format!("<script>{}</script>", JS),
        );

    let _webview = WebViewBuilder::new_with_web_context(&mut web_context)
        .with_html(&inlined_html)
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
