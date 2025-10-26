const express = require("express");
const app = express();
const { analyseIssue, getResetTime } = require("./routes/issues.ts");
const cors = require("cors");
const PORT = 8000;
const rateLimit = require("express-rate-limit");
app.use(express.json());

const limiter = rateLimit({
  windowMs: 12 * 60 * 60 * 1000, // 12 hours
  max: 3, // max requests per window per IP/device
  message: "Too many requests from this device, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const corsOptions = {
  credentials: true,
  origin: ["http://localhost:3000"],
};
app.use(cors(corsOptions));
// app.use(limiter);

app.post("/analyseIssue", analyseIssue);
app.get("/getTimeDiff", getResetTime);

app.listen(PORT, () => {
  console.log("server is running on port", PORT);
});
