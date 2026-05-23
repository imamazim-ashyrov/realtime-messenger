import CryptoJS from "crypto-js";

// Шифрование сообщений AES-256, ключ = chatId.
// Внимание: chatId хранится в Firestore рядом с шифротекстом, поэтому это
// шифрование «в покое», а не полноценное E2EE.

export const encryptMessage = (message, secretKey) => {
  if (!message || !secretKey) return message;
  try {
    return CryptoJS.AES.encrypt(message, secretKey).toString();
  } catch {
    return message;
  }
};

export const decryptMessage = (encryptedMessage, secretKey) => {
  if (!encryptedMessage || !secretKey) return encryptedMessage;

  // CryptoJS (OpenSSL-формат) всегда даёт base64 с префиксом "U2FsdGVkX1"
  // ("Salted__"). Если префикса нет — это legacy plaintext, отдаём как есть.
  if (!encryptedMessage.startsWith("U2FsdGVkX1")) {
    return encryptedMessage;
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(
      CryptoJS.enc.Utf8,
    );
    return decrypted || "Сообщение зашифровано";
  } catch {
    return "Сообщение зашифровано";
  }
};
