require("dotenv").config();
const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.PB_API_KEY) {
  console.error("\nError: PB_API_KEY is not set.");
  console.error("Add it to a .env file in this folder:\n\n  PB_API_KEY=your_key_here\n");
  process.exit(1);
}

app.use(
  "/api",
  createProxyMiddleware({
    target: "https://api.pitchbook.com",
    changeOrigin: true,
    pathRewrite: { "^/api": "" },
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.setHeader("Authorization", `PB-Token ${process.env.PB_API_KEY}`);
      },
      error: (err, req, res) => {
        console.error("Proxy error:", err.message);
        res.status(502).json({ error: "Proxy could not reach the PitchBook API." });
      },
    },
  })
);

app.use(express.static(path.join(__dirname, "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\nApp running at http://localhost:${PORT}\n`);
});
