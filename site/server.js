import { readFile } from "node:fs/promises";
import { createServer, STATUS_CODES } from "node:http";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { validateFeedback } from "./public/js/validation.js";

const host = "127.0.0.1";
let port = 3000;
if (process.env.PORT) {
  port = Number(process.env.PORT);
}
const maxBodyBytes = 8192;
const compress = promisify(gzip);
const publicDir = new URL("./public/", import.meta.url);

const publicFiles = new Map([
  ["/index.html", "text/html; charset=utf-8"],
  ["/credits.html", "text/html; charset=utf-8"],
  ["/robots.txt", "text/plain; charset=utf-8"],
  ["/css/style.css", "text/css; charset=utf-8"],
  ["/js/app.min.js", "text/javascript; charset=utf-8"],
  ["/js/keyboard.js", "text/javascript; charset=utf-8"],
  ["/js/app.js", "text/javascript; charset=utf-8"],
  ["/js/validation.js", "text/javascript; charset=utf-8"],
  ["/images/mark.svg", "image/svg+xml"],
  ["/images/partijas-emblema.svg", "image/svg+xml"],
  ["/images/phenjana.webp", "image/webp"],
  ["/images/phenjana-400.webp", "image/webp"],
  ["/images/phenjana-620.webp", "image/webp"],
  ["/images/phenjana-700.webp", "image/webp"],
  ["/images/phenjana-960.webp", "image/webp"],
  ["/images/cuche.webp", "image/webp"],
  ["/images/cuche-400.webp", "image/webp"],
  ["/images/cuche-700.webp", "image/webp"],
  ["/images/cuche-960.webp", "image/webp"],
  ["/images/partijas-piemineklis.webp", "image/webp"],
  ["/images/triumfa-arka.webp", "image/webp"],
]);

// HTTP atbildes un publiskie faili
function sendJson(response, status, data, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(data));
}

async function serveFile(request, response, pathname, query) {
  let filePath = pathname;
  if (pathname === "/") {
    filePath = "/index.html";
  }

  const contentType = publicFiles.get(filePath);
  if (!contentType) {
    sendJson(response, 404, { message: "Lapa nav atrasta." });
    return;
  }

  const responsiveImage = filePath.match(/^\/images\/(phenjana|cuche)(?:-(400|620|700|960))?\.webp$/);
  const width = responsiveImage?.[2] ?? query?.match(/^w=(400|620|700|960)$/)?.[1];
  const variantPath = responsiveImage && width && `/images/${responsiveImage[1]}-${width}.webp`;
  let contents;
  let cacheControl = "public, max-age=2592000";
  if (variantPath && publicFiles.has(variantPath)) {
    try {
      contents = await readFile(new URL(variantPath.slice(1), publicDir));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      // Ja samazinātā attēla nav, nosūta oriģinālu un to šim URL nekešo.
      contents = await readFile(new URL(`images/${responsiveImage[1]}.webp`, publicDir));
      cacheControl = "no-store";
    }
  } else {
    contents = await readFile(new URL(filePath.slice(1), publicDir));
  }
  if (filePath === "/index.html") {
    // Iekļauj stilus sākumlapā, lai pārlūkam nebūtu jāgaida atsevišķs CSS pieprasījums.
    const css = await readFile(new URL("css/style.css", publicDir), "utf8");
    const inlineCss = css.replaceAll('url("../images/', 'url("./images/');
    contents = Buffer.from(contents.toString("utf8").replace(
      '<link rel="stylesheet" href="./css/style.css">',
      () => `<style>\n${inlineCss}</style>`,
    ));
  }
  const headers = { "Content-Type": contentType };

  // Lighthouse iesaka saspiest teksta failus. Vary nošķir saspiesto un parasto atbildi kešatmiņā.
  const compressible = contentType.startsWith("text/") || contentType === "image/svg+xml";
  if (compressible) headers.Vary = "Accept-Encoding";

  let gzipPreference;
  const acceptEncoding = request.headers["accept-encoding"];
  if (acceptEncoding) {
    gzipPreference = acceptEncoding.match(
      /(?:^|,)\s*gzip\s*(?:;\s*q\s*=\s*([01](?:\.\d+)?))?\s*(?=,|$)/i,
    );
  }

  let useGzip = false;
  if (compressible && gzipPreference) {
    let quality = 1;
    if (gzipPreference[1] !== undefined) {
      quality = Number(gzipPreference[1]);
    }
    useGzip = quality > 0;
  }

  let body = contents;
  if (useGzip) {
    body = await compress(contents);
    headers["Content-Encoding"] = "gzip";
  }
  // Statiskos resursus pārlūks var izmantot atkārtoti 30 dienas.
  if (filePath === "/robots.txt" || contentType.startsWith("text/html")) {
    headers["Cache-Control"] = "no-cache";
  } else {
    headers["Cache-Control"] = cacheControl;
  }

  headers["Content-Length"] = body.length;
  response.writeHead(200, headers);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(body);
}

// Atsauksmju API
async function handleFeedback(request, response) {
  let contentType = request.headers["content-type"];
  if (contentType) {
    contentType = contentType.split(";")[0].trim().toLowerCase();
  }
  if (contentType !== "application/json") {
    sendJson(response, 415, { message: "Pieprasījumam jābūt JSON formātā." });
    return;
  }

  let size = 0;
  const chunks = [];

  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBodyBytes) {
      sendJson(response, 413, { message: "Pieprasījums ir pārāk liels." }, { Connection: "close" });
      return;
    }
    chunks.push(chunk);
  }

  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }
    sendJson(response, 400, { message: "Nederīgs JSON." });
    return;
  }
  const errors = validateFeedback(input);
  if (Object.keys(errors).length > 0) {
    return sendJson(response, 400, { message: "400 Bad Request", errors });
  }

  sendJson(response, 200, { message: "Paldies! Atsauksme saņemta." });
}

// Maršrutēšana un palaišana
async function routeRequest(request, response) {
  try {
    const [pathname, query] = request.url.split("?", 2);

    if (pathname === "/api/feedback") {
      response.once("finish", () => {
        const status = response.statusCode;
        console.log(`${request.method} ${pathname} → HTTP ${status} ${STATUS_CODES[status]}`);
      });
      if (request.method === "POST") {
        await handleFeedback(request, response);
        return;
      }
      sendJson(response, 405, { message: "Izmanto POST metodi." }, { Allow: "POST" });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveFile(request, response, pathname, query);
      return;
    }

    sendJson(response, 405, { message: "Metode nav atļauta." }, { Allow: "GET, HEAD" });
  } catch (error) {
    if (response.destroyed) {
      return;
    }
    console.error("Pieprasījuma apstrādes kļūda:", error.message);
    sendJson(response, 500, { message: "Servera kļūda. Mēģini vēlreiz." });
  }
}

const server = createServer((request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("X-Frame-Options", "DENY");

  response.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; "));

  routeRequest(request, response);
});
server.listen(port, host, () => console.log(`Vietne: http://${host}:${server.address().port}`));
