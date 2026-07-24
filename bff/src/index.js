const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { port, corsOrigins, apiBaseUrl } = require("./config");
const authRoutes = require("./routes/auth");
const ssoRoutes = require("./routes/sso");
const { createApiProxy } = require("./proxy");
const { createCsrfGuard } = require("./csrf");

const app = express();

app.disable("x-powered-by");

if (corsOrigins.length > 0) {
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    })
  );
}

app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "admin-bff" });
});

// Cookie CSRF: SameSite=lax + optional Origin/Referer vs PUBLIC_ORIGIN
app.use(createCsrfGuard());

// JSON body only for BFF-owned auth routes (proxy streams its own body)
app.use("/auth/sso", express.json({ limit: "1mb" }), ssoRoutes);
app.use("/auth", express.json({ limit: "1mb" }), authRoutes);

// Everything else → backend with Bearer from cookies
app.use(createApiProxy());

app.listen(port, () => {
  console.log(`Admin BFF listening on :${port} → API ${apiBaseUrl}`);
});
