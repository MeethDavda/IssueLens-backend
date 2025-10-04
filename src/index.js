const express = require("express");
const app = express();
const sdk = require("node-appwrite");
const { analyseIssue } = require("./routes/issues.ts");
const cors = require("cors");
const PORT = 8000;
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max requests per window per IP/device
  message: "Too many requests from this device, please try again later.",
  standardHeaders: true, // return RateLimit-* headers
  legacyHeaders: false,
});

app.use(limiter); // apply globally
const corsOptions = {
  credentials: true,
  origin: ["http://localhost:3000"],
};
app.use(cors(corsOptions));

app.post("/analyseIssue", analyseIssue);

app.listen(PORT, () => {
  console.log("server is running on port", PORT);
});
