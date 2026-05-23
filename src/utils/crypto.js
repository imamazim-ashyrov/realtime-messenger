import CryptoJS from "crypto-js";

/**
 * Шифрует сообщение AES-256
 * @param {string} message - Исходное сообщение
 * @param {string} secretKey - Секретный ключ (chatId)
 * @returns {string} Зашифрованное сообщение
 */
export const encryptMessage = (message, secretKey) => {
  if (!message || !secretKey) return message;

  try {
    const encrypted = CryptoJS.AES.encrypt(message, secretKey).toString();
    return encrypted;
  } catch (error) {
    console.error("Ошибка при шифровании:", error);
    return message;
  }
};

/**
 * Расшифровывает сообщение AES-256
 * @param {string} encryptedMessage - Зашифрованное сообщение
 * @param {string} secretKey - Секретный ключ (chatId)
 * @returns {string} Расшифрованное сообщение или "Сообщение зашифровано", если ошибка
 */
export const decryptMessage = (encryptedMessage, secretKey) => {
  if (!encryptedMessage || !secretKey) return encryptedMessage;

  // Шифротекст CryptoJS (формат OpenSSL) всегда начинается с "U2FsdGVkX1"
  // (base64 от "Salted__"). Если префикса нет — это незашифрованный (legacy)
  // текст, возвращаем как есть и не пытаемся расшифровать.
  if (!encryptedMessage.startsWith("U2FsdGVkX1")) {
    return encryptedMessage;
  }

  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(
      CryptoJS.enc.Utf8,
    );

    // Пустой результат или битый UTF-8 → ключ не подошёл
    if (!decrypted) {
      return "Сообщение зашифровано";
    }

    return decrypted;
  } catch {
    return "Сообщение зашифровано";
  }
};
