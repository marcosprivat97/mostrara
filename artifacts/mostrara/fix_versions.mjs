import fs from 'fs';

const packageJsonPath = 'package.json';
const data = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const versions = {
  "@replit/vite-plugin-cartographer": "^1.0.0",
  "@replit/vite-plugin-dev-banner": "^1.0.0",
  "@replit/vite-plugin-runtime-error-modal": "^1.0.0",
  "@tailwindcss/vite": "^4.0.0",
  "@tanstack/react-query": "^5.0.0",
  "@types/node": "^20.0.0",
  "@types/react": "^18.2.0",
  "@types/react-dom": "^18.2.0",
  "@vitejs/plugin-react": "^4.0.0",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "framer-motion": "^11.0.0",
  "lucide-react": "^0.400.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "tailwind-merge": "^2.0.0",
  "tailwindcss": "^4.0.0",
  "vite": "^5.0.0",
  "zod": "^3.23.0"
};

for (const [dep, version] of Object.entries(data.devDependencies || {})) {
  if (version === '*' && versions[dep]) {
    data.devDependencies[dep] = versions[dep];
  }
}

for (const [dep, version] of Object.entries(data.dependencies || {})) {
  if (version === '*' && versions[dep]) {
    data.dependencies[dep] = versions[dep];
  }
}

fs.writeFileSync(packageJsonPath, JSON.stringify(data, null, 2));
console.log('package.json updated!');
