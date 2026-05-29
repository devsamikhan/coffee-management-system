/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { db, hashPin } from './src/server/db';
import { UserRole } from './src/types';
import { Request } from 'express';
import { verifyRole } from './src/server/middleware/auth';

export interface AuthenticatedRequest extends Request {
  user: { id: string; role: 'admin' | 'manager' | 'staff'; name: string };
}

// ---------------------------------------------------------------------------
// Express app instantiated at MODULE SCOPE so Vercel's @vercel/node serverless
// runtime can import and consume it directly without blocking app.listen().
// ---------------------------------------------------------------------------
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Basic middleware
app.use(express.json());

// Helper middleware to authenticate API requests via robust Bearer token
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: "Access token is missing." });
    return;
  }

  try {
    // Decode a securely base64 encoded token: "id:role:name:hash"
    const decodedRaw = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, role, name, checksum] = decodedRaw.split(':');

    if (!userId || !role || !name) {
      res.status(403).json({ error: "Invalid token structure." });
      return;
    }

    // Populate custom user context
    const mappedRole = (role === 'barista' ? 'staff' : role) as 'admin' | 'manager' | 'staff';
    (req as AuthenticatedRequest).user = { id: userId, role: mappedRole, name };
    next();
  } catch {
    res.status(403).json({ error: "Authentication failed." });
  }
};

// Helper function to require specific roles, routing through strict verifyRole middleware
const requireRoles = (roles: UserRole[]) => {
  const mappedRoles = roles.map(r => r === 'barista' ? 'staff' : r) as ('admin' | 'manager' | 'staff')[];
  return verifyRole(mappedRoles);
};

// --- API Routes FIRST ---

// Auth & Roles API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password/PIN are required." });
    return;
  }

  // Managers/Admins can login by email. For simplicity of demo, the password matches their PIN code
  const foundUser = db.findUserByEmail(email);
  if (!foundUser) {
    res.status(401).json({ error: "User not found." });
    return;
  }

  const hashedInput = hashPin(password);
  if (foundUser.pin !== hashedInput) {
    res.status(401).json({ error: "Incorrect password or PIN code." });
    return;
  }

  // Build a secure base64 state token
  const tokenPayload = `${foundUser.id}:${foundUser.role}:${foundUser.name}:${hashedInput.slice(0, 10)}`;
  const token = Buffer.from(tokenPayload).toString('base64');

  res.json({
    token,
    user: {
      id: foundUser.id,
      name: foundUser.name,
      role: foundUser.role,
      email: foundUser.email
    }
  });
});

app.post('/api/auth/pin-login', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    res.status(400).json({ error: "PIN is required." });
    return;
  }

  const foundUser = db.findUserByPin(pin);
  if (!foundUser) {
    res.status(401).json({ error: "Invalid 4-digit PIN." });
    return;
  }

  const tokenPayload = `${foundUser.id}:${foundUser.role}:${foundUser.name}:${foundUser.pin.slice(0, 10)}`;
  const token = Buffer.from(tokenPayload).toString('base64');

  res.json({
    token,
    user: {
      id: foundUser.id,
      name: foundUser.name,
      role: foundUser.role
    }
  });
});

// Employee Fast Clock In / Out
app.post('/api/auth/clock', (req, res) => {
  const { pin } = req.body;
  if (!pin) {
    res.status(400).json({ error: "PIN is required to clock-in/out." });
    return;
  }

  const result = db.employeeClockInOut(pin);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json(result);
});

// Employees list API
app.get('/api/employees', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  res.json(db.getUsers());
});

app.post('/api/employees', authenticateToken, requireRoles(['admin']), (req, res) => {
  try {
    const fresh = db.createUser(req.body);
    res.status(201).json(fresh);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/employees/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const updated = db.updateUser(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Staff member not found." });
    return;
  }
  res.json(updated);
});

app.delete('/api/employees/:id', authenticateToken, requireRoles(['admin']), (req, res) => {
  const ok = db.deleteUser(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Staff user not found." });
    return;
  }
  res.json({ success: true, message: "Staff member disabled successfully." });
});

// Menu Items Catalog
app.get('/api/menu', (req, res) => {
  res.json(db.getMenuItems());
});

app.post('/api/menu', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const fresh = db.createMenuItem(req.body);
  res.status(201).json(fresh);
});

app.put('/api/menu/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const updated = db.updateMenuItem(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Menu item not found." });
    return;
  }
  res.json(updated);
});

app.delete('/api/menu/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const success = db.deleteMenuItem(req.params.id);
  if (!success) {
    res.status(404).json({ error: "Menu item not found." });
    return;
  }
  res.json({ success: true, message: "Menu item deleted." });
});

// Recipes mapping
app.get('/api/recipes', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  res.json(db.getRecipes());
});

app.post('/api/recipes/:menuItemId', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const { requirements } = req.body;
  if (!Array.isArray(requirements)) {
    res.status(400).json({ error: "Requirements must be an array." });
    return;
  }
  db.saveRecipe(req.params.menuItemId, requirements);
  res.json({ success: true, message: "Recipe saved." });
});

// Inventory / Ingredients API
app.get('/api/ingredients', authenticateToken, (req, res) => {
  res.json(db.getIngredients());
});

app.post('/api/ingredients', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  try {
    const fresh = db.createIngredient(req.body);
    res.status(201).json(fresh);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/ingredients/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const updated = db.updateIngredient(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Ingredient not found." });
    return;
  }
  res.json(updated);
});

app.delete('/api/ingredients/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const deleted = db.deleteIngredient(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Ingredient not found." });
    return;
  }
  res.json({ success: true, message: "Ingredient deleted." });
});

// Attendance Scheduling
app.get('/api/shifts', authenticateToken, (req, res) => {
  res.json(db.getShifts());
});

app.post('/api/shifts', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const fresh = db.createShift(req.body);
  res.status(201).json(fresh);
});

app.put('/api/shifts/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const updated = db.updateShift(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Shift not found." });
    return;
  }
  res.json(updated);
});

app.delete('/api/shifts/:id', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const ok = db.deleteShift(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Shift not found." });
    return;
  }
  res.json({ success: true });
});

// Loyalty Customers
app.get('/api/customers', authenticateToken, (req, res) => {
  res.json(db.getCustomers());
});

app.post('/api/customers', authenticateToken, (req, res) => {
  const fresh = db.createCustomer(req.body);
  res.status(201).json(fresh);
});

app.put('/api/customers/:id', authenticateToken, (req, res) => {
  const updated = db.updateCustomer(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  res.json(updated);
});

// Orders Transaction Checking
app.get('/api/orders', authenticateToken, (req, res) => {
  res.json(db.getOrders());
});

app.post('/api/orders', authenticateToken, (req, res) => {
  try {
    const orderData = req.body;
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      res.status(403).json({ error: "Context user details are missing." });
      return;
    }

    // Inject Barista context from token auth!
    orderData.baristaId = user.id;
    orderData.baristaName = user.name;

    const orderReceipt = db.createOrder(orderData);
    res.status(201).json(orderReceipt);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reporting and Analytics Insights
app.get('/api/reports/dashboard', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const orders = db.getOrders();
  const ingredients = db.getIngredients();
  const shifts = db.getShifts();

  const todayStr = new Date().toISOString().split('T')[0];

  // Todays metrics filter
  const todaysOrders = orders.filter(o => o.timestamp.startsWith(todayStr));
  const todaySales = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const todayOrdersCount = todaysOrders.length;
  const avgOrderValue = todayOrdersCount > 0 ? todaySales / todayOrdersCount : 0;

  // Top Selling Items calculations
  const salesCounts: Record<string, { name: string; qty: number; total: number }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!salesCounts[item.itemId]) {
        salesCounts[item.itemId] = { name: item.name, qty: 0, total: 0 };
      }
      salesCounts[item.itemId].qty += item.quantity;
      salesCounts[item.itemId].total += item.price * item.quantity;
    });
  });

  const topSellers = Object.values(salesCounts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Critical low stock ingredients level
  const lowStockCount = ingredients.filter(i => i.stockLevel <= i.lowStockThreshold).length;

  // Shift labor costs calculations
  const completedShiftsToday = shifts.filter(s => s.shiftDate === todayStr && s.estimatedWage !== undefined);
  const todayShiftLaborCost = completedShiftsToday.reduce((sum, s) => sum + (s.estimatedWage ?? 0), 0);

  res.json({
    todaySales: parseFloat(todaySales.toFixed(2)),
    todayOrdersCount,
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
    lowStockCount,
    todayShiftLaborCost: parseFloat(todayShiftLaborCost.toFixed(2)),
    topSellers
  });
});

// Detailed Historical Sales reports
app.get('/api/reports/sales', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const orders = db.getOrders();

  // Group earnings by day for the last 7 days
  const dailyData: Record<string, number> = {};
  const categoriesShare: Record<string, number> = {};

  // Prep days map
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split('T')[0];
    dailyData[str] = 0;
  }

  orders.forEach(o => {
    const dateStr = o.timestamp.split('T')[0];
    if (dailyData[dateStr] !== undefined) {
      dailyData[dateStr] += o.total;
    }

    // Catalog category shares
    o.items.forEach(item => {
      // Find menuItem to map categories correctly
      const menuObj = db.getMenuItems().find(m => m.id === item.itemId);
      const category = menuObj ? menuObj.category : 'Coffee';
      categoriesShare[category] = (categoriesShare[category] || 0) + (item.price * item.quantity);
    });
  });

  const timeline = Object.keys(dailyData).map(k => ({
    date: k,
    sales: parseFloat(dailyData[k].toFixed(2))
  }));

  const categories = Object.keys(categoriesShare).map(k => ({
    name: k,
    value: parseFloat(categoriesShare[k].toFixed(2))
  }));

  res.json({ timeline, categories });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', authenticateToken, requireRoles(['admin', 'manager']), (req, res) => {
  const settings = db.updateSettings(req.body);
  res.json(settings);
});

// Alerts
app.get('/api/alerts', authenticateToken, (req, res) => {
  res.json(db.getAlerts());
});

app.delete('/api/alerts/:id', authenticateToken, (req, res) => {
  const dismissed = db.dismissAlert(req.params.id);
  res.json({ success: dismissed });
});

// ---------------------------------------------------------------------------
// Global Express error handler — MUST be registered with exactly 4 arguments
// so Express identifies it as an error-handling middleware. Intercepts any
// unhandled exception thrown inside a route and returns a structured JSON
// 500 response instead of crashing the Lambda silently.
// ---------------------------------------------------------------------------
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[server] Unhandled route exception:', err?.stack ?? err);
  if (res.headersSent) return next(err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err?.message ?? 'An unexpected error occurred.'
  });
});

// ---------------------------------------------------------------------------
// CRITICAL: Export the Express app instance for Vercel's @vercel/node runtime.
// Vercel imports this module and invokes the default export as a serverless
// handler — it must NOT call app.listen() in the serverless execution path.
// ---------------------------------------------------------------------------
export default app;

// ---------------------------------------------------------------------------
// Local server bootstrap — runs ONLY when not on Vercel (development or
// self-hosted production via `npm start`). Vercel never reaches this block.
// ---------------------------------------------------------------------------
if (!process.env.VERCEL) {
  if (process.env.NODE_ENV !== 'production') {
    // Development mode: proxy Vite HMR middleware inline
    console.log("Starting backend in development mode with Vite HMR proxied");
    (async () => {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Coffee Shop application server is running on http://0.0.0.0:${PORT}`);
      });
    })();
  } else {
    // Self-hosted production mode (npm start → node dist/server.cjs)
    console.log("Starting backend in production static host mode");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Coffee Shop application server is running on http://0.0.0.0:${PORT}`);
    });
  }
}
