/**
 * Vercel Serverless Function Entry Point with Startup Debugger
 */

export default async function handler(req: any, res: any) {
  try {
    // Dynamically import server.ts to catch any module load/initialization crashes
    const serverModule = await import('../server');
    const app = serverModule.default;
    
    // Forward the request to the Express app
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Startup Crash]:', err);
    res.status(500).json({
      error: 'Vercel Serverless Function Startup Crash',
      message: err?.message || String(err),
      stack: err?.stack || 'No stack trace available'
    });
  }
}
