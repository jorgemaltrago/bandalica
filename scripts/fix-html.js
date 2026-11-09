const fs = require("fs");
const path = require("path");

function processDirectory(directory, distRoot) {
  if (!fs.existsSync(directory)) return;

  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      processDirectory(fullPath, distRoot);
    } else if (entry.isFile() && path.extname(entry.name) === ".html") {
      let html = fs.readFileSync(fullPath, "utf8");

      // 1. Calculamos la ruta relativa desde la raíz de dist hasta la carpeta de este HTML
      const relativeDir = path.relative(distRoot, path.dirname(fullPath));

      // 2. Determinamos el prefijo correcto según la profundidad
      // - Si está en la raíz (dist/): './'
      // - Si está en una subcarpeta (dist/dashboard/): '../'
      // - Si está más hondo (dist/a/b/): '../../'
      let prefix = "./";
      if (relativeDir !== "") {
        const segments = relativeDir.split(path.sep);
        prefix = "../".repeat(segments.length);
      }

      // 3. Reemplazamos las rutas absolutas usando el prefijo calculado para este archivo
      html = html
        .replace(/href="\//g, `href="${prefix}`)
        .replace(/src="\//g, `src="${prefix}`);

      fs.writeFileSync(fullPath, html, "utf8");
      console.log(
        `✓ [Profundidad: ${prefix}] Corregido: ${path.relative(distRoot, fullPath)}`,
      );
    }
  }
}

const distPath = path.join(__dirname, "..", "dist");
console.log("Iniciando corrección inteligente de rutas con profundidad...");
processDirectory(distPath, distPath);
console.log(
  "¡Todos los archivos HTML han sido actualizados con sus rutas relativas correctas!",
);
