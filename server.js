const app = require("./src/app");

app.get("/", (req, res) => {
  res.send("Backend server is running perfectly");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
