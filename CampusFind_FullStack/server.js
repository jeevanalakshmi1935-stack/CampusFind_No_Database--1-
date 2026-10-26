const express = require("express");
const path = require("path");
const reportRoutes = require("./routes/reports");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/health", (req, res) => res.json({ status: "ok", message: "CampusFind API is running" }));
app.use("/api/reports", reportRoutes);
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`CampusFind running at http://localhost:${PORT}`));
