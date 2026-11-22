fn main() {
    if std::env::var("CARGO_CFG_TARGET_OS").unwrap_or_default() == "windows" {
        let mut res = winres::WindowsResource::new();
        res.set_icon("gather.ico");
        res.set("ProductName", "Gather");
        res.set("FileDescription", "Gather — Personal Moment & Event Tracker");
        res.set("InternalName", "Gather");
        res.set("OriginalFilename", "Gather.exe");
        res.set("LegalCopyright", "Copyright © 2026 Yuvraj Rode");
        let _ = res.compile();
    }
}
