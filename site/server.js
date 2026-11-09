import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
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
  ["/css/style.css", "text/css; charset=utf-8"],
  ["/js/app.min.js", "text/javascript; charset=utf-8"],
  ["/js/app.js", "text/javascript; charset=utf-8"],
  ["/js/validation.js", "text/javascript; charset=utf-8"],
  ["/images/mark.svg", "image/svg+xml"],
  ["/images/partijas-emblema.svg", "image/svg+xml"],
  ["/images/phenjana.webp", "image/webp"],
  ["/images/cuche.webp", "image/webp"],
  ["/images/partijas-piemineklis.webp", "image/webp"],
  ["/images/triumfa-arka.webp", "image/webp"],
]);

// HTTP atbildes un publiskie faili
function sendJson(response, status, data, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(data));
}

async function serveFile(request, response, pathname) {
  let filePath = pathname;
  if (pathname === "/") {
    filePath = "/index.html";
  }

  const contentType = publicFiles.get(filePath);
  if (!contentType) {
    sendJson(response, 404, { message: "Lapa nav atrasta." });
    return;
  }

  const contents = await readFile(new URL(filePath.slice(1), publicDir));
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
  // Attēlus pārlūks var izmantot atkārtoti vienu dienu.
  if (contentType.startsWith("image/")) headers["Cache-Control"] = "public, max-age=86400";

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
    sendJson(response, 400, { message: "Pārbaudi ievadītos datus.", errors });
    return;
  }

  sendJson(response, 200, { message: "Paldies! Atsauksme saņemta." });
}

// Maršrutēšana un palaišana
async function routeRequest(request, response) {
  try {
    const pathname = request.url.split("?")[0];

    if (pathname === "/api/feedback") {
      if (request.method === "POST") {
        await handleFeedback(request, response);
        return;
      }
      sendJson(response, 405, { message: "Izmanto POST metodi." }, { Allow: "POST" });
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveFile(request, response, pathname);
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

const server = createServer(routeRequest);
server.listen(port, host, () => console.log(`Vietne: http://${host}:${server.address().port}`));