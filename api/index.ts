/**
 * Vercel Serverless Function Entry Point
 *
 * Vercel automatically detects every file inside the `api/` directory and
 * deploys it as an isolated serverless function. This file re-exports the
 * fully-configured Express `app` from server.ts so Vercel's Node.js runtime
 * can invoke it as a request handler without calling app.listen().
 *
 * Request flow on Vercel:
 *   Browser → /api/* → (vercel.json rewrite) → /api/index → Express router
 */
export { default } from '../server';
