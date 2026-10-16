/* eslint-disable */
const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..'); // project root (frontend)

async function replaceInFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const newContent = content.replace(/src\\\/lib\\\/sdk/g, 'src/sdk');
  if (newContent !== content) {
    await fs.writeFile(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git'].includes(entry.name)) continue;
      await walk(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      await replaceInFile(fullPath);
    }
  }
}

walk(path.join(ROOT, 'src')).catch(err => console.error(err));
