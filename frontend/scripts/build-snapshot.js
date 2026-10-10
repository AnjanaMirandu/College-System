const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'snapshot');
const target = path.join(root, 'build');
const publicDir = path.join(root, 'public');
const apiBaseUrl = process.env.REACT_APP_API_URL || '/api';

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

if (fs.existsSync(publicDir)) {
  for (const entry of fs.readdirSync(publicDir)) {
    if (entry === 'index.html') {
      continue;
    }

    fs.cpSync(path.join(publicDir, entry), path.join(target, entry), { recursive: true });
  }
}

const jsDir = path.join(target, 'static', 'js');
if (fs.existsSync(jsDir)) {
  for (const entry of fs.readdirSync(jsDir)) {
    if (!entry.endsWith('.js')) {
      continue;
    }

    const filePath = path.join(jsDir, entry);
    const contents = fs.readFileSync(filePath, 'utf8')
      .replace(/https:\/\/backend-ivory-seven-14\.vercel\.app\/api/g, apiBaseUrl);

    fs.writeFileSync(filePath, contents);
  }
}

console.log(`Copied Vercel snapshot to build/ with API base ${apiBaseUrl}.`);
