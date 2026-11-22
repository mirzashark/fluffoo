let app;
let startupError = null;

try {
  const mod = await import('../src/server.js');
  app = mod.default;
} catch (err) {
  startupError = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code
  };
  console.error('CRITICAL: Server initialization failed on Vercel:', err);
}

export default function handler(req, res) {
  if (startupError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      status: 'error',
      message: 'Fluffoo Server Startup Failed on Vercel',
      startupError,
      diagnostics: {
        nodeVersion: process.version,
        cwd: process.cwd(),
        arch: process.arch,
        platform: process.platform,
        isVercel: !!process.env.VERCEL
      }
    }, null, 2));
  }
  return app(req, res);
}
