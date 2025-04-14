import {
  createDecipheriv,
  hkdfSync,
  randomBytes,
  createCipheriv,
} from "crypto";
import { Buffer } from "buffer";

export const fixed_decrypt = (userId, encryptedBase64) => {
  const key = hkdfSync(
    "sha256",
    Buffer.from(process.env.SERVER_SECRET),
    Buffer.from(userId),
    "messaging",
    32
  );

  const payload = Buffer.from(encryptedBase64, "base64");
  const IV_LENGTH = 12;
  const AUTH_TAG_LENGTH = 16;

  if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid payload length");
  }

  const iv = payload.slice(0, IV_LENGTH);
  const authTag = payload.slice(payload.length - AUTH_TAG_LENGTH);
  const ciphertext = payload.slice(IV_LENGTH, payload.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv("aes-256-gcm", key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, null, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// Test case
export const testBrokenDecrypt = () => {
  const userId = "test-user";
  const message = "Hello, World!";

  const key = hkdfSync(
    "sha256",
    Buffer.from(process.env.SERVER_SECRET),
    Buffer.from(userId),
    "messaging",
    32
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
  let encrypted = cipher.update(message, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, encrypted, authTag]);
  const encryptedBase64 = payload.toString("base64");

  try {
    broken_decrypt(userId, encryptedBase64);
    console.log("Test failed: Broken decrypt should have thrown an error");
  } catch (error) {
    console.log(
      "Test passed: Broken decrypt failed as expected:",
      error.message
    );
  }

  const decrypted = fixed_decrypt(userId, encryptedBase64);
  console.log(
    "Fixed decrypt test:",
    decrypted === message ? "Passed" : "Failed"
  );
};

// Run test
// testBrokenDecrypt();
