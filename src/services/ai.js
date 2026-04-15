const apiKey = import.meta.env.VITE_GROQ_API_KEY;
const model = "llama-3.1-8b-instant";

export const enhanceMessageWithAI = async (text, action) => {
  if (!text) return text;
  
  if (!apiKey) {
    console.error("Не найден VITE_GROQ_API_KEY в файле .env");
    return "Ошибка: Нет API ключа. Проверьте .env файл.";
  }

  // Настраиваем системный промпт (инструкцию для нейросети)
  let systemPrompt = "";
  switch (action) {
    case "fix":
      systemPrompt = "Ты — встроенный редактор мессенджера. Исправь грамматические и пунктуационные ошибки в тексте пользователя. Выведи ТОЛЬКО исправленный текст, без кавычек, без приветствий и без пояснений.";
      break;
    case "formal":
      systemPrompt = "Ты — редактор деловой переписки. Перепиши текст в вежливом, профессиональном и естественном официально-деловом стиле на том же языке. Сохрани исходный смысл, факты, имена, даты и намерение автора; не добавляй новую информацию и не меняй тон на чрезмерно формальный. Сделай текст ясным и лаконичным, убери просторечия и эмоциональные слова, при необходимости мягко смягчи категоричность. Верни только готовый вариант сообщения без кавычек, заголовков, комментариев и пояснений.";
      break;
    case "english":
      systemPrompt = "Ты — переводчик в мессенджере. Переведи текст пользователя на английский язык (естественный разговорный стиль). Выведи ТОЛЬКО перевод, без кавычек и пояснений.";
      break;
    default:
      return text;
  }

  try {
    // Делаем прямой REST API запрос к серверам Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Рабочая и быстрая модель для редакторских задач
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3, // Низкая температура, чтобы ИИ не фантазировал, а четко выполнял задачу
        max_tokens: 1024,
      }),
    });

    // Обработка HTTP-ошибок
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Groq API Error:", errorData);
      
      if (response.status === 429) {
        return "Ошибка: Слишком много запросов. Подождите пару секунд ⏳";
      }
      return "Ошибка: Сбой на сервере нейросети.";
    }

    // Парсим успешный ответ
    const data = await response.json();
    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error("Ошибка при запросе к Groq:", error);
    return "Ошибка: Не удалось связаться с нейросетью. Проверьте интернет.";
  }
};