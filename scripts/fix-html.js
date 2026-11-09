const fs = require("fs");
const path = require("path");

function processDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.warn(`El directorio no existe: ${directory}`);
    return;
  }

  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      // Entra recursivamente en subcarpetas (ej. rutas anidadas de Expo Router)
      processDirectory(fullPath);
    } else if (entry.isFile() && path.extname(entry.name) === ".html") {
      let html = fs.readFileSync(fullPath, "utf8");

      // Reemplaza de forma segura cualquier href="/" o src="/" por su versión relativa
      html = html
        .replace(/href="\//g, 'href="./')
        .replace(/src="\//g, 'src="./');

      fs.writeFileSync(fullPath, html, "utf8");
      console.log(
        `✓ Rutas corregidas en: ${path.relative(path.join(__dirname, ".."), fullPath)}`,
      );
    }
  }
}

const distPath = path.join(__dirname, "..", "dist");
console.log("Iniciando corrección de rutas en archivos HTML...");
processDirectory(distPath);
console.log(
  "¡Todos los archivos HTML han sido actualizados con rutas relativas!",
);
