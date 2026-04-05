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

  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(
      CryptoJS.enc.Utf8,
    );

    // Если значение пусто, значит ключ был неверный
    if (!decrypted) {
      return "Сообщение зашифровано";
    }

    return decrypted;
  } catch (error) {
    console.error("Ошибка при расшифровке:", error);
    return "Сообщение зашифровано";
  }
};
