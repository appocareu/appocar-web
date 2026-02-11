require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const { Pool } = require("pg");
const crypto = require("crypto");
const fs = require("fs/promises");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");
const { WebSocketServer } = require("ws");
let sharp = null;
let tesseract = null;
try {
  sharp = require("sharp");
} catch {
  sharp = null;
}
try {
  tesseract = require("tesseract.js");
} catch {
  tesseract = null;
}

const app = express();
const PORT = Number(process.env.PORT || 3000);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined
});

const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS || 30);

async function ensureSchema() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_type TEXT DEFAULT 'buy'");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS make TEXT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS model TEXT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS seller_email TEXT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS ev_range_km INT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS ev_battery_kwh INT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS ev_fast_charge_kw INT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS ev_charge_type TEXT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS co2_g_km INT");
    await pool.query("ALTER TABLE listings ADD COLUMN IF NOT EXISTS consumption TEXT");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_make_idx ON listings(make)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_model_idx ON listings(model)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_price_idx ON listings(price)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_year_idx ON listings(year)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_fuel_idx ON listings(fuel)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_body_idx ON listings(body)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_deal_type_idx ON listings(deal_type)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_verified_idx ON listings(verified)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_ev_range_idx ON listings(ev_range_km)");
    await pool.query("CREATE INDEX IF NOT EXISTS listings_co2_idx ON listings(co2_g_km)");
    await pool.query("UPDATE listings SET deal_type = 'buy' WHERE deal_type IS NULL");
    await pool.query("UPDATE listings SET verified = FALSE WHERE verified IS NULL");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_brands (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        popular_rank INT DEFAULT 999
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_models (
        id SERIAL PRIMARY KEY,
        brand_id INT NOT NULL REFERENCES car_brands(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS car_models_brand_idx ON car_models(brand_id)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        password_hash TEXT,
        provider TEXT,
        provider_id TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        email_verification_token TEXT,
        email_verification_expires TIMESTAMPTZ,
        role TEXT DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS auth_sessions_token_hash_idx ON auth_sessions(token_hash)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        provider TEXT NOT NULL,
        state TEXT NOT NULL,
        redirect TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS oauth_states_state_idx ON oauth_states(state)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT NOT NULL,
        listing_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_email, listing_id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moderation_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT,
        file_name TEXT,
        status TEXT NOT NULL,
        reason TEXT,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT,
        decision_status TEXT,
        decision_note TEXT
      )
    `);
    await pool.query("ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ");
    await pool.query("ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS reviewed_by TEXT");
    await pool.query("ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS decision_status TEXT");
    await pool.query("ALTER TABLE moderation_events ADD COLUMN IF NOT EXISTS decision_note TEXT");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_brands (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        popular_rank INT DEFAULT 999
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS car_models (
        id SERIAL PRIMARY KEY,
        brand_id INT NOT NULL REFERENCES car_brands(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS car_models_brand_idx ON car_models(brand_id)");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT,
        event_type TEXT NOT NULL,
        listing_id UUID,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_searches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT NOT NULL,
        label TEXT NOT NULL,
        params TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_search_deliveries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        last_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (search_id, user_email)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_drop_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        old_price INT NOT NULL,
        new_price INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_drop_notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        last_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (listing_id, user_email)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT NOT NULL,
        type TEXT NOT NULL,
        variant TEXT NOT NULL,
        subject TEXT NOT NULL,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_opens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL REFERENCES email_events(id) ON DELETE CASCADE,
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_unsubscribes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_email TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        listing_id UUID NOT NULL,
        buyer_email TEXT NOT NULL,
        seller_email TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_email TEXT NOT NULL,
        body TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        read_at TIMESTAMPTZ
      )
    `);
    await pool.query("ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ");
  } catch {
    // ignore migration errors
  }
}

ensureSchema()
  .then(() => seedCatalog())
  .catch(() => seedCatalog());

const BRAND_DATA = {
  Volkswagen: ["Golf", "Passat", "Tiguan", "T-Roc", "ID.4", "Polo", "Touareg"],
  Skoda: ["Octavia", "Superb", "Kodiaq", "Kamiq", "Fabia", "Enyaq"],
  Toyota: ["Corolla", "Yaris", "RAV4", "Camry", "C-HR", "Prius"],
  BMW: ["3 Series", "5 Series", "X3", "X5", "X1", "i4", "iX"],
  Renault: ["Clio", "Megane", "Captur", "Kadjar", "Austral", "Zoe"],
  "Mercedes-Benz": ["C-Class", "E-Class", "A-Class", "GLC", "GLE", "EQB", "EQE"],
  Dacia: ["Duster", "Sandero", "Jogger", "Spring"],
  Peugeot: ["208", "308", "3008", "2008", "508", "e-208"],
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7", "e-tron"],
  Ford: ["Focus", "Fiesta", "Kuga", "Puma", "Mondeo", "Mustang Mach-E"],
  Hyundai: ["i30", "Tucson", "Kona", "Santa Fe", "Ioniq 5"],
  Kia: ["Ceed", "Sportage", "Niro", "EV6", "Sorento"],
  Opel: ["Astra", "Corsa", "Mokka", "Insignia", "Grandland"],
  Citroen: ["C3", "C4", "C5 Aircross", "Berlingo"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  Seat: ["Leon", "Ateca", "Ibiza", "Arona", "Tarraco"],
  Volvo: ["XC40", "XC60", "XC90", "V60", "S60", "EX30"],
  Fiat: ["500", "Panda", "Tipo", "500e"],
  Nissan: ["Qashqai", "Juke", "Leaf", "X-Trail"],
  Mazda: ["3", "6", "CX-5", "CX-30"],
  "Alfa Romeo": ["Giulia", "Stelvio", "Tonale"],
  Cupra: ["Formentor", "Born", "Leon"],
  Honda: ["Civic", "CR-V", "Jazz", "HR-V"],
  Jaguar: ["F-Pace", "E-Pace", "I-Pace"],
  "Land Rover": ["Range Rover", "Discovery", "Defender"],
  Lexus: ["NX", "RX", "ES", "UX"],
  Mini: ["Cooper", "Countryman"],
  Mitsubishi: ["Outlander", "ASX"],
  Porsche: ["Cayenne", "Macan", "Taycan", "911"],
  Subaru: ["Forester", "Outback", "XV"],
  Suzuki: ["Vitara", "Swift", "S-Cross"],
  Bentley: ["Bentayga", "Continental"],
  Ferrari: ["Roma", "Portofino"],
  Lamborghini: ["Urus", "Huracan"],
  Maserati: ["Ghibli", "Levante"],
  "Rolls-Royce": ["Ghost", "Cullinan"],
  BYD: ["Atto 3", "Seal", "Dolphin"],
  MG: ["ZS EV", "MG4", "HS"],
  Nio: ["ET5", "ES6"],
  XPeng: ["G9", "P7"],
  Lada: ["Vesta", "Niva"],
  Saab: ["9-3", "9-5"],
  Smart: ["Fortwo", "Forfour"]
};

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

async function seedCatalog() {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) FROM car_brands");
    if (Number(rows[0]?.count || 0) > 0) return;
    const brandEntries = Object.keys(BRAND_DATA);
    let rank = 1;
    for (const name of brandEntries) {
      const slug = slugify(name);
      const { rows: brandRows } = await pool.query(
        "INSERT INTO car_brands (name, slug, popular_rank) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug RETURNING id",
        [name, slug, rank]
      );
      const brandId = brandRows[0]?.id;
      const models = BRAND_DATA[name] || [];
      for (const model of models) {
        await pool.query(
          "INSERT INTO car_models (brand_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [brandId, model]
        );
      }
      rank += 1;
    }
  } catch {
    // ignore seeding errors
  }
}


app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

const allowOrigin = process.env.ALLOW_ORIGIN || "*";
const allowedOrigins = allowOrigin === "*"
  ? []
  : allowOrigin.split(",").map((item) => item.trim()).filter(Boolean);
app.use(
  cors({
    origin: allowOrigin === "*" ? true : allowOrigin.split(","),
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-User-Email", "X-User-Name"]
  })
);

const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== "false";
const botGuardEnabled = process.env.BOT_GUARD_ENABLED !== "false";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 600),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" }
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" }
});

const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.VERIFY_RATE_LIMIT_MAX || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" }
});

function botGuard(req, res, next) {
  if (!botGuardEnabled) return next();
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (process.env.INTERNAL_API_KEY && req.headers["x-internal-key"] === process.env.INTERNAL_API_KEY) {
    return next();
  }
  const origin = req.headers.origin ? String(req.headers.origin) : "";
  const normalizedOrigin = origin ? normalizeOrigin(origin) : "";
  if (!origin) {
    return res.status(403).json({ error: "origin_required" });
  }
  if (allowedOrigins.length > 0 && normalizedOrigin && !allowedOrigins.includes(normalizedOrigin)) {
    return res.status(403).json({ error: "origin_not_allowed" });
  }
  const userAgent = String(req.headers["user-agent"] || "");
  if (!userAgent || userAgent.length < 6) {
    return res.status(403).json({ error: "bot_detected" });
  }
  return next();
}

if (rateLimitEnabled) {
  app.use("/api", generalLimiter);
}
app.use("/api", botGuard);

const cookieName = process.env.COOKIE_NAME || "appocar_user";
const sessionSecret = process.env.SESSION_SECRET || "appocar-dev-secret";
const cookieSecure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const cookieSameSite = cookieSecure ? "none" : "lax";
const adminEmail = (process.env.ADMIN_EMAIL || "appocar.eu@gmail.com").toLowerCase();
const emailVerificationEnabled = process.env.EMAIL_VERIFICATION_ENABLED === "true";
const emailVerificationRequired = process.env.EMAIL_VERIFICATION_REQUIRED === "true";
const verificationTtlHours = Number(process.env.EMAIL_VERIFICATION_TTL_HOURS || 24);
const publicBaseUrl = process.env.PUBLIC_BASE_URL || process.env.PUBLIC_BACKEND_URL || "";
const publicWebBaseUrl = process.env.PUBLIC_WEB_BASE_URL || process.env.PUBLIC_FRONTEND_URL || "";
const emailFrom = process.env.EMAIL_FROM || "no-reply@appocar.com";
const emailMarketingEnabled = process.env.EMAIL_MARKETING_ENABLED === "true";
const emailMarketingIntervalMinutes = Number(process.env.EMAIL_MARKETING_INTERVAL_MIN || 30);
const emailMarketingSavedSearch = process.env.EMAIL_MARKETING_SAVED_SEARCH !== "false";
const emailMarketingPriceDrop = process.env.EMAIL_MARKETING_PRICE_DROP !== "false";
const emailUnsubSecret = process.env.EMAIL_UNSUB_SECRET || sessionSecret;
const emailMarketingCooldownHours = Number(process.env.EMAIL_MARKETING_COOLDOWN_HOURS || 12);

const smtpHost = process.env.SMTP_HOST;
const smtpTransport = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        : undefined
    })
  : null;

async function sendEmail({ to, subject, text, html }) {
  if (!smtpTransport) {
    throw new Error("email_not_configured");
  }
  return smtpTransport.sendMail({
    from: emailFrom,
    to,
    subject,
    text,
    html
  });
}

async function logEmailEvent({ userEmail, type, variant, subject, meta, id }) {
  try {
    const eventId = id || crypto.randomUUID();
    await pool.query(
      "INSERT INTO email_events (id, user_email, type, variant, subject, meta) VALUES ($1, $2, $3, $4, $5, $6)",
      [eventId, String(userEmail), type, variant, subject, meta || {}]
    );
    return eventId;
  } catch {
    // ignore
  }
  return null;
}

function pickVariant(userEmail, type) {
  const hash = crypto.createHash("sha256").update(`${userEmail}:${type}`).digest("hex");
  const bucket = parseInt(hash.slice(0, 2), 16);
  return bucket % 2 === 0 ? "A" : "B";
}

function signUnsubscribe(email) {
  return crypto.createHmac("sha256", emailUnsubSecret).update(String(email)).digest("hex");
}

function buildUnsubscribeLink(email) {
  if (!publicBaseUrl) return "";
  const url = new URL("/api/email/unsubscribe", publicBaseUrl);
  url.searchParams.set("email", String(email));
  url.searchParams.set("sig", signUnsubscribe(email));
  return url.toString();
}

function renderSavedSearchEmail({ variant, label, items, link, trackingUrl, unsubscribeUrl }) {
  const subject = variant === "B"
    ? `New matches for ${label} · AppoCar`
    : `We found new cars for "${label}"`;
  const intro = variant === "B"
    ? "Fresh matches are waiting — compare listings in seconds."
    : "Here are the newest listings that match your saved search.";
  const list = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;font-weight:600;">${item.title}</td>
          <td style="padding:8px 0;text-align:right;">${item.price} ${item.currency || "EUR"}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding-bottom:12px;color:#64748b;font-size:13px;">${item.location} · ${item.year}</td>
        </tr>`
    )
    .join("");
  const html = `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#f6f7fb;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;">
        <h2 style="margin:0 0 8px;color:#0f172a;">${subject}</h2>
        <p style="margin:0 0 16px;color:#475569;">${intro}</p>
        <table width="100%" cellspacing="0" cellpadding="0">${list}</table>
        ${link ? `<a href="${link}" style="display:inline-block;margin-top:16px;background:#111827;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;">Open search</a>` : ""}
        ${unsubscribeUrl ? `<p style="margin-top:16px;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a></p>` : ""}
        <p style="margin-top:12px;color:#94a3b8;font-size:12px;">AppoCar · Verified marketplace</p>
      </div>
    </div>`;
  const text = `${intro}\n${items.map((i) => `${i.title} - ${i.price} ${i.currency || "EUR"} - ${i.location}`).join("\n")}\n${link || ""}\n${unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ""}`;
  return { subject, html, text };
}

function renderPriceDropEmail({ variant, listing, link, trackingUrl, unsubscribeUrl }) {
  const subject = variant === "B"
    ? `Price drop: ${listing.title}`
    : `${listing.title} is now ${listing.new_price}`;
  const intro = variant === "B"
    ? "A car you saved just dropped in price."
    : "Good news — the price went down.";
  const html = `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;background:#f6f7fb;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;">
        <h2 style="margin:0 0 8px;color:#0f172a;">${subject}</h2>
        <p style="margin:0 0 16px;color:#475569;">${intro}</p>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;">
          <div style="font-weight:700;color:#0f172a;">${listing.title}</div>
          <div style="color:#64748b;font-size:13px;margin:6px 0 12px;">${listing.location} · ${listing.year}</div>
          <div style="font-size:18px;color:#0f172a;">
            <span style="text-decoration:line-through;color:#94a3b8;margin-right:8px;">${listing.old_price}</span>
            <span style="font-weight:700;">${listing.new_price}</span>
          </div>
        </div>
        ${link ? `<a href="${link}" style="display:inline-block;margin-top:16px;background:#111827;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;">View listing</a>` : ""}
        ${unsubscribeUrl ? `<p style="margin-top:16px;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe</a></p>` : ""}
        <p style="margin-top:12px;color:#94a3b8;font-size:12px;">AppoCar · Verified marketplace</p>
      </div>
    </div>`;
  const text = `${intro}\n${listing.title}\nOld: ${listing.old_price} New: ${listing.new_price}\n${link || ""}\n${unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ""}`;
  return { subject, html, text };
}

const uploadDir = path.join(__dirname, "uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    require("fs").mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const stamp = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${stamp}_${safe}`);
  }
});
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, WEBP, or HEIC images are allowed"));
    }
    cb(null, true);
  }
});

app.use("/uploads", express.static(uploadDir));

const moderationEnabled = process.env.MODERATION_ENABLED !== "false";
const ocrEnabled = process.env.OCR_ENABLED !== "false";
const minWidth = Number(process.env.MIN_IMAGE_WIDTH || 900);
const minHeight = Number(process.env.MIN_IMAGE_HEIGHT || 700);
const blurThreshold = Number(process.env.BLUR_THRESHOLD || 25);
const ocrLangs = process.env.OCR_LANGS || "eng";
const bannedTerms = (process.env.BANNED_OCR_TERMS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const maxUploadsPerDay = Number(process.env.MAX_UPLOADS_PER_DAY || 0);

const chatRooms = new Map();
const socketMeta = new WeakMap();

function joinRoom(conversationId, ws) {
  if (!chatRooms.has(conversationId)) {
    chatRooms.set(conversationId, new Set());
  }
  chatRooms.get(conversationId).add(ws);
  const meta = socketMeta.get(ws);
  if (meta?.rooms) {
    meta.rooms.add(conversationId);
  }
  broadcastPresence(conversationId);
}

function leaveRooms(ws) {
  for (const [conversationId, sockets] of chatRooms.entries()) {
    if (sockets.has(ws)) {
      sockets.delete(ws);
      const meta = socketMeta.get(ws);
      if (meta?.rooms) {
        meta.rooms.delete(conversationId);
      }
      if (sockets.size === 0) {
        chatRooms.delete(conversationId);
      }
      broadcastPresence(conversationId);
    }
  }
}

function broadcastToConversation(conversationId, payload) {
  const sockets = chatRooms.get(conversationId);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function broadcastPresence(conversationId) {
  const sockets = chatRooms.get(conversationId);
  if (!sockets) return;
  const online = new Set();
  sockets.forEach((client) => {
    const meta = socketMeta.get(client);
    if (meta?.email) {
      online.add(meta.email);
    }
  });
  const payload = JSON.stringify({
    type: "presence",
    conversationId,
    online: Array.from(online)
  });
  sockets.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: cookieSameSite,
    maxAge: sessionTtlDays * 24 * 60 * 60 * 1000,
    path: "/"
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseCookies(header = "") {
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

async function getAuthUserFromWs(req) {
  const cookieHeader = req.headers?.cookie || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[cookieName];
  if (token) {
    const user = await getSessionUser(String(token));
    if (user) return user;
  }
  const headerEmail = req.headers?.["x-user-email"];
  if (headerEmail) {
    const user = await upsertUser({ email: String(headerEmail), name: String(req.headers["x-user-name"] || headerEmail) });
    return user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;
  }
  return null;
}

function buildVerificationLink(token, origin) {
  const base = publicWebBaseUrl || publicBaseUrl || origin || allowedOrigins[0] || "";
  if (!base) return null;
  try {
    const url = new URL("/verify-email", base);
    url.searchParams.set("token", token);
    if (origin) {
      url.searchParams.set("redirect", origin);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function buildSavedSearchQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (Array.isArray(value)) {
      query.set(key, value.join(","));
    } else {
      query.set(key, String(value));
    }
  });
  return query;
}

function buildListingWhere(params = {}, extra = {}) {
  const filters = [];
  const values = [];

  const push = (sql, value) => {
    values.push(value);
    filters.push(sql.replace("?", `$${values.length}`));
  };
  const pushRaw = (sql) => {
    filters.push(sql);
  };

  const {
    query,
    make,
    model,
    priceMin,
    priceMax,
    yearMin,
    yearMax,
    mileageMin,
    mileageMax,
    fuel,
    transmission,
    body,
    drive,
    sellerType,
    dealType,
    verifiedOnly,
    color,
    location,
    doors,
    seats,
    powerMin,
    powerMax,
    evRangeMin,
    evBatteryMin,
    evFastChargeMin,
    evChargeType,
    co2Min,
    co2Max,
    consumptionMin,
    consumptionMax,
    category
  } = params;

  if (query) push("(title ILIKE ?)", `%${query}%`);
  if (make) push("COALESCE(make, title) ILIKE ?", `%${make}%`);
  if (model) push("COALESCE(model, title) ILIKE ?", `%${model}%`);
  if (priceMin) push("price >= ?", Number(priceMin));
  if (priceMax) push("price <= ?", Number(priceMax));
  if (yearMin) push("year >= ?", Number(yearMin));
  if (yearMax) push("year <= ?", Number(yearMax));
  if (mileageMin) push("mileage_km >= ?", Number(mileageMin));
  if (mileageMax) push("mileage_km <= ?", Number(mileageMax));
  if (fuel) {
    const fuels = String(fuel).split(",").map((item) => item.trim()).filter(Boolean);
    if (fuels.length > 1) {
      push("fuel = ANY(?)", fuels);
    } else if (fuels.length === 1) {
      push("fuel = ?", fuels[0]);
    }
  }
  if (transmission) push("transmission = ?", String(transmission));
  if (body) {
    const bodies = String(body).split(",").map((item) => item.trim()).filter(Boolean);
    if (bodies.length > 1) {
      push("body = ANY(?)", bodies);
    } else if (bodies.length === 1) {
      push("body = ?", bodies[0]);
    }
  }
  if (drive) push("drive = ?", String(drive));
  if (sellerType) push("seller_type = ?", String(sellerType));
  if (dealType) push("deal_type = ?", String(dealType));
  if (verifiedOnly === "true") push("(verified = TRUE OR seller_type = 'Dealer')");
  if (color) push("LOWER(color) = LOWER(?)", String(color));
  if (location) {
    const locations = String(location)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (locations.length === 1) {
      push("LOWER(location) LIKE LOWER(?)", `%${locations[0]}%`);
    } else if (locations.length > 1) {
      const clauses = locations.map((item) => {
        values.push(`%${item}%`);
        return `LOWER(location) LIKE LOWER($${values.length})`;
      });
      filters.push(`(${clauses.join(" OR ")})`);
    }
  }
  if (doors) push("doors = ?", Number(doors));
  if (seats) push("seats = ?", Number(seats));
  if (powerMin) push("power_kw >= ?", Number(powerMin));
  if (powerMax) push("power_kw <= ?", Number(powerMax));
  if (evRangeMin) push("ev_range_km >= ?", Number(evRangeMin));
  if (evBatteryMin) push("ev_battery_kwh >= ?", Number(evBatteryMin));
  if (evFastChargeMin) push("ev_fast_charge_kw >= ?", Number(evFastChargeMin));
  if (evChargeType) push("LOWER(ev_charge_type) = LOWER(?)", String(evChargeType));
  if (co2Min) push("co2_g_km >= ?", Number(co2Min));
  if (co2Max) push("co2_g_km <= ?", Number(co2Max));
  if (consumptionMin) {
    push(
      "NULLIF(regexp_replace(consumption, '[^0-9\\.]', '', 'g'), '')::float >= ?",
      Number(consumptionMin)
    );
  }
  if (consumptionMax) {
    push(
      "NULLIF(regexp_replace(consumption, '[^0-9\\.]', '', 'g'), '')::float <= ?",
      Number(consumptionMax)
    );
  }

  if (category === "Luxury") push("price >= ?", 45000);
  if (category === "Deals") push("price <= ?", 20000);
  if (category === "NewArrivals") push("year >= ?", 2021);
  if (category === "Vans") pushRaw("body IN ('Wagon','SUV')");

  if (extra.createdAfter) {
    values.push(extra.createdAfter);
    filters.push(`created_at > $${values.length}`);
  }

  const features = typeof params.features === "string"
    ? params.features.split(",").map((item) => item.trim()).filter(Boolean)
    : Array.isArray(params.features)
      ? params.features
      : [];
  if (features.length) {
    push("features @> ?::jsonb", JSON.stringify(features));
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  return { where, values };
}

async function issueEmailVerification(email, origin) {
  if (!emailVerificationEnabled) return { ok: false, skipped: true };
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + verificationTtlHours * 60 * 60 * 1000);
  await pool.query(
    "UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE email = $3",
    [tokenHash, expiresAt, String(email)]
  );
  if (!smtpTransport) {
    return { ok: false, error: "email_not_configured" };
  }
  const link = buildVerificationLink(token, origin);
  if (!link) return { ok: false, error: "verification_link_failed" };
  await sendEmail({
    to: String(email),
    subject: "Verify your AppoCar account",
    text: `Confirm your AppoCar email: ${link}`,
    html: `<p>Confirm your AppoCar email:</p><p><a href="${link}">${link}</a></p>`
  });
  return { ok: true };
}

async function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [user.id, tokenHash, expiresAt]
  );
  return { token, expiresAt };
}

async function getSessionUser(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const { rows } = await pool.query(
    "SELECT users.id, users.email, users.name, users.role, users.email_verified FROM auth_sessions JOIN users ON users.id = auth_sessions.user_id WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1",
    [tokenHash]
  );
  return rows[0] || null;
}

async function upsertUser({ email, name, provider, providerId, passwordHash, emailVerified }) {
  if (!email) return null;
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email]);
  if (rows[0]) {
    await pool.query(
      "UPDATE users SET name = COALESCE($1, name), provider = COALESCE($2, provider), provider_id = COALESCE($3, provider_id), email_verified = COALESCE($4, email_verified), last_login = NOW() WHERE id = $5",
      [name || null, provider || null, providerId || null, emailVerified ?? null, rows[0].id]
    );
    return { ...rows[0], name: name || rows[0].name, provider: provider || rows[0].provider };
  }
  const { rows: inserted } = await pool.query(
    "INSERT INTO users (email, name, provider, provider_id, password_hash, email_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [email, name || null, provider || null, providerId || null, passwordHash || null, emailVerified ?? false]
  );
  return inserted[0];
}

function normalizeOrigin(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function resolveRedirect(candidate) {
  const fallback = allowedOrigins[0] || process.env.AUTH_REDIRECT_URL || "";
  if (!candidate) return fallback;
  const origin = normalizeOrigin(candidate);
  if (!origin) return fallback;
  if (allowedOrigins.length === 0) return candidate;
  return allowedOrigins.includes(origin) ? candidate : fallback;
}

async function createOAuthState(provider, redirect) {
  const state = crypto.randomBytes(16).toString("hex");
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await pool.query(
    "INSERT INTO oauth_states (provider, state, redirect, expires_at) VALUES ($1, $2, $3, $4)",
    [provider, state, redirect || null, expires]
  );
  return state;
}

async function consumeOAuthState(provider, state) {
  const { rows } = await pool.query(
    "SELECT id, redirect FROM oauth_states WHERE provider = $1 AND state = $2 AND expires_at > NOW() LIMIT 1",
    [provider, state]
  );
  if (!rows[0]) return null;
  await pool.query("DELETE FROM oauth_states WHERE id = $1", [rows[0].id]);
  return rows[0].redirect;
}

async function requireAuth(req, res, next) {
  const user = await getAuthUser(req);
  if (!user?.email) {
    return res.status(401).json({ error: "unauthorized" });
  }
  req.user = user;
  next();
}

async function requireAdmin(req, res, next) {
  const user = await getAuthUser(req);
  if (!user?.email) return res.status(401).json({ error: "unauthorized" });
  const isAdmin = user.role === "admin" || String(user.email).toLowerCase() === adminEmail;
  if (!isAdmin) return res.status(403).json({ error: "forbidden" });
  req.user = user;
  next();
}

async function checkBlur(filePath) {
  if (!sharp) return false;
  const { data, info } = await sharp(filePath)
    .resize(256, 256, { fit: "inside" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  if (!width || !height) return false;
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  const idx = (x, y) => y * width + x;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const lap =
        data[idx(x - 1, y)] +
        data[idx(x + 1, y)] +
        data[idx(x, y - 1)] +
        data[idx(x, y + 1)] -
        4 * data[idx(x, y)];
      sum += lap;
      sumSq += lap * lap;
      count += 1;
    }
  }
  if (!count) return false;
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return variance < blurThreshold;
}

async function analyzeOcrText(filePath) {
  if (!tesseract || !ocrEnabled) return { text: "", contact: false, banned: false };
  const result = await tesseract.recognize(filePath, ocrLangs);
  const text = (result?.data?.text || "").toLowerCase();
  if (!text) return { text: "", contact: false, banned: false };
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const urlRegex = /(https?:\/\/|www\.)[^\s]+/i;
  const phoneRegex = /(\+?\d[\d\s().-]{6,}\d)/;
  const contactDetected = emailRegex.test(text) || urlRegex.test(text) || phoneRegex.test(text);
  const bannedDetected = bannedTerms.length > 0 && bannedTerms.some((term) => text.includes(term));
  return { text, contact: contactDetected, banned: bannedDetected };
}

async function logModerationEvent({ userEmail, fileName, status, reason, meta }) {
  try {
    await pool.query(
      "INSERT INTO moderation_events (user_email, file_name, status, reason, meta) VALUES ($1, $2, $3, $4, $5)",
      [userEmail || null, fileName || null, status, reason || null, meta || {}]
    );
  } catch {
    // ignore
  }
}

function getRequestMeta(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded ? String(forwarded).split(",")[0] : req.socket?.remoteAddress;
  const userAgent = req.headers["user-agent"] ? String(req.headers["user-agent"]) : "";
  return { ip, userAgent };
}

async function markConversationRead(conversationId, readerEmail) {
  const { rows } = await pool.query(
    "UPDATE chat_messages SET read_at = NOW() WHERE conversation_id = $1 AND sender_email <> $2 AND read_at IS NULL RETURNING id, read_at",
    [conversationId, String(readerEmail)]
  );
  return rows;
}

async function getConversationParticipants(conversationId) {
  const { rows } = await pool.query(
    "SELECT buyer_email, seller_email, listing_id FROM conversations WHERE id = $1 LIMIT 1",
    [conversationId]
  );
  return rows[0];
}

async function logAnalyticsEvent({ eventType, userEmail, listingId, meta }) {
  try {
    await pool.query(
      "INSERT INTO analytics_events (event_type, user_email, listing_id, meta) VALUES ($1, $2, $3, $4)",
      [eventType, userEmail || null, listingId || null, meta || {}]
    );
  } catch {
    // ignore
  }
}

async function createNotification({ userEmail, type, title, body, meta }) {
  try {
    await pool.query(
      "INSERT INTO notifications (user_email, type, title, body, meta) VALUES ($1, $2, $3, $4, $5)",
      [String(userEmail), type, title, body || null, meta || {}]
    );
  } catch {
    // ignore
  }
}

function matchesSavedSearch(listing, paramsString) {
  if (!paramsString) return false;
  let params;
  try {
    params = new URLSearchParams(paramsString);
  } catch {
    return false;
  }
  const title = String(listing.title || "").toLowerCase();
  const make = params.get("make");
  const model = params.get("model");
  const query = params.get("query");
  const priceMax = params.get("priceMax");
  const fuel = params.get("fuel");
  const body = params.get("body");
  if (make && !title.includes(make.toLowerCase())) return false;
  if (model && !title.includes(model.toLowerCase())) return false;
  if (query && !title.includes(query.toLowerCase())) return false;
  if (priceMax && Number(listing.price) > Number(priceMax)) return false;
  if (fuel) {
    const fuels = fuel.includes(",") ? fuel.split(",") : [fuel];
    if (!fuels.includes(String(listing.fuel))) return false;
  }
  if (body) {
    const bodies = body.includes(",") ? body.split(",") : [body];
    if (!bodies.includes(String(listing.body))) return false;
  }
  return true;
}

async function canEmailUser(email) {
  if (!email) return false;
  if (!emailVerificationEnabled && !emailVerificationRequired) return true;
  try {
    const { rows: unsub } = await pool.query("SELECT 1 FROM email_unsubscribes WHERE user_email = $1 LIMIT 1", [
      email
    ]);
    if (unsub.length > 0) return false;
    const { rows } = await pool.query("SELECT email_verified FROM users WHERE email = $1 LIMIT 1", [email]);
    if (!rows[0]) return false;
    if (emailVerificationRequired) return rows[0].email_verified === true;
    return true;
  } catch {
    return false;
  }
}

async function runSavedSearchEmails() {
  if (!smtpTransport || !emailMarketingSavedSearch) return { sent: 0, skipped: 0 };
  const { rows: searches } = await pool.query("SELECT id, user_email, label, params FROM saved_searches");
  let sent = 0;
  let skipped = 0;

  for (const search of searches) {
    if (!(await canEmailUser(search.user_email))) {
      skipped += 1;
      continue;
    }
    let lastSent = null;
    const { rows: deliveries } = await pool.query(
      "SELECT last_sent_at FROM saved_search_deliveries WHERE search_id = $1 AND user_email = $2 LIMIT 1",
      [search.id, search.user_email]
    );
    if (deliveries[0]?.last_sent_at) lastSent = deliveries[0].last_sent_at;
    if (lastSent) {
      const diffHours = (Date.now() - new Date(lastSent).getTime()) / (1000 * 60 * 60);
      if (diffHours < emailMarketingCooldownHours) {
        skipped += 1;
        continue;
      }
    }
    const since = lastSent ? new Date(lastSent) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const params = Object.fromEntries(new URLSearchParams(search.params || ""));
    const { where, values } = buildListingWhere(params, { createdAfter: since });
    const query = `SELECT id, title, price, currency, location, year FROM listings ${where} ORDER BY created_at DESC LIMIT 5`;
    const { rows: items } = await pool.query(query, values);
    if (items.length === 0) continue;

    const variant = pickVariant(search.user_email, "saved_search");
    const link = publicWebBaseUrl ? `${publicWebBaseUrl.replace(/\\/$/, "")}/search?${search.params}` : "";
    const eventId = crypto.randomUUID();
    const trackingUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\\/$/, "")}/api/email/open?id=${eventId}` : "";
    const unsubscribeUrl = buildUnsubscribeLink(search.user_email);
    const emailPayload = renderSavedSearchEmail({
      variant,
      label: search.label,
      items,
      link,
      trackingUrl,
      unsubscribeUrl
    });
    if (trackingUrl) {
      emailPayload.html = emailPayload.html.replace(
        "</div></div>",
        `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none;" /></div></div>`
      );
    }
    await logEmailEvent({
      userEmail: search.user_email,
      type: "saved_search",
      variant,
      subject: emailPayload.subject,
      meta: { searchId: search.id, total: items.length },
      id: eventId
    });
    await sendEmail({
      to: search.user_email,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html
    });
    await pool.query(
      "INSERT INTO saved_search_deliveries (search_id, user_email, last_sent_at) VALUES ($1, $2, NOW()) ON CONFLICT (search_id, user_email) DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at",
      [search.id, search.user_email]
    );
    await createNotification({
      userEmail: search.user_email,
      type: "saved_search_email",
      title: "New saved search results",
      body: `${items.length} new listings for "${search.label}"`,
      meta: { searchId: search.id }
    });
    sent += 1;
  }
  return { sent, skipped };
}

async function runPriceDropEmails() {
  if (!smtpTransport || !emailMarketingPriceDrop) return { sent: 0, skipped: 0 };
  const { rows: drops } = await pool.query(`
    SELECT DISTINCT ON (f.user_email, e.listing_id)
      f.user_email,
      e.listing_id,
      e.old_price,
      e.new_price,
      e.created_at,
      l.title,
      l.location,
      l.year
    FROM price_drop_events e
    JOIN favorites f ON f.listing_id = e.listing_id
    JOIN listings l ON l.id = e.listing_id
    LEFT JOIN price_drop_notifications n
      ON n.user_email = f.user_email AND n.listing_id = e.listing_id
    WHERE n.last_sent_at IS NULL OR n.last_sent_at < e.created_at
    ORDER BY f.user_email, e.listing_id, e.created_at DESC
    LIMIT 200
  `);

  let sent = 0;
  let skipped = 0;

  for (const drop of drops) {
    if (!(await canEmailUser(drop.user_email))) {
      skipped += 1;
      continue;
    }
    if (drop.last_sent_at) {
      const diffHours = (Date.now() - new Date(drop.last_sent_at).getTime()) / (1000 * 60 * 60);
      if (diffHours < emailMarketingCooldownHours) {
        skipped += 1;
        continue;
      }
    }
    const variant = pickVariant(drop.user_email, "price_drop");
    const link = publicWebBaseUrl ? `${publicWebBaseUrl.replace(/\\/$/, "")}/listing/${drop.listing_id}` : "";
    const eventId = crypto.randomUUID();
    const trackingUrl = publicBaseUrl ? `${publicBaseUrl.replace(/\\/$/, "")}/api/email/open?id=${eventId}` : "";
    const unsubscribeUrl = buildUnsubscribeLink(drop.user_email);
    const emailPayload = renderPriceDropEmail({
      variant,
      listing: drop,
      link,
      trackingUrl,
      unsubscribeUrl
    });
    if (trackingUrl) {
      emailPayload.html = emailPayload.html.replace(
        "</div></div>",
        `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:none;" /></div></div>`
      );
    }
    await logEmailEvent({
      userEmail: drop.user_email,
      type: "price_drop",
      variant,
      subject: emailPayload.subject,
      meta: { listingId: drop.listing_id, oldPrice: drop.old_price, newPrice: drop.new_price },
      id: eventId
    });
    await sendEmail({
      to: drop.user_email,
      subject: emailPayload.subject,
      text: emailPayload.text,
      html: emailPayload.html
    });
    await pool.query(
      "INSERT INTO price_drop_notifications (listing_id, user_email, last_sent_at) VALUES ($1, $2, NOW()) ON CONFLICT (listing_id, user_email) DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at",
      [drop.listing_id, drop.user_email]
    );
    await createNotification({
      userEmail: drop.user_email,
      type: "price_drop_email",
      title: "Price drop",
      body: `${drop.title} dropped to ${drop.new_price}`,
      meta: { listingId: drop.listing_id, oldPrice: drop.old_price, newPrice: drop.new_price }
    });
    sent += 1;
  }
  return { sent, skipped };
}

let marketingRunning = false;
async function runMarketingJobs() {
  if (marketingRunning) return { running: true };
  marketingRunning = true;
  try {
    const savedSearch = await runSavedSearchEmails();
    const priceDrop = await runPriceDropEmails();
    return { savedSearch, priceDrop };
  } finally {
    marketingRunning = false;
  }
}

async function moderateImage(filePath) {
  if (!moderationEnabled || !sharp) return { ok: true };
  const meta = await sharp(filePath).metadata();
  if (!meta.width || !meta.height || meta.width < minWidth || meta.height < minHeight) {
    return { ok: false, reason: "resolution_too_small", meta: { width: meta.width, height: meta.height } };
  }
  const blurry = await checkBlur(filePath);
  if (blurry) return { ok: false, reason: "image_blurry", meta: { blur: true } };
  const ocr = await analyzeOcrText(filePath);
  const safeText = ocr.text ? ocr.text.slice(0, 300) : "";
  if (ocr.contact) return { ok: false, reason: "contact_info_detected", meta: { contact: true, ocrText: safeText } };
  if (ocr.banned) return { ok: false, reason: "banned_terms_detected", meta: { banned: true, ocrText: safeText } };
  return { ok: true, meta: { width: meta.width, height: meta.height } };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/analytics/event", async (req, res) => {
  try {
    const { type, listingId, meta } = req.body || {};
    if (!type) return res.status(400).json({ error: "type_required" });
    const user = await getAuthUser(req);
    await logAnalyticsEvent({
      eventType: String(type),
      userEmail: user?.email || null,
      listingId: listingId ? String(listingId) : null,
      meta: meta || {}
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "analytics_failed" });
  }
});

app.get("/api/admin/moderation", requireAdmin, async (req, res) => {
  try {
    const status = req.query.status ? String(req.query.status) : "";
    const decision = req.query.decision ? String(req.query.decision) : "";
    const userEmail = req.query.userEmail ? String(req.query.userEmail) : "";
    const reason = req.query.reason ? String(req.query.reason) : "";
    const q = req.query.q ? String(req.query.q) : "";
    const from = req.query.from ? String(req.query.from) : "";
    const to = req.query.to ? String(req.query.to) : "";
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const filters = [];
    const values = [];
    const push = (sql, value) => {
      values.push(value);
      filters.push(sql.replace("?", `$${values.length}`));
    };
    const pushRaw = (sql) => {
      filters.push(sql);
    };

    if (status && status !== "all") push("status = ?", status);
    if (decision) {
      if (decision === "pending") {
        pushRaw("decision_status IS NULL");
      } else {
        push("decision_status = ?", decision);
      }
    }
    if (userEmail) push("LOWER(user_email) LIKE LOWER(?)", `%${userEmail}%`);
    if (reason) push("LOWER(reason) LIKE LOWER(?)", `%${reason}%`);
    if (q) {
      const value = `%${q}%`;
      values.push(value);
      const a = values.length;
      values.push(value);
      const b = values.length;
      values.push(value);
      const c = values.length;
      filters.push(`(LOWER(user_email) LIKE LOWER($${a}) OR LOWER(reason) LIKE LOWER($${b}) OR LOWER(file_name) LIKE LOWER($${c}))`);
    }
    if (from) push("created_at >= ?", new Date(from));
    if (to) push("created_at <= ?", new Date(to));

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const countQuery = `SELECT COUNT(*) FROM moderation_events ${where}`;
    const dataQuery = `
      SELECT *
      FROM moderation_events
      ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;
    const countResult = await pool.query(countQuery, values);
    const { rows } = await pool.query(dataQuery, [...values, limit, offset]);

    res.json({
      count: Number(countResult.rows[0]?.count || 0),
      items: rows.map((row) => ({
        id: row.id,
        userEmail: row.user_email,
        fileName: row.file_name,
        status: row.status,
        reason: row.reason,
        meta: row.meta,
        createdAt: row.created_at,
        reviewedAt: row.reviewed_at,
        reviewedBy: row.reviewed_by,
        decisionStatus: row.decision_status,
        decisionNote: row.decision_note,
        fileUrl: row.file_name ? `/uploads/${row.file_name}` : null
      }))
    });
  } catch {
    res.status(500).json({ error: "Failed to load moderation queue" });
  }
});

app.post("/api/admin/moderation/:id/resolve", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body || {};
    if (!id || !decision) return res.status(400).json({ error: "decision_required" });
    await pool.query(
      "UPDATE moderation_events SET decision_status = $1, decision_note = $2, reviewed_at = NOW(), reviewed_by = $3 WHERE id = $4",
      [String(decision), note ? String(note) : null, String(req.user.email), id]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to resolve moderation event" });
  }
});

app.get("/api/vin", async (req, res) => {
  try {
    const vin = String(req.query.vin || "").trim();
    if (!vin) return res.status(400).json({ error: "vin_required" });

    const baseUrl = process.env.CEBIA_API_URL;
    if (!baseUrl) {
      return res.status(501).json({ error: "vin_lookup_not_configured" });
    }

    const url = baseUrl.includes("{vin}")
      ? baseUrl.replace("{vin}", encodeURIComponent(vin))
      : `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}vin=${encodeURIComponent(vin)}`;

    const headers = { Accept: "application/json" };
    const headerName = process.env.CEBIA_API_HEADER || "x-api-key";
    if (process.env.CEBIA_API_KEY) {
      headers[headerName] = process.env.CEBIA_API_KEY;
    }
    if (process.env.CEBIA_AUTH) {
      headers.Authorization = process.env.CEBIA_AUTH;
    }

    const response = await fetch(url, { headers });
    const raw = await response.text();
    let data = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: "vin_lookup_failed", details: data });
    }
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ error: "vin_lookup_error" });
  }
});

app.get("/api/brands", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT name, slug FROM car_brands ORDER BY popular_rank ASC, name ASC");
    res.json({ items: rows });
  } catch {
    res.status(500).json({ items: [] });
  }
});

app.get("/api/models", async (req, res) => {
  try {
    const brand = String(req.query.brand || "").trim();
    if (!brand) return res.json({ items: [] });
    const { rows: brandRows } = await pool.query(
      "SELECT id FROM car_brands WHERE name ILIKE $1 OR slug = $2 LIMIT 1",
      [brand, slugify(brand)]
    );
    const brandId = brandRows[0]?.id;
    if (!brandId) return res.json({ items: [] });
    const { rows } = await pool.query("SELECT name FROM car_models WHERE brand_id = $1 ORDER BY name ASC", [brandId]);
    res.json({ items: rows.map((row) => row.name) });
  } catch {
    res.status(500).json({ items: [] });
  }
});

app.post("/api/listings/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE listings SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1", [id]);
    await logAnalyticsEvent({
      eventType: "listing_view",
      userEmail: (await getAuthUser(req))?.email || null,
      listingId: id,
      meta: { path: req.headers.referer || null }
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "view_failed" });
  }
});

app.patch("/api/listings/:id/price", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { price } = req.body || {};
    if (!price) return res.status(400).json({ error: "price_required" });
    const { rows } = await pool.query(
      "SELECT id, price, title, fuel, body, seller_email FROM listings WHERE id = $1",
      [id]
    );
    const listing = rows[0];
    if (!listing) return res.status(404).json({ error: "not_found" });
    if (String(listing.seller_email || "").toLowerCase() !== String(user.email).toLowerCase()) {
      return res.status(403).json({ error: "forbidden" });
    }
    const oldPrice = Number(listing.price);
    const newPrice = Number(price);
    await pool.query("UPDATE listings SET price = $1 WHERE id = $2", [newPrice, id]);

    if (newPrice < oldPrice) {
      await pool.query(
        "INSERT INTO price_drop_events (listing_id, old_price, new_price) VALUES ($1, $2, $3)",
        [id, oldPrice, newPrice]
      );
      const { rows: searches } = await pool.query(
        "SELECT id, user_email, label, params FROM saved_searches"
      );
      for (const search of searches) {
        if (matchesSavedSearch({ ...listing, price: newPrice }, search.params)) {
          await createNotification({
            userEmail: search.user_email,
            type: "price_drop",
            title: "Price drop match",
            body: `${listing.title} dropped to ${newPrice}`,
            meta: { listingId: id, previousPrice: oldPrice, newPrice }
          });
        }
      }
    }

    res.json({ ok: true, price: newPrice });
  } catch {
    res.status(500).json({ error: "price_update_failed" });
  }
});

app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  try {
    const rangeDays = Number(req.query.days || 30);
    const { rows: views } = await pool.query(
      "SELECT COUNT(*) FROM analytics_events WHERE event_type = 'listing_view' AND created_at >= NOW() - INTERVAL '1 day' * $1",
      [rangeDays]
    );
    const { rows: impressions } = await pool.query(
      "SELECT COUNT(*) FROM analytics_events WHERE event_type = 'search_impression' AND created_at >= NOW() - INTERVAL '1 day' * $1",
      [rangeDays]
    );
    const { rows: contacts } = await pool.query(
      "SELECT COUNT(*) FROM analytics_events WHERE event_type = 'contact_click' AND created_at >= NOW() - INTERVAL '1 day' * $1",
      [rangeDays]
    );
    const viewCount = Number(views[0]?.count || 0);
    const impressionCount = Number(impressions[0]?.count || 0);
    const contactCount = Number(contacts[0]?.count || 0);
    const ctr = impressionCount ? (viewCount / impressionCount) * 100 : 0;
    const contactRate = viewCount ? (contactCount / viewCount) * 100 : 0;
    const { rows: recent } = await pool.query(
      "SELECT event_type, user_email, listing_id, created_at FROM analytics_events ORDER BY created_at DESC LIMIT 20"
    );
    const { rows: unread } = await pool.query(
      "SELECT COUNT(*) FROM notifications WHERE read_at IS NULL"
    );

    res.json({
      rangeDays,
      views: viewCount,
      impressions: impressionCount,
      ctr: Number(ctr.toFixed(2)),
      contacts: contactCount,
      contactRate: Number(contactRate.toFixed(2)),
      unreadNotifications: Number(unread[0]?.count || 0),
      recentEvents: recent
    });
  } catch {
    res.status(500).json({ error: "analytics_failed" });
  }
});

app.get("/api/admin/email-stats", requireAdmin, async (req, res) => {
  try {
    const rangeDays = Number(req.query.days || 30);
    const { rows } = await pool.query(
      `SELECT e.type, e.variant, COUNT(*) AS sent, COUNT(o.id) AS opens, MAX(e.sent_at) AS last_sent
       FROM email_events e
       LEFT JOIN email_opens o ON o.event_id = e.id
       WHERE e.sent_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY e.type, e.variant
       ORDER BY e.type, e.variant`,
      [rangeDays]
    );
    res.json({
      rangeDays,
      items: rows.map((row) => ({
        type: row.type,
        variant: row.variant,
        sent: Number(row.sent),
        opens: Number(row.opens),
        lastSent: row.last_sent
      }))
    });
  } catch {
    res.status(500).json({ error: "email_stats_failed" });
  }
});

app.get("/api/email/open", async (req, res) => {
  try {
    const id = String(req.query.id || "").trim();
    if (id) {
      await pool.query("INSERT INTO email_opens (event_id) VALUES ($1) ON CONFLICT DO NOTHING", [id]);
    }
  } catch {
    // ignore
  }
  const pixel = Buffer.from(
    "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
    "base64"
  );
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store");
  res.status(200).send(pixel);
});

app.get("/api/email/unsubscribe", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim().toLowerCase();
    const sig = String(req.query.sig || "");
    if (!email || !sig || signUnsubscribe(email) !== sig) {
      return res.status(400).send("Invalid unsubscribe link.");
    }
    await pool.query("INSERT INTO email_unsubscribes (user_email) VALUES ($1) ON CONFLICT DO NOTHING", [email]);
    res.send("You have been unsubscribed.");
  } catch {
    res.status(500).send("Unable to unsubscribe.");
  }
});

app.get("/api/saved-searches", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { rows } = await pool.query(
      "SELECT id, label, params, created_at FROM saved_searches WHERE user_email = $1 ORDER BY created_at DESC",
      [String(user.email)]
    );
    res.json({ items: rows });
  } catch {
    res.status(500).json({ error: "saved_searches_failed" });
  }
});

app.post("/api/saved-searches", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { label, params } = req.body || {};
    if (!label || !params) return res.status(400).json({ error: "label_params_required" });
    const { rows } = await pool.query(
      "INSERT INTO saved_searches (user_email, label, params) VALUES ($1, $2, $3) RETURNING *",
      [String(user.email), String(label), String(params)]
    );
    await createNotification({
      userEmail: user.email,
      type: "saved_search",
      title: "Saved search created",
      body: String(label),
      meta: { params }
    });
    res.status(201).json({ item: rows[0] });
  } catch {
    res.status(500).json({ error: "saved_searches_failed" });
  }
});

app.delete("/api/saved-searches/:id", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    await pool.query("DELETE FROM saved_searches WHERE id = $1 AND user_email = $2", [
      String(id),
      String(user.email)
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "saved_searches_failed" });
  }
});

app.get("/api/notifications", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { rows } = await pool.query(
      "SELECT id, type, title, body, meta, read_at, created_at FROM notifications WHERE user_email = $1 ORDER BY created_at DESC",
      [String(user.email)]
    );
    res.json({ items: rows });
  } catch {
    res.status(500).json({ error: "notifications_failed" });
  }
});

app.post("/api/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    await pool.query(
      "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_email = $2",
      [String(id), String(user.email)]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "notifications_failed" });
  }
});

async function getAuthUser(req) {
  const headerEmail = req.headers["x-user-email"];
  const authHeader = req.headers["authorization"] || "";
  let token = "";

  if (authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "").trim();
  } else if (req.cookies?.[cookieName]) {
    token = String(req.cookies[cookieName]);
  }

  if (token) {
    if (token.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(token);
        if (parsed?.email) {
          const user = await upsertUser({
            email: String(parsed.email),
            name: parsed.name ? String(parsed.name) : null
          });
          return user
            ? { id: user.id, email: user.email, name: user.name, role: user.role, email_verified: user.email_verified }
            : null;
        }
      } catch {
        // ignore legacy cookie parse
      }
    }
    const sessionUser = await getSessionUser(token);
    if (sessionUser) return sessionUser;
  }

  if (headerEmail) {
    const user = await upsertUser({
      email: String(headerEmail),
      name: String(req.headers["x-user-name"] || headerEmail)
    });
    return user
      ? { id: user.id, email: user.email, name: user.name, role: user.role, email_verified: user.email_verified }
      : null;
  }

  return null;
}

async function geocodeLocation(location) {
  if (!location) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "AppoCar/1.0 (support@appocar.com)" }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return null;
  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon)
  };
}

async function geocodeSuggestions(query) {
  if (!query) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    headers: { "User-Agent": "AppoCar/1.0 (support@appocar.com)" }
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon)
  }));
}

app.get("/api/geocode", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : "";
  if (!q) return res.json({ items: [] });
  const items = await geocodeSuggestions(q).catch(() => []);
  res.json({ items });
});

async function handleAuthRegister(req, res) {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [String(email)]);
    if (existing.rows[0]) return res.status(409).json({ error: "user_exists" });
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await upsertUser({
      email: String(email),
      name: name ? String(name) : null,
      passwordHash,
      emailVerified: !emailVerificationEnabled
    });
    const verificationResult = await issueEmailVerification(user.email, req.headers.origin ? String(req.headers.origin) : "");
    if (emailVerificationRequired) {
      if (!verificationResult.ok && !verificationResult.skipped) {
        return res.status(500).json({ error: "email_verification_failed" });
      }
      return res.json({ ok: true, verificationRequired: true });
    }
    const session = await createSession(user);
    res.cookie(cookieName, session.token, getCookieOptions());
    await pool.query(
      "INSERT INTO user_history (user_email, action, meta) VALUES ($1, $2, $3)",
      [String(email), "Signed up", { email }]
    ).catch(() => undefined);
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified
      }
    });
  } catch {
    res.status(500).json({ error: "register_failed" });
  }
}

async function handleAuthLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [String(email)]);
    const user = rows[0];
    if (!user?.password_hash) return res.status(401).json({ error: "invalid_credentials" });
    const match = await bcrypt.compare(String(password), user.password_hash);
    if (!match) return res.status(401).json({ error: "invalid_credentials" });
    if (emailVerificationRequired && !user.email_verified) {
      return res.status(403).json({ error: "email_not_verified" });
    }
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]).catch(() => undefined);
    const session = await createSession(user);
    res.cookie(cookieName, session.token, getCookieOptions());
    await pool.query(
      "INSERT INTO user_history (user_email, action, meta) VALUES ($1, $2, $3)",
      [String(email), "Signed in", { email }]
    ).catch(() => undefined);
    res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified
      }
    });
  } catch {
    res.status(500).json({ error: "login_failed" });
  }
}

async function handleAuthLogout(req, res) {
  try {
    const token = req.cookies?.[cookieName];
    if (token) {
      await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [hashToken(String(token))]);
    }
  } catch {
    // ignore
  }
  res.clearCookie(cookieName);
  res.json({ ok: true });
}

async function handleAuthMe(req, res) {
  const user = await getAuthUser(req);
  if (!user?.email) {
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: String(user.id || user.email),
      email: String(user.email),
      name: String(user.name || user.email),
      role: user.role || "user",
      emailVerified: Boolean(user.email_verified)
    }
  });
}

async function handleVerifyRequest(req, res) {
  try {
    const authUser = await getAuthUser(req);
    const email = authUser?.email || (req.body?.email ? String(req.body.email) : "");
    if (!email) return res.status(400).json({ error: "email_required" });
    const { rows } = await pool.query("SELECT email_verified FROM users WHERE email = $1", [String(email)]);
    if (!rows[0]) return res.status(404).json({ error: "user_not_found" });
    if (rows[0].email_verified) return res.json({ ok: true, alreadyVerified: true });
    const result = await issueEmailVerification(email, req.headers.origin ? String(req.headers.origin) : "");
    if (!result.ok && !result.skipped) {
      return res.status(500).json({ error: result.error || "email_verification_failed" });
    }
    return res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "email_verification_failed" });
  }
}

async function handleVerifyConfirm(req, res) {
  try {
    const token = String(req.body?.token || req.query?.token || "");
    if (!token) return res.status(400).json({ error: "token_required" });
    const tokenHash = hashToken(token);
    const { rows } = await pool.query(
      "SELECT id, email, email_verification_expires FROM users WHERE email_verification_token = $1 LIMIT 1",
      [tokenHash]
    );
    const user = rows[0];
    if (!user) return res.status(400).json({ error: "invalid_token" });
    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      return res.status(400).json({ error: "token_expired" });
    }
    await pool.query(
      "UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1",
      [user.id]
    );
    await pool.query(
      "INSERT INTO user_history (user_email, action, meta) VALUES ($1, $2, $3)",
      [String(user.email), "Email verified", { email: user.email }]
    ).catch(() => undefined);
    const redirect = resolveRedirect(req.query?.redirect ? String(req.query.redirect) : "");
    if (redirect) return res.redirect(redirect);
    return res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "email_verification_failed" });
  }
}

app.post("/api/auth/register", authLimiter, handleAuthRegister);
app.post("/api/auth/login", authLimiter, handleAuthLogin);
app.post("/api/auth/logout", handleAuthLogout);
app.get("/api/auth/me", handleAuthMe);
app.post("/api/auth/verify/request", verificationLimiter, handleVerifyRequest);
app.post("/api/auth/verify/confirm", verificationLimiter, handleVerifyConfirm);
app.get("/api/auth/verify/confirm", handleVerifyConfirm);

app.get("/auth/google", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URL;
  if (!clientId || !redirectUri) return res.status(501).send("Google OAuth not configured");
  const redirect = resolveRedirect(req.query.redirect ? String(req.query.redirect) : "");
  const state = await createOAuthState("google", redirect);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send("Missing code/state");
    const redirect = await consumeOAuthState("google", String(state));
    if (redirect === null) return res.status(400).send("Invalid state");

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_REDIRECT_URL || "",
        grant_type: "authorization_code"
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.status(401).send("OAuth token exchange failed");

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();
    if (!profile?.email) return res.status(401).send("OAuth profile missing email");

    const user = await upsertUser({
      email: profile.email,
      name: profile.name,
      provider: "google",
      providerId: profile.id,
      emailVerified: true
    });
    const session = await createSession(user);
    res.cookie(cookieName, session.token, getCookieOptions());
    res.redirect(redirect || "/");
  } catch {
    res.status(500).send("OAuth failed");
  }
});

app.get("/auth/facebook", async (req, res) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URL;
  if (!clientId || !redirectUri) return res.status(501).send("Facebook OAuth not configured");
  const redirect = resolveRedirect(req.query.redirect ? String(req.query.redirect) : "");
  const state = await createOAuthState("facebook", redirect);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state
  });
  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`);
});

app.get("/auth/facebook/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send("Missing code/state");
    const redirect = await consumeOAuthState("facebook", String(state));
    if (redirect === null) return res.status(400).send("Invalid state");

    const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID || "");
    tokenUrl.searchParams.set("client_secret", process.env.FACEBOOK_CLIENT_SECRET || "");
    tokenUrl.searchParams.set("redirect_uri", process.env.FACEBOOK_REDIRECT_URL || "");
    tokenUrl.searchParams.set("code", String(code));
    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.status(401).send("OAuth token exchange failed");

    const profileUrl = new URL("https://graph.facebook.com/me");
    profileUrl.searchParams.set("fields", "id,name,email");
    profileUrl.searchParams.set("access_token", tokenData.access_token);
    const profileRes = await fetch(profileUrl.toString());
    const profile = await profileRes.json();
    if (!profile?.email) return res.status(401).send("OAuth profile missing email");

    const user = await upsertUser({
      email: profile.email,
      name: profile.name,
      provider: "facebook",
      providerId: profile.id,
      emailVerified: true
    });
    const session = await createSession(user);
    res.cookie(cookieName, session.token, getCookieOptions());
    res.redirect(redirect || "/");
  } catch {
    res.status(500).send("OAuth failed");
  }
});

app.post("/api/login", handleAuthLogin);
app.post("/api/logout", handleAuthLogout);
app.get("/api/me", handleAuthMe);

app.get("/api/listings", async (req, res) => {
  try {
    const {
      page = "1",
      pageSize = "12",
      query,
      make,
      model,
      priceMin,
      priceMax,
      yearMin,
      yearMax,
      mileageMin,
      mileageMax,
      fuel,
      transmission,
      body,
      drive,
      sort,
      lat,
      lng,
      locationRadius,
      sellerType,
      dealType,
      verifiedOnly,
      color,
      location,
      doors,
      seats,
      powerMin,
      powerMax,
      evRangeMin,
      evBatteryMin,
      evFastChargeMin,
      evChargeType,
      co2Min,
      co2Max,
      consumptionMin,
      consumptionMax,
      category
    } = req.query;

    const { where, values } = buildListingWhere({
      query,
      make,
      model,
      priceMin,
      priceMax,
      yearMin,
      yearMax,
      mileageMin,
      mileageMax,
      fuel,
      transmission,
      body,
      drive,
      sellerType,
      dealType,
      verifiedOnly,
      color,
      location,
      doors,
      seats,
      powerMin,
      powerMax,
      evRangeMin,
      evBatteryMin,
      evFastChargeMin,
      evChargeType,
      co2Min,
      co2Max,
      consumptionMin,
      consumptionMax,
      category,
      features: req.query.features
    });

    let centerLat = lat ? Number(lat) : null;
    let centerLng = lng ? Number(lng) : null;
    if (locationRadius && !centerLat && !centerLng && location) {
      const primaryLocation = String(location).split(",")[0]?.trim();
      const geo = await geocodeLocation(primaryLocation).catch(() => null);
      if (geo) {
        centerLat = geo.lat;
        centerLng = geo.lng;
      }
    }
    if (locationRadius && centerLat != null && centerLng != null) {
      const radius = Number(locationRadius);
      if (!Number.isNaN(radius)) {
        pushRaw(
          `(lat IS NOT NULL AND lng IS NOT NULL AND (6371 * acos(cos(radians(${centerLat})) * cos(radians(lat)) * cos(radians(lng) - radians(${centerLng})) + sin(radians(${centerLat})) * sin(radians(lat)))) <= ${radius})`
        );
      }
    }

    const limit = Math.max(1, Math.min(60, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    let order = "created_at DESC";
    if (sort === "price-asc") order = "price ASC";
    if (sort === "price-desc") order = "price DESC";
    if (sort === "year-desc") order = "year DESC";
    if (sort === "popularity") order = "view_count DESC NULLS LAST, created_at DESC";

    const countQuery = `SELECT COUNT(*) FROM listings ${where}`;
    const dataQuery = `SELECT * FROM listings ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`;

    const countResult = await pool.query(countQuery, values);
    const dataResult = await pool.query(dataQuery, values);

    res.json({
      items: dataResult.rows,
      count: Number(countResult.rows[0]?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

app.get("/api/listings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM listings WHERE id = $1", [id]);
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    await pool.query("UPDATE listings SET view_count = view_count + 1 WHERE id = $1", [id]).catch(() => undefined);
    const user = await getAuthUser(req);
    if (user?.email) {
      await pool.query(
        "INSERT INTO user_history (user_email, action, meta) VALUES ($1, $2, $3)",
        [String(user.email), "Viewed listing", { listingId: id }]
      );
    }
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

app.post("/api/listings", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const cookieUser = req.user;
    let coords = null;
    if ((body.lat == null || body.lng == null) && body.location) {
      coords = await geocodeLocation(body.location).catch(() => null);
    }
    const sql = `
      INSERT INTO listings (
        title, price, currency, year, mileage_km, fuel, transmission, power_kw,
        location, lat, lng, images, seller_name, seller_email, seller_type, body, color, drive, doors, seats,
        description, features, vin, owners, phone, whatsapp, verified, deal_type, make, model,
        ev_range_km, ev_battery_kwh, ev_fast_charge_kw, ev_charge_type, co2_g_km, consumption
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
      ) RETURNING *
    `;
    const values = [
      body.title,
      Number(body.price || 0),
      body.currency || "EUR",
      Number(body.year || 0),
      Number(body.mileageKm || 0),
      body.fuel || "Petrol",
      body.transmission || "Automatic",
      Number(body.powerKw || 0),
      body.location || "",
      body.lat ?? coords?.lat ?? null,
      body.lng ?? coords?.lng ?? null,
      body.images || [],
      body.sellerName || cookieUser?.email || "Seller",
      body.sellerEmail || cookieUser?.email || null,
      body.sellerType || "Private",
      body.body || "Sedan",
      body.color || "",
      body.drive || "FWD",
      Number(body.doors || 4),
      Number(body.seats || 5),
      body.description || "",
      body.features || [],
      body.vin || null,
      body.owners || null,
      body.phone || null,
      body.whatsapp || null,
      Boolean(body.verified ?? body.sellerType === "Dealer"),
      body.dealType || "buy",
      body.make || null,
      body.model || null,
      body.evRangeKm != null ? Number(body.evRangeKm) : null,
      body.evBatteryKwh != null ? Number(body.evBatteryKwh) : null,
      body.evFastChargeKw != null ? Number(body.evFastChargeKw) : null,
      body.evChargeType || null,
      body.co2Gkm != null ? Number(body.co2Gkm) : null,
      body.consumption || null
    ];

    const { rows } = await pool.query(sql, values);
    if (cookieUser?.email) {
      await pool.query(
        "INSERT INTO user_history (user_email, action, meta) VALUES ($1, $2, $3)",
        [String(cookieUser.email), "Created listing", { listingId: rows[0].id }]
      );
    }
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to create listing" });
  }
});

app.post("/api/admin/marketing/run", requireAdmin, async (_req, res) => {
  try {
    const result = await runMarketingJobs();
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ error: "marketing_failed" });
  }
});

app.post("/api/history", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { action, meta } = req.body || {};
    if (!action) return res.status(400).json({ error: "action required" });
    await pool.query(
      "INSERT INTO user_history (user_email, action, meta) VALUES ($1, $2, $3)",
      [String(user.email), String(action), meta || {}]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "failed to write history" });
  }
});

app.get("/api/my-listings", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { rows } = await pool.query(
      "SELECT * FROM listings WHERE seller_email = $1 OR seller_name = $1",
      [String(user.email)]
    );
    res.json({ items: rows, count: rows.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch my listings" });
  }
});

app.get("/api/favorites", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { rows } = await pool.query(
      `SELECT favorites.listing_id, listings.*
       FROM favorites
       LEFT JOIN listings ON listings.id = favorites.listing_id
       WHERE favorites.user_email = $1
       ORDER BY favorites.created_at DESC`,
      [String(user.email)]
    );
    res.json({ items: rows, count: rows.length });
  } catch {
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
});

app.post("/api/favorites", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { listingId } = req.body || {};
    if (!listingId) return res.status(400).json({ error: "listingId required" });
    await pool.query(
      "INSERT INTO favorites (user_email, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [String(user.email), String(listingId)]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save favorite" });
  }
});

app.delete("/api/favorites/:listingId", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { listingId } = req.params;
    await pool.query("DELETE FROM favorites WHERE user_email = $1 AND listing_id = $2", [
      String(user.email),
      String(listingId)
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to remove favorite" });
  }
});

app.post("/api/uploads", uploadLimiter, requireAuth, (req, res) => {
  const user = req.user;
  if (maxUploadsPerDay && user?.email) {
    pool.query(
      "SELECT COUNT(*) FROM moderation_events WHERE user_email = $1 AND created_at >= NOW() - INTERVAL '24 hours'",
      [String(user.email)]
    )
      .then(({ rows }) => {
        if (Number(rows[0]?.count || 0) >= maxUploadsPerDay) {
          return res.status(429).json({ error: "upload_limit_reached" });
        }
        upload.single("file")(req, res, (err) => {
          if (err) {
            return res.status(400).json({ error: err.message || "upload_failed" });
          }
          if (!req.file) return res.status(400).json({ error: "file required" });
          const filePath = req.file.path;
          const requestMeta = getRequestMeta(req);
          moderateImage(filePath)
            .then(async (result) => {
              if (!result.ok) {
                await fs.unlink(filePath).catch(() => undefined);
                await logModerationEvent({
                  userEmail: user?.email,
                  fileName: req.file.filename,
                  status: "rejected",
                  reason: result.reason,
                  meta: { size: req.file.size, mimetype: req.file.mimetype, ...requestMeta, ...(result.meta || {}) }
                });
                return res.status(400).json({ error: result.reason || "moderation_failed" });
              }
              await logModerationEvent({
                userEmail: user?.email,
                fileName: req.file.filename,
                status: "accepted",
                reason: null,
                meta: { size: req.file.size, mimetype: req.file.mimetype, ...requestMeta, ...(result.meta || {}) }
              });
              return res.json({ url: `/uploads/${req.file.filename}` });
            })
            .catch(async () => {
              await fs.unlink(filePath).catch(() => undefined);
              await logModerationEvent({
                userEmail: user?.email,
                fileName: req.file.filename,
                status: "error",
                reason: "moderation_failed",
                meta: { size: req.file.size, mimetype: req.file.mimetype, ...requestMeta }
              });
              return res.status(400).json({ error: "moderation_failed" });
            });
        });
      })
      .catch(() => res.status(500).json({ error: "upload_limit_check_failed" }));
    return;
  }
  upload.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "upload_failed" });
    }
    if (!req.file) return res.status(400).json({ error: "file required" });
    const filePath = req.file.path;
    const requestMeta = getRequestMeta(req);
    moderateImage(filePath)
      .then(async (result) => {
        if (!result.ok) {
          await fs.unlink(filePath).catch(() => undefined);
          await logModerationEvent({
            userEmail: user?.email,
            fileName: req.file.filename,
            status: "rejected",
            reason: result.reason,
            meta: { size: req.file.size, mimetype: req.file.mimetype, ...requestMeta, ...(result.meta || {}) }
          });
          return res.status(400).json({ error: result.reason || "moderation_failed" });
        }
        await logModerationEvent({
          userEmail: user?.email,
          fileName: req.file.filename,
          status: "accepted",
          reason: null,
          meta: { size: req.file.size, mimetype: req.file.mimetype, ...requestMeta, ...(result.meta || {}) }
        });
        return res.json({ url: `/uploads/${req.file.filename}` });
      })
      .catch(async () => {
        await fs.unlink(filePath).catch(() => undefined);
        await logModerationEvent({
          userEmail: user?.email,
          fileName: req.file.filename,
          status: "error",
          reason: "moderation_failed",
          meta: { size: req.file.size, mimetype: req.file.mimetype, ...requestMeta }
        });
        return res.status(400).json({ error: "moderation_failed" });
      });
  });
});

app.get("/api/my-history", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { rows } = await pool.query(
      "SELECT id, action, meta, created_at FROM user_history WHERE user_email = $1 ORDER BY created_at DESC LIMIT 50",
      [String(user.email)]
    );
    res.json({ items: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

app.get("/api/admin/overview", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const adminEmail = (process.env.ADMIN_EMAIL || "appocar.eu@gmail.com").toLowerCase();
    if (!user?.email || String(user.email).toLowerCase() !== adminEmail) {
      return res.status(403).json({ error: "forbidden" });
    }
    const [
      totalListings,
      lastWeek,
      totalConvos,
      totalMessages,
      totalViews,
      totalUsers,
      totalModeration,
      rejectedModeration,
      favoritesCount
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM listings"),
      pool.query("SELECT COUNT(*) FROM listings WHERE created_at >= NOW() - INTERVAL '7 days'"),
      pool.query("SELECT COUNT(*) FROM conversations"),
      pool.query("SELECT COUNT(*) FROM chat_messages"),
      pool.query("SELECT COALESCE(SUM(view_count),0) AS total FROM listings"),
      pool.query("SELECT COUNT(DISTINCT user_email) FROM user_history"),
      pool.query("SELECT COUNT(*) FROM moderation_events"),
      pool.query("SELECT COUNT(*) FROM moderation_events WHERE status = 'rejected'"),
      pool.query("SELECT COUNT(*) FROM favorites")
    ]);

    const stats = [
      { label: "Total listings", value: Number(totalListings.rows[0]?.count || 0).toLocaleString() },
      { label: "New listings (7d)", value: Number(lastWeek.rows[0]?.count || 0).toLocaleString() },
      { label: "Conversations", value: Number(totalConvos.rows[0]?.count || 0).toLocaleString() },
      { label: "Messages", value: Number(totalMessages.rows[0]?.count || 0).toLocaleString() },
      { label: "Total views", value: Number(totalViews.rows[0]?.total || 0).toLocaleString() },
      { label: "Active users", value: Number(totalUsers.rows[0]?.count || 0).toLocaleString() },
      { label: "Moderation events", value: Number(totalModeration.rows[0]?.count || 0).toLocaleString() },
      { label: "Rejected uploads", value: Number(rejectedModeration.rows[0]?.count || 0).toLocaleString() },
      { label: "Favorites", value: Number(favoritesCount.rows[0]?.count || 0).toLocaleString() }
    ];

    const tasks = [
      "Review pending listings",
      "Check flagged content",
      "Monitor response time",
      "Verify dealer accounts"
    ];

    res.json({ stats, tasks });
  } catch {
    res.status(500).json({ error: "Failed to load admin overview" });
  }
});

app.post("/api/admin/webhook/test", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    const adminEmail = (process.env.ADMIN_EMAIL || "appocar.eu@gmail.com").toLowerCase();
    if (!user?.email || String(user.email).toLowerCase() !== adminEmail) {
      return res.status(403).json({ error: "forbidden" });
    }
    res.json({ ok: true, message: "Webhook received" });
  } catch {
    res.status(500).json({ error: "webhook_failed" });
  }
});

app.get("/api/conversations", async (req, res) => {
  try {
    const user = await getAuthUser(req);
    if (!user?.email) return res.status(401).json({ error: "unauthorized" });
    const { rows } = await pool.query(
      `SELECT conversations.*, listings.title AS listing_title
       FROM conversations
       LEFT JOIN listings ON listings.id = conversations.listing_id
       WHERE buyer_email = $1 OR seller_email = $1
       ORDER BY updated_at DESC`,
      [String(user.email)]
    );
    res.json({
      items: rows.map((row) => ({
        id: row.id,
        listingId: row.listing_id,
        listingTitle: row.listing_title || "Listing",
        buyerEmail: row.buyer_email,
        sellerEmail: row.seller_email,
        updatedAt: row.updated_at
      }))
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

app.post("/api/conversations", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { listingId, sellerEmail } = req.body || {};
    if (!listingId) return res.status(400).json({ error: "listingId required" });
    let resolvedSeller = sellerEmail;
    if (!resolvedSeller) {
      const { rows: listingRows } = await pool.query(
        "SELECT seller_email, seller_name FROM listings WHERE id = $1",
        [listingId]
      );
      resolvedSeller = listingRows[0]?.seller_email;
      if (!resolvedSeller && listingRows[0]?.seller_name) {
        const name = String(listingRows[0].seller_name);
        if (name.includes("@")) resolvedSeller = name;
      }
    }
    if (!resolvedSeller) return res.status(400).json({ error: "sellerEmail required" });
    const existing = await pool.query(
      "SELECT * FROM conversations WHERE listing_id = $1 AND buyer_email = $2 AND seller_email = $3 LIMIT 1",
      [listingId, String(user.email), String(resolvedSeller)]
    );
    if (existing.rows[0]) return res.json(existing.rows[0]);
    const { rows } = await pool.query(
      "INSERT INTO conversations (listing_id, buyer_email, seller_email) VALUES ($1, $2, $3) RETURNING *",
      [listingId, String(user.email), String(resolvedSeller)]
    );
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const membership = await pool.query(
      "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
      [id, String(user.email)]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: "forbidden" });
    const { rows } = await pool.query(
      "SELECT id, sender_email, body, sent_at, read_at FROM chat_messages WHERE conversation_id = $1 ORDER BY sent_at ASC",
      [id]
    );
    res.json({ items: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/conversations/:id/read", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const membership = await pool.query(
      "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
      [id, String(user.email)]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: "forbidden" });
    const rows = await markConversationRead(id, user.email);
    if (rows.length > 0) {
      broadcastToConversation(id, {
        type: "read",
        conversationId: id,
        readerEmail: user.email,
        messageIds: rows.map((row) => row.id),
        readAt: rows[0].read_at
      });
    }
    res.json({ ok: true, count: rows.length });
  } catch {
    res.status(500).json({ error: "Failed to mark read" });
  }
});

app.post("/api/messages", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { conversationId, body } = req.body || {};
    if (!conversationId || !body) return res.status(400).json({ error: "conversationId and body required" });
    const membership = await pool.query(
      "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
      [conversationId, String(user.email)]
    );
    if (!membership.rows[0]) return res.status(403).json({ error: "forbidden" });
    const { rows } = await pool.query(
      "INSERT INTO chat_messages (conversation_id, sender_email, body) VALUES ($1, $2, $3) RETURNING *",
      [conversationId, String(user.email), String(body)]
    );
    await pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
    const row = rows[0];
    if (row) {
      const participants = await getConversationParticipants(conversationId);
      const buyer = participants?.buyer_email;
      const seller = participants?.seller_email;
      const recipient = buyer && String(buyer).toLowerCase() === String(user.email).toLowerCase()
        ? seller
        : buyer;
      if (recipient) {
        await createNotification({
          userEmail: recipient,
          type: "message",
          title: "New message",
          body: String(body).slice(0, 160),
          meta: { conversationId, listingId: participants?.listing_id || null }
        });
      }
      broadcastToConversation(conversationId, {
        type: "message",
        conversationId,
        message: {
          id: row.id,
          conversationId,
          senderEmail: row.sender_email,
          body: row.body,
          sentAt: row.sent_at,
          readAt: row.read_at
        }
      });
    }
    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  (async () => {
    const origin = req.headers?.origin ? String(req.headers.origin) : "";
    if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
      ws.close(1008, "origin_not_allowed");
      return;
    }
    const user = await getAuthUserFromWs(req);
    if (!user?.email) {
      ws.close(1008, "unauthorized");
      return;
    }
    socketMeta.set(ws, { email: user.email, rooms: new Set() });
    ws.send(JSON.stringify({ type: "connected" }));

    ws.on("message", async (raw) => {
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      if (data.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }
      if (data.type === "subscribe") {
        const conversationId = String(data.conversationId || "");
        if (!conversationId) return;
        const membership = await pool.query(
          "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
          [conversationId, String(user.email)]
        );
        if (!membership.rows[0]) {
          ws.send(JSON.stringify({ type: "error", error: "forbidden" }));
          return;
        }
        joinRoom(conversationId, ws);
        ws.send(JSON.stringify({ type: "subscribed", conversationId }));
        return;
      }
      if (data.type === "typing") {
        const conversationId = String(data.conversationId || "");
        const isTyping = Boolean(data.isTyping);
        if (!conversationId) return;
        const membership = await pool.query(
          "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
          [conversationId, String(user.email)]
        );
        if (!membership.rows[0]) {
          ws.send(JSON.stringify({ type: "error", error: "forbidden" }));
          return;
        }
        broadcastToConversation(conversationId, {
          type: "typing",
          conversationId,
          userEmail: user.email,
          isTyping
        });
        return;
      }
      if (data.type === "send") {
        const conversationId = String(data.conversationId || "");
        const body = String(data.body || "").trim();
        if (!conversationId || !body) return;
        const membership = await pool.query(
          "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
          [conversationId, String(user.email)]
        );
        if (!membership.rows[0]) {
          ws.send(JSON.stringify({ type: "error", error: "forbidden" }));
          return;
        }
        const { rows } = await pool.query(
          "INSERT INTO chat_messages (conversation_id, sender_email, body) VALUES ($1, $2, $3) RETURNING *",
          [conversationId, String(user.email), body]
        );
        await pool.query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);
        const row = rows[0];
        if (row) {
          const participants = await getConversationParticipants(conversationId);
          const buyer = participants?.buyer_email;
          const seller = participants?.seller_email;
          const recipient = buyer && String(buyer).toLowerCase() === String(user.email).toLowerCase()
            ? seller
            : buyer;
          if (recipient) {
            await createNotification({
              userEmail: recipient,
              type: "message",
              title: "New message",
              body: String(body).slice(0, 160),
              meta: { conversationId, listingId: participants?.listing_id || null }
            });
          }
          broadcastToConversation(conversationId, {
            type: "message",
            conversationId,
            message: {
              id: row.id,
              conversationId,
              senderEmail: row.sender_email,
              body: row.body,
              sentAt: row.sent_at,
              readAt: row.read_at
            }
          });
          ws.send(JSON.stringify({ type: "sent", messageId: row.id }));
        }
        return;
      }
      if (data.type === "read") {
        const conversationId = String(data.conversationId || "");
        if (!conversationId) return;
        const membership = await pool.query(
          "SELECT id FROM conversations WHERE id = $1 AND (buyer_email = $2 OR seller_email = $2) LIMIT 1",
          [conversationId, String(user.email)]
        );
        if (!membership.rows[0]) {
          ws.send(JSON.stringify({ type: "error", error: "forbidden" }));
          return;
        }
        const rows = await markConversationRead(conversationId, user.email);
        if (rows.length > 0) {
          broadcastToConversation(conversationId, {
            type: "read",
            conversationId,
            readerEmail: user.email,
            messageIds: rows.map((row) => row.id),
            readAt: rows[0].read_at
          });
        }
        return;
      }
      if (data.type === "unsubscribe") {
        leaveRooms(ws);
      }
    });

    ws.on("close", () => {
      leaveRooms(ws);
    });
  })();
});

if (emailMarketingEnabled) {
  runMarketingJobs().catch(() => undefined);
  setInterval(() => {
    runMarketingJobs().catch(() => undefined);
  }, Math.max(5, emailMarketingIntervalMinutes) * 60 * 1000);
}

server.listen(PORT, () => {
  console.log(`APPOCAR backend running on :${PORT}`);
});
