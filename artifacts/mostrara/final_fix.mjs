import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

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

for (const dep in pkg.dependencies) {
  if (pkg.dependencies[dep] === 'catalog:') {
    pkg.dependencies[dep] = versions[dep] || '*';
  }
}
for (const dep in pkg.devDependencies) {
  if (pkg.devDependencies[dep] === 'catalog:') {
    pkg.devDependencies[dep] = versions[dep] || '*';
  }
}

// Remove Replit plugins specifically as they often cause build issues outside Replit
delete pkg.devDependencies['@replit/vite-plugin-cartographer'];
delete pkg.devDependencies['@replit/vite-plugin-dev-banner'];
delete pkg.devDependencies['@replit/vite-plugin-runtime-error-modal'];

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json updated with real versions');
