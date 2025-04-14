import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  hkdfSync,
} from "crypto";
import { Buffer } from "buffer";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const HKDF_ALGORITHM = "sha256";
const SERVER_SECRET =
  process.env.SERVER_SECRET ?? randomBytes(32).toString("hex");

export const deriveKey = (userId) =>
  hkdfSync(
    HKDF_ALGORITHM,
    Buffer.from(SERVER_SECRET),
    Buffer.from(userId),
    "messaging",
    32
  );

export const encryptMessage = (userId, message) => {
  try {
    const key = deriveKey(userId);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(message, "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("base64");

    const payload = Buffer.concat([
      iv,
      Buffer.from(encrypted, "base64"),
      Buffer.from(authTag, "base64"),
    ]);

    return payload.toString("base64");
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

export const decryptMessage = (userId, encryptedBase64) => {
  try {
    const key = deriveKey(userId);
    const payload = Buffer.from(encryptedBase64, "base64");

    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid payload length");
    }

    const iv = payload.slice(0, IV_LENGTH);
    const authTag = payload.slice(payload.length - AUTH_TAG_LENGTH);
    const ciphertext = payload.slice(
      IV_LENGTH,
      payload.length - AUTH_TAG_LENGTH
    );

    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, null, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};
