import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync(".openai/hosting.json", "utf8"));
if (manifest.project_id !== "appgprj_6ae7236180948191be7fac25a4ba93ec")
  throw new Error(
    "Publication refused: the manifest must target the dedicated Suresnes v2 Site.",
  );
if (manifest.static?.directory !== "dist")
  throw new Error("Expected the Vite dist output.");
console.log("Dedicated v2 Site identity verified.");
