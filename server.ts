/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { db, hashPin } from './src/server/db.js';
import { UserRole } from './src/types';
import { Request } from 'express';
import { verifyRole } from './src/server/middleware/auth.js';

export interface AuthenticatedRequest extends Request {
  user: { id: string; role: 'admin' | 'manager' | 'staff'; name: string };
}

// ---------------------------------------------------------------------------
// Express app — module scope so Vercel's serverless runtime can import it.
// ---------------------------------------------------------------------------
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());
// Trigger commit to force fresh Vercel rebuild with new env variables

// ---------------------------------------------------------------------------
// asyncHandler — wraps async route functions for Express 4.
// Express 4 does not auto-catch Promise rejections from async handlers.
// This passes any thrown error to the global error handler via next(err).
// ---------------------------------------------------------------------------
const asyncHandler = (
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>
) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'Access token is missing.' }); return; }
  try {
    const [userId, role, name] = Buffer.from(token, 'base64').toString('utf-8').split(':');
    if (!userId || !role || !name) { res.status(403).json({ error: 'Invalid token structure.' }); return; }
    const mappedRole = (role === 'barista' ? 'staff' : role) as 'admin' | 'manager' | 'staff';
    (req as AuthenticatedRequest).user = { id: userId, role: mappedRole, name };
    next();
  } catch {
    res.status(403).json({ error: 'Authentication failed.' });
  }
};

const requireRoles = (roles: UserRole[]) => {
  const mapped = roles.map(r => r === 'barista' ? 'staff' : r) as ('admin' | 'manager' | 'staff')[];
  return verifyRole(mapped);
};

// ===========================================================================
// API Routes
// All handlers are wrapped with asyncHandler so Supabase await errors are
// forwarded to the global error handler instead of crashing the Lambda.
// ===========================================================================

// ── Auth ────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email and password are required.' }); return; }

  const foundUser = await db.findUserByEmail(email);
  if (!foundUser) { res.status(401).json({ error: 'User not found.' }); return; }

  const hashedInput = hashPin(password);
  if (foundUser.pin !== hashedInput) { res.status(401).json({ error: 'Incorrect password or PIN.' }); return; }

  const token = Buffer.from(`${foundUser.id}:${foundUser.role}:${foundUser.name}:${hashedInput.slice(0, 10)}`).toString('base64');
  res.json({ token, user: { id: foundUser.id, name: foundUser.name, role: foundUser.role, email: foundUser.email } });
}));

app.post('/api/auth/pin-login', asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin) { res.status(400).json({ error: 'PIN is required.' }); return; }

  const foundUser = await db.findUserByPin(pin);
  if (!foundUser) { res.status(401).json({ error: 'Invalid 4-digit PIN.' }); return; }

  const token = Buffer.from(`${foundUser.id}:${foundUser.role}:${foundUser.name}:${foundUser.pin.slice(0, 10)}`).toString('base64');
  res.json({ token, user: { id: foundUser.id, name: foundUser.name, role: foundUser.role } });
}));

app.post('/api/auth/clock', asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin) { res.status(400).json({ error: 'PIN is required to clock in/out.' }); return; }

  const result = await db.employeeClockInOut(pin);
  if (!result.success) { res.status(400).json({ error: result.message }); return; }
  res.json(result);
}));

// ── Employees ────────────────────────────────────────────────────────────────

app.get('/api/employees', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  res.json(await db.getUsers());
}));

app.post('/api/employees', authenticateToken, requireRoles(['admin']), asyncHandler(async (req, res) => {
  const fresh = await db.createUser(req.body);
  res.status(201).json(fresh);
}));

app.put('/api/employees/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const updated = await db.updateUser(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: 'Staff member not found.' }); return; }
  res.json(updated);
}));

app.delete('/api/employees/:id', authenticateToken, requireRoles(['admin']), asyncHandler(async (req, res) => {
  const ok = await db.deleteUser(req.params.id);
  if (!ok) { res.status(404).json({ error: 'Staff user not found.' }); return; }
  res.json({ success: true, message: 'Staff member disabled successfully.' });
}));

// ── Menu ─────────────────────────────────────────────────────────────────────

app.get('/api/menu', asyncHandler(async (req, res) => {
  res.json(await db.getMenuItems());
}));

app.post('/api/menu', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const fresh = await db.createMenuItem(req.body);
  res.status(201).json(fresh);
}));

app.put('/api/menu/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const updated = await db.updateMenuItem(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: 'Menu item not found.' }); return; }
  res.json(updated);
}));

app.delete('/api/menu/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  await db.deleteMenuItem(req.params.id);
  res.json({ success: true, message: 'Menu item deleted.' });
}));

// ── Recipes ───────────────────────────────────────────────────────────────────

app.get('/api/recipes', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  res.json(await db.getRecipes());
}));

app.post('/api/recipes/:menuItemId', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const { requirements } = req.body;
  if (!Array.isArray(requirements)) { res.status(400).json({ error: 'Requirements must be an array.' }); return; }
  await db.saveRecipe(req.params.menuItemId, requirements);
  res.json({ success: true, message: 'Recipe saved.' });
}));

// ── Ingredients ───────────────────────────────────────────────────────────────

app.get('/api/ingredients', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await db.getIngredients());
}));

app.post('/api/ingredients', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const fresh = await db.createIngredient(req.body);
  res.status(201).json(fresh);
}));

app.put('/api/ingredients/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const updated = await db.updateIngredient(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: 'Ingredient not found.' }); return; }
  res.json(updated);
}));

app.delete('/api/ingredients/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  await db.deleteIngredient(req.params.id);
  res.json({ success: true, message: 'Ingredient deleted.' });
}));

// ── Shifts ────────────────────────────────────────────────────────────────────

app.get('/api/shifts', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await db.getShifts());
}));

app.post('/api/shifts', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const fresh = await db.createShift(req.body);
  res.status(201).json(fresh);
}));

app.put('/api/shifts/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  const updated = await db.updateShift(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: 'Shift not found.' }); return; }
  res.json(updated);
}));

app.delete('/api/shifts/:id', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  await db.deleteShift(req.params.id);
  res.json({ success: true });
}));

// ── Customers ─────────────────────────────────────────────────────────────────

app.get('/api/customers', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await db.getCustomers());
}));

app.post('/api/customers', authenticateToken, asyncHandler(async (req, res) => {
  const fresh = await db.createCustomer(req.body);
  res.status(201).json(fresh);
}));

app.put('/api/customers/:id', authenticateToken, asyncHandler(async (req, res) => {
  const updated = await db.updateCustomer(req.params.id, req.body);
  if (!updated) { res.status(404).json({ error: 'Customer not found.' }); return; }
  res.json(updated);
}));

// ── Orders ────────────────────────────────────────────────────────────────────

app.get('/api/orders', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await db.getOrders());
}));

app.post('/api/orders', authenticateToken, asyncHandler(async (req, res) => {
  const orderData = req.body;
  const user = (req as AuthenticatedRequest).user;
  if (!user) { res.status(403).json({ error: 'Context user details are missing.' }); return; }
  orderData.baristaId   = user.id;
  orderData.baristaName = user.name;
  const receipt = await db.createOrder(orderData);
  res.status(201).json(receipt);
}));

// ── Reports ───────────────────────────────────────────────────────────────────

app.get('/api/reports/dashboard', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  res.json(await db.getDashboardMetrics());
}));

app.get('/api/reports/sales', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  res.json(await db.getSalesReport());
}));

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/api/settings', asyncHandler(async (req, res) => {
  res.json(await db.getSettings());
}));

app.post('/api/settings', authenticateToken, requireRoles(['admin', 'manager']), asyncHandler(async (req, res) => {
  res.json(await db.updateSettings(req.body));
}));

// ── Alerts ────────────────────────────────────────────────────────────────────

app.get('/api/alerts', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await db.getAlerts());
}));

app.delete('/api/alerts/:id', authenticateToken, asyncHandler(async (req, res) => {
  const dismissed = await db.dismissAlert(req.params.id);
  res.json({ success: dismissed });
}));

// ---------------------------------------------------------------------------
// Global error handler — catches all errors forwarded via next(err)
// including async errors from asyncHandler. Returns structured JSON 500.
// ---------------------------------------------------------------------------
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[server] Unhandled exception:', err?.stack ?? err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    error:   'Internal Server Error',
    message: err?.message ?? 'An unexpected error occurred.',
  });
});

// ---------------------------------------------------------------------------
// Export app for Vercel serverless runtime (api/index.ts re-exports this).
// ---------------------------------------------------------------------------
export default app;

// ---------------------------------------------------------------------------
// Local bootstrap — only runs outside Vercel (dev or self-hosted production).
// ---------------------------------------------------------------------------
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting in development mode with Vite HMR...');
    (async () => {
      const viteModuleName = 'vite';
      const { createServer: createViteServer } = await import(viteModuleName);
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
      app.use(vite.middlewares);
      app.listen(PORT, '0.0.0.0', () =>
        console.log(`Dev server → http://0.0.0.0:${PORT}`)
      );
    })();
  } else {
    console.log('Starting in production static host mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`Production server → http://0.0.0.0:${PORT}`)
    );
  }
}
