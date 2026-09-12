import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { GAME_CONFIG } from '../shared/config.js';
import { setupSocketHandler } from './socketHandler.js';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Setup Socket.IO with CORS for development
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Setup socket handler
setupSocketHandler(io);

// Provide server info endpoint
app.get('/api/server-info', (_req, res) => {
  res.json({
    lanAddresses: getLanAddresses(),
    port: Number(PORT),
  });
});

// Serve built client files (both production and when client is pre-built)
const clientPath = path.resolve(__dirname, '../dist/client');
const clientPathAlt = path.resolve(__dirname, '..', 'dist', 'client');

import fs from 'fs';
const resolvedClientPath = fs.existsSync(clientPath) ? clientPath : 
                           fs.existsSync(clientPathAlt) ? clientPathAlt : null;

if (resolvedClientPath) {
  app.use(express.static(resolvedClientPath));
  // SPA fallback - must be after other routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(resolvedClientPath, 'index.html'));
  });
}

// Function to get LAN IPv4 addresses
function getLanAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

const PORT = process.env.PORT || GAME_CONFIG.PORT || 3000;

httpServer.listen(Number(PORT), '0.0.0.0', async () => {
  const lanAddresses = getLanAddresses();
  const primaryLan = lanAddresses.length > 0 ? lanAddresses[0] : null;
  const lanUrl = primaryLan ? `http://${primaryLan}:${PORT}` : null;

  console.log('');
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     Revolution! Game Server               ║');
  console.log('╠═══════════════════════════════════════════╣');
  console.log(`║  Local:  http://localhost:${PORT}            ║`);
  if (lanUrl) {
    const pad = Math.max(0, 31 - lanUrl.length);
    console.log(`║  LAN:    ${lanUrl}${' '.repeat(pad)}║`);
  }
  if (lanAddresses.length > 1) {
    for (let i = 1; i < lanAddresses.length; i++) {
      const altUrl = `http://${lanAddresses[i]}:${PORT}`;
      const altPad = Math.max(0, 31 - altUrl.length);
      console.log(`║  Alt:    ${altUrl}${' '.repeat(altPad)}║`);
    }
  }
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  if (lanUrl) {
    try {
      // Dynamic import for qrcode since it might not support all ESM envs
      const qrcode = await import('qrcode');
      const qrStr = await qrcode.default.toString(lanUrl, { type: 'terminal', small: true });
      console.log(qrStr);
      console.log('Scan the QR code or enter the LAN address to join!\n');
    } catch (err) {
      console.log(`Share this URL with players: ${lanUrl}\n`);
    }
  }

  if (!resolvedClientPath) {
    console.log('⚠  Client build not found. Run "npm run build" first, or use "npm run dev" for development.\n');
  }
});
