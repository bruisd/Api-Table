import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";
import cron from "node-cron";
import path from "path";
import fs from "fs";
import { proxyHandler, proxyRateLimiter } from "./routes/proxy";

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Initialize Turso database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:./data/shares.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create tables
async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS shares (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetch_input TEXT,
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )
  `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_expires ON shares(expires_at)`,
  );
}

initDb().catch(console.error);

// Rate limiter storage
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 30;

// Rate limiter middleware
function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    next();
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    res.status(429).json({ error: "Rate limit exceeded. Try again later." });
    return;
  }

  entry.count++;
  next();
}

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://apitable.io",
  "https://www.apitable.io",
];

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any netlify.app subdomain
    if (origin.endsWith(".netlify.app") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "5mb" }));

// Health check endpoint
app.get("/api/health", async (_req: Request, res: Response) => {
  const result = await db.execute(
    `SELECT COUNT(*) as count FROM shares WHERE expires_at > datetime('now')`,
  );

  res.json({
    status: "ok",
    activeShares: (result.rows[0] as unknown as { count: number }).count,
  });
});

// Create share endpoint
interface CreateShareBody {
  data: object;
  fetchInput?: string;
  url?: string;
}

app.post("/api/share", rateLimiter, async (req: Request, res: Response) => {
  const { data, fetchInput, url } = req.body as CreateShareBody;

  if (!data) {
    res.status(400).json({ error: "Data is required" });
    return;
  }

  const id = nanoid(10);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  try {
    await db.execute({
      sql: `INSERT INTO shares (id, data, fetch_input, url, expires_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, JSON.stringify(data), fetchInput || null, url || null, expiresAt],
    });

    const frontendUrl =
      process.env.FRONTEND_URL ||
      (IS_PRODUCTION ? "https://apitable.io" : "http://localhost:5173");
    const shareUrl = `${frontendUrl}/s/${id}`;

    res.json({
      id,
      shareUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("Error creating share:", error);
    res.status(500).json({ error: "Failed to create share" });
  }
});

// Get share endpoint
app.get("/api/share/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await db.execute({
      sql: `SELECT id, data, fetch_input, url, created_at, expires_at
            FROM shares
            WHERE id = ? AND expires_at > datetime('now')`,
      args: [id],
    });

    const share = result.rows[0] as unknown as
      | {
          id: string;
          data: string;
          fetch_input: string | null;
          url: string | null;
          created_at: string;
          expires_at: string;
        }
      | undefined;

    if (!share) {
      res.status(404).json({ error: "Share not found or expired" });
      return;
    }

    res.json({
      id: share.id,
      data: JSON.parse(share.data as string),
      fetchInput: share.fetch_input,
      url: share.url,
      createdAt: share.created_at,
      expiresAt: share.expires_at,
    });
  } catch (error) {
    console.error("Error fetching share:", error);
    res.status(500).json({ error: "Failed to fetch share" });
  }
});

// Proxy endpoint
app.post("/api/proxy", proxyRateLimiter, proxyHandler);

// Serve static files in production
if (IS_PRODUCTION) {
  const clientBuildPath = path.join(__dirname, "..", "..", "client", "dist");
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));

    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    });
  }
}

// Cleanup job - runs every hour
cron.schedule("0 * * * *", async () => {
  try {
    const result = await db.execute(
      `DELETE FROM shares WHERE expires_at < datetime('now')`,
    );
    console.log(`[Cleanup] Deleted ${result.rowsAffected} expired shares`);
  } catch (error) {
    console.error("[Cleanup] Error:", error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${IS_PRODUCTION ? "production" : "development"}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  process.exit(0);
});
