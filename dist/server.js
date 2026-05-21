import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getToken } from "./github.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.join(__dirname, "..", "web");
const DIST_DIR = __dirname;
const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
};
export function startServer(port = 3927) {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = req.url ?? "/";
            // API endpoint to provide the token to the frontend
            if (url === "/api/config") {
                const token = getToken();
                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(JSON.stringify({ githubToken: token ?? null }));
                return;
            }
            // Serve shared modules from dist/
            if (url.startsWith("/shared/")) {
                const filePath = path.join(DIST_DIR, url.replace("/shared/", ""));
                return serveFile(res, filePath);
            }
            // Serve static files from web/
            const filePath = path.join(WEB_DIR, url === "/" ? "index.html" : url);
            serveFile(res, filePath);
        });
        server.listen(port, "127.0.0.1", () => {
            resolve(`http://127.0.0.1:${port}`);
        });
        server.on("error", reject);
    });
}
function serveFile(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
    }
    catch {
        res.writeHead(404);
        res.end("Not found");
    }
}
