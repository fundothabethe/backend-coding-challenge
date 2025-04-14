// Original broken decryption function
import { createHmac, createDecipheriv } from "crypto";

export const broken_decrypt = (userId, encryptedBase64) => {
  const key = createHmac("sha256", process.env.SERVER_SECRET)
    .update(userId)
    .digest();
  const payload = Buffer.from(encryptedBase64, "base64");

  const iv = payload.slice(0, 16); // Wrong: GCM uses 12 bytes
  const ciphertext = payload.slice(16);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  let decrypted = decipher.update(ciphertext, null, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
