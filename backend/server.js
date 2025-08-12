require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/taskRoutes");
const reportRoutes = require("./routes/reportRoutes");
const projectRoutes = require("./routes/projectRoutes");
const timelogRoutes = require("./routes/timelogRoutes");
const aiRoutes=require("./routes/aiRoutes");
const performanceRoutes = require("./routes/performanceRoutes");

const app = express();

// Middleware to handle CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*", // You can change this to http://192.168.1.15:3000
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Connect to database
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/timelogs", timelogRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/performance", performanceRoutes); // 👈 Use the new route file

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Start server — accessible via LAN (same Wi-Fi)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

