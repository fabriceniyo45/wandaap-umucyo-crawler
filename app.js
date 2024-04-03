require("dotenv").config(); //loading environment variables
const express = require("express");

const app = express();

const { fork } = require("child_process");
// Create a child process to run RabbitMQ in a separate thread
const rabbitmqProcess = fork("./utils/rabbit.js");

// Error handling for RabbitMQ child process
rabbitmqProcess.on("error", (err) => {
  console.error("RabbitMQ child process error:", err);
});

// Close RabbitMQ child process on exit
process.on("exit", () => {
  rabbitmqProcess.kill();
});

//home route
app.get("/", (req, res) => {
  res.json({
    message: "Sever is running.",
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
