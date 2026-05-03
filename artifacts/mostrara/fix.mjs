import fs from 'fs';
const data = fs.readFileSync('package.json', 'utf8');
fs.writeFileSync('package.json', data.replace(/"catalog:"/g, '"*"'));
console.log('Done!');
