const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Hello from Shiply deployed backend!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "API endpoint working!",
    data: {
      server: "Shiply Platform",
      deployed: true,
      timestamp: new Date().toISOString(),
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API test: http://localhost:${PORT}/api/test`);
});

