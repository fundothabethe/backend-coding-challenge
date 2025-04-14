import { randomUUID } from "crypto";

export class Database {
  #messages = new Map();

  storeMessage(userId, encryptedMessage) {
    if (!this.#messages.has(userId)) {
      this.#messages.set(userId, []);
    }
    this.#messages.get(userId).push({
      id: randomUUID(),
      content: encryptedMessage,
      timestamp: Date.now(),
    });
  }

  getMessages(userId) {
    return this.#messages.get(userId) ?? [];
  }

  cleanupExpired() {
    const TEN_MINUTES = 10 * 60 * 1000;
    for (const [userId, messages] of this.#messages) {
      this.#messages.set(
        userId,
        messages.filter((msg) => Date.now() - msg.timestamp < TEN_MINUTES)
      );
    }
  }
}

export default new Database();
