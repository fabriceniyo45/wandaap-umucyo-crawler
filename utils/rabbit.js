const amqplib = require("amqplib");
const { getUmucyoAssignments } = require("./crawler");

const queue = process.env.UMUCYO_CRAWLER_QUEUE_NAME;

(async () => {
  try {
    const rabbitMQConnectionURL =
      process.env.RABBITMQ_URL || "amqp://localhost:5672"; //connecting to docker compose rabbitmq service otherwise use default rabbitMQ url&port
    const conn = await amqplib.connect(rabbitMQConnectionURL);

    const ch1 = await conn.createChannel();
    await ch1.assertQueue(queue, {
      durable: false,
    });

    console.log("[*] Waiting for messages in %s. To exit press CTRL+C", queue);
    // Listener
    ch1.consume(queue, async (msg) => {
      if (msg !== null) {
        console.log("[x] Recieved: ", msg.content.toString());
        ch1.ack(msg); //tell/acknowledge the server that we have received the message so that it can be removed from the queue
        await getUmucyoAssignments();
      } else {
        console.log("Consumer cancelled by server");
      }
    });
  } catch (error) {
    console.log("Something went wrong: ", error.message || error);
  }
})();
