import express from "express";
import { encryptMessage, decryptMessage } from "./crypto.js";
import db from "./db.js";

const app = express();
app.use(express.json());

// POST /messages
app.post("/messages", (req, res) => {
  const { userId, message } = req.body;

  if (!userId || !message) {
    return res.status(400).json({ error: "userId and message are required" });
  }

  try {
    const encrypted = encryptMessage(userId, message);
    db.storeMessage(userId, encrypted);
    res.status(201).json({ status: "Message stored successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /messages/:userId
app.get("/messages/:userId", (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    db.cleanupExpired();
    const messages = db.getMessages(userId);
    const decryptedMessages = messages.map((msg) => ({
      id: msg.id,
      message: decryptMessage(userId, msg.content),
      timestamp: msg.timestamp,
    }));
    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /debug/decrypt
app.post("/debug/decrypt", (req, res) => {
  const { userId, encrypted } = req.body;

  if (!userId || !encrypted) {
    return res.status(400).json({ error: "userId and encrypted are required" });
  }

  try {
    const decrypted = decryptMessage(userId, encrypted);
    res.json({ decrypted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
