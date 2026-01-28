import express from "express";
import { createProxyMiddleware, responseInterceptor } from "http-proxy-middleware";

const app = express();
const port = process.env.PORT || 8787;
const allowedCommodities = new Set([
  "ALUMINI",
  "COPPER",
  "CRUDEOIL",
  "GOLD",
  "LEAD",
  "NATURALGAS",
  "NICKEL",
  "SILVER",
  "ZINC",
]);

const normalizeCommodity = (value) => String(value).trim().toUpperCase().replace(/\s+/g, "");

const entryHasAllowedCommodity = (entry) => {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  return Object.values(entry).some((value) => {
    if (typeof value !== "string") {
      return false;
    }
    return allowedCommodities.has(normalizeCommodity(value));
  });
};

const filterCommodityPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.filter(entryHasAllowedCommodity);
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const filtered = { ...payload };
  Object.entries(filtered).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      filtered[key] = value.filter(entryHasAllowedCommodity);
    }
  });

  return filtered;
};

app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
  if (_.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  return next();
});

app.use(
  "/mcxccl",
  createProxyMiddleware({
    target: "https://www.mcxccl.com",
    changeOrigin: true,
    pathRewrite: { "^/mcxccl": "" },
    secure: true,
    selfHandleResponse: true,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader("origin", "https://www.mcxccl.com");
      proxyReq.setHeader("referer", "https://www.mcxccl.com/risk-management/daily-margin");
      proxyReq.setHeader(
        "user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      );
    },
    onProxyRes: responseInterceptor(async (buffer, _, proxyRes) => {
      const contentType = proxyRes.headers["content-type"] || "";
      if (!contentType.includes("application/json")) {
        return buffer;
      }

      try {
        const payload = JSON.parse(buffer.toString("utf8"));
        const filteredPayload = filterCommodityPayload(payload);
        return JSON.stringify(filteredPayload);
      } catch (error) {
        return buffer;
      }
    }),
  })
);

app.use(
  "/mcxindia",
  createProxyMiddleware({
    target: "https://www.mcxindia.com",
    changeOrigin: true,
    pathRewrite: { "^/mcxindia": "" },
    secure: true,
    selfHandleResponse: true,
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader("origin", "https://www.mcxindia.com");
      proxyReq.setHeader("referer", "https://www.mcxindia.com/market-data/market-watch");
      proxyReq.setHeader(
        "user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      );
    },
    onProxyRes: responseInterceptor(async (buffer, _, proxyRes) => {
      const contentType = proxyRes.headers["content-type"] || "";
      if (!contentType.includes("application/json")) {
        return buffer;
      }

      try {
        const payload = JSON.parse(buffer.toString("utf8"));
        const filteredPayload = filterCommodityPayload(payload);
        return JSON.stringify(filteredPayload);
      } catch (error) {
        return buffer;
      }
    }),
  })
);

app.get("/", (_, res) => {
  res.json({
    ok: true,
    routes: ["/mcxccl/*", "/mcxindia/*"],
  });
});

app.listen(port, () => {
  console.log(`MCX proxy running on http://localhost:${port}`);
});
