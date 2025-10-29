const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "🚀 Hello from Gilgal deployed app!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API endpoint working!",
    data: {
      framework: "Express.js",
      platform: "Gilgal PaaS",
      domain: "gilgal.tech",
      version: "1.0.0",
    },
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
