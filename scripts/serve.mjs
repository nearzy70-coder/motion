// Lecteur web temps réel : node scripts/serve.mjs [port]
import { startServer } from './server.mjs';

const { port } = await startServer(Number(process.argv[2] || 8080));
console.log(`Lecteur : http://127.0.0.1:${port}/src/index.html?play`);
console.log(`Image fixe à un instant donné : http://127.0.0.1:${port}/src/index.html?t=18.5`);
