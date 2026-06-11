import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const bundlePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "assets",
  "index-C_aBXBpq.js"
);

let js = fs.readFileSync(bundlePath, "utf8");
const start = js.indexOf("function M1e(){return m.jsx");
const end = js.indexOf("function h1e(){return m.jsxs");

if (start === -1 || end === -1) {
  throw new Error(`Could not find M1e/h1e markers (start=${start}, end=${end})`);
}

const newM1e =
  'function M1e(){return m.jsx("div",{"code-path":"src/pages/Login.tsx:5:5",ref:e=>{if(e&&e.dataset.authMounted!=="1"){e.dataset.authMounted="1";const t=()=>{if(window.AscendiaAuth){try{window.AscendiaAuth.mount(e)}catch(r){e.textContent=r.message;e.className="font-body text-sm text-center px-6 py-16";e.style.color="#f87171"}}else{setTimeout(t,50)}};t()}}})}';

js = js.slice(0, start) + newM1e + js.slice(end);
fs.writeFileSync(bundlePath, js);
console.log("Patched M1e to use AscendiaAuth.mount");
