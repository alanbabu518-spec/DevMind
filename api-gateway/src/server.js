const express = require("express");
const dotenv = require("dotenv");


dotenv.config();

const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    service: "DevMind API Gateway",
    status: "running",
  });
});

app.use("/api/ai", aiRoutes);

app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});