const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "reports.json");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, and WEBP images are allowed."));
}});
function readReports() {
  try { if (!fs.existsSync(DATA_FILE)) return []; return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return []; }
}
function saveReports(reports) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
}
router.get("/", (req, res) => {
  let reports = readReports();
  if (["Lost", "Found"].includes(req.query.type)) reports = reports.filter(r => r.type === req.query.type);
  if (req.query.category && req.query.category !== "All") reports = reports.filter(r => r.category === req.query.category);
  if (["Open", "Resolved"].includes(req.query.status)) reports = reports.filter(r => r.status === req.query.status);
  if (req.query.search && req.query.search.trim()) {
    const q = req.query.search.trim().toLowerCase();
    reports = reports.filter(r => [r.name, r.description, r.location].some(v => String(v || "").toLowerCase().includes(q)));
  }
  res.json(reports.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,200));
});
router.get("/stats", (req, res) => {
  const reports = readReports();
  res.json({ total: reports.length, lost: reports.filter(r=>r.type==="Lost"&&r.status==="Open").length, found: reports.filter(r=>r.type==="Found"&&r.status==="Open").length, resolved: reports.filter(r=>r.status==="Resolved").length });
});
router.post("/", (req,res,next) => upload.single("photo")(req,res,err => err ? res.status(400).json({message:err.message}) : next()), (req,res) => {
  const { type, name, category, location, date, description, contactEmail } = req.body;
  const allowed = ["Electronics", "Accessories", "Books", "ID Cards", "Clothing", "Keys", "Other"];
  if (!["Lost","Found"].includes(type)) return res.status(400).json({message:"Choose Lost or Found."});
  if (!name || !category || !location || !description || !contactEmail) return res.status(400).json({message:"Please fill in all required fields."});
  if (!allowed.includes(category)) return res.status(400).json({message:"Invalid category."});
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return res.status(400).json({message:"Enter a valid email address."});
  const reports = readReports();
  const report = { _id: Date.now().toString(36) + Math.random().toString(36).slice(2,8), type, name, category, location, date: date || new Date().toISOString(), description, contactEmail, photoUrl: req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}` : "", status:"Open", createdAt:new Date().toISOString() };
  reports.push(report); saveReports(reports); res.status(201).json(report);
});
router.patch("/:id/resolve", (req,res) => {
  const reports = readReports(); const report = reports.find(r => r._id === req.params.id);
  if (!report) return res.status(404).json({message:"Report not found."});
  report.status = "Resolved"; saveReports(reports); res.json(report);
});
router.use((err,req,res,next) => res.status(400).json({message:err.message || "Upload failed."}));
module.exports = router;
