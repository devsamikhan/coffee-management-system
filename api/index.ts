/**
 * Vercel Serverless Function Entry Point
 *
 * Explicitly specifies the '.js' extension to comply with strict Node.js ESM
 * resolution rules in the Vercel production Lambda environment.
 */
export { default } from '../server.js';
