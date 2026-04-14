import { GoogleGenerativeAI } from "@google/generative-ai";

// Инициализируем нейросеть ключом из .env
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Используем самую быструю модель Flash
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const enhanceMessageWithAI = async (text, action) => {
  if (!text) return text;
  if (!apiKey) {
    console.error("Не найден VITE_GEMINI_API_KEY в файле .env");
    return "Ошибка: Нет API ключа";
  }

  let prompt = "";

  // Формируем системные промпты в зависимости от выбранной кнопки
  switch (action) {
    case "fix":
      prompt = `Исправь грамматические, орфографические и пунктуационные ошибки в тексте. Сохрани оригинальный смысл. Выведи ТОЛЬКО исправленный текст без кавычек и лишних пояснений: "${text}"`;
      break;
    case "formal":
      prompt = `Перепиши этот текст в официальном, вежливом и деловом стиле. Выведи ТОЛЬКО переписанный текст без кавычек: "${text}"`;
      break;
    case "english":
      prompt = `Переведи этот текст на английский язык (разговорный стиль для мессенджера). Выведи ТОЛЬКО перевод без кавычек: "${text}"`;
      break;
    default:
      return text;
  }

  try {
    const result = await model.generateContent(prompt);
    // Нейросеть иногда любит добавлять пробелы или \n в конце, поэтому делаем trim()
    return result.response.text().trim();
  } catch (error) {
    console.error("Ошибка ИИ:", error);
    return "Ошибка при генерации текста";
  }
};