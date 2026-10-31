// generate-sdk.ts
// This CLI script scans the UI component library and generates lightweight wrapper
// components for the Dynamic SDK. The generated files are placed under
// src/generated and a manifest describing the components is emitted.

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of the monorepo (two levels up from this file)
const REPO_ROOT = path.resolve(__dirname, "../../../..");
// UI components directory (adjust if the UI package location changes)
const UI_COMPONENTS_DIR = path.join(
  REPO_ROOT,
  "packages",
  "ui",
  "src",
  "components",
);
// Destination for generated SDK wrappers
const GENERATED_DIR = path.resolve(__dirname, "../generated");
// Manifest path
const MANIFEST_PATH = path.join(GENERATED_DIR, "sdk-manifest.json");

// Helper: recursively collect .tsx files
async function getAllTsxFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getAllTsxFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Simple wrapper template – re‑exports the original component lazily
// Simple wrapper template – re‑exports the original component lazily
function wrapperTemplate(componentName: string, importPath: string): string {
  return `import dynamic from "next/dynamic";

// @ts-ignore – the UI component lives outside the SDK source tree
const componentPath = "${importPath}";
const ${componentName} = dynamic(() => import(componentPath), {
  ssr: false,
});

export default ${componentName};
`;
}


async function main() {
  try {
    // Ensure generated directory exists
    await fs.mkdir(GENERATED_DIR, { recursive: true });

    const tsxFiles = await getAllTsxFiles(UI_COMPONENTS_DIR);
    const manifest: Record<string, string> = {};

    for (const filePath of tsxFiles) {
      const relativeToComponents = path.relative(UI_COMPONENTS_DIR, filePath);
      const componentName = path.basename(filePath, ".tsx");
      // Import path for the UI component – relative from the generated file location
      // Build import path using POSIX separators to avoid Windows backslashes
  const importPath = path.posix.join(
    "../../../ui/src/components",
    // Convert the relative path to POSIX style (forward slashes)
    relativeToComponents.split(path.sep).join('/')
  ).replace(/\.tsx$/, "");

      const wrapperContent = wrapperTemplate(componentName, importPath);
      const outPath = path.join(GENERATED_DIR, `${componentName}.tsx`);
      await fs.writeFile(outPath, wrapperContent, "utf8");
      manifest[componentName] = outPath;
    }

    // Write manifest JSON
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`Generated ${Object.keys(manifest).length} wrappers in ${GENERATED_DIR}`);
  } catch (err) {
    console.error("Error during generation:", err);
    process.exit(1);
  }
}

main();
