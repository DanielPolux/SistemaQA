const fs = require('fs');

const apiUrl = process.env.API_URL || 'http://localhost:3000/api';

const content = `export const environment = {
  production: true,
  apiUrl: '${apiUrl}'
};
`;

fs.writeFileSync('src/environments/environment.prod.ts', content);
console.log('environment.prod.ts generado con apiUrl:', apiUrl);
