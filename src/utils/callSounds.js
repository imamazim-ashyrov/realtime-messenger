/**
 * Звуки звонка через Web Audio API — синтезируются прямо в браузере,
 * без внешних аудиофайлов и зависимостей.
 *
 * Все функции возвращают `stop()` для остановки и очистки AudioContext.
 */

const createContext = () => {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
};

const safeClose = (ctx) => {
  if (!ctx) return;
  ctx.close().catch(() => {});
};

/**
 * Гудок дозвона (ringback). Классический паттерн: 1 сек тон 440 Гц, 2 сек тишина.
 */
export const playDialTone = () => {
  const ctx = createContext();
  if (!ctx) return () => {};

  // resume() необходим, если контекст suspended (политика автоплея)
  ctx.resume().catch(() => {});

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 440;
  osc.connect(gain);
  osc.start();

  const PERIOD = 3; // 1 сек тон + 2 сек пауза
  const VOLUME = 0.12;

  const scheduleBeep = (startTime) => {
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(VOLUME, startTime + 0.02);
    gain.gain.setValueAtTime(VOLUME, startTime + 1);
    gain.gain.linearRampToValueAtTime(0, startTime + 1.02);
  };

  // Планируем несколько циклов вперёд, чтобы не было разрывов из-за setInterval-дрейфа
  let next = ctx.currentTime;
  const planAhead = () => {
    while (next < ctx.currentTime + 6) {
      scheduleBeep(next);
      next += PERIOD;
    }
  };
  planAhead();
  const id = setInterval(planAhead, 1000);

  return () => {
    clearInterval(id);
    try {
      osc.stop();
    } catch {
      /* noop */
    }
    safeClose(ctx);
  };
};

/**
 * Рингтон входящего. Короткий арпеджио C-E-G-C (классическое «динь-динь-динь»)
 * с паузой между повторами. Без копирайта, синтезируется на лету.
 */
export const playRingtone = () => {
  const ctx = createContext();
  if (!ctx) return () => {};

  ctx.resume().catch(() => {});

  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);

  // C5, E5, G5, C6 — мажорное трезвучие с октавой сверху
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const NOTE_DURATION = 0.22;
  const CYCLE = notes.length * NOTE_DURATION + 1.5; // мелодия + пауза

  const oscillators = [];

  const scheduleNote = (freq, startTime) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = "triangle"; // мягче, чем sine
    osc.frequency.value = freq;
    // Огибающая: быстрый attack, плавный release — звучит как нежный звоночек
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(1, startTime + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + NOTE_DURATION);
    osc.connect(noteGain);
    noteGain.connect(master);
    osc.start(startTime);
    osc.stop(startTime + NOTE_DURATION);
    oscillators.push(osc);
  };

  let next = ctx.currentTime + 0.05;
  const planAhead = () => {
    while (next < ctx.currentTime + 6) {
      notes.forEach((freq, i) => scheduleNote(freq, next + i * NOTE_DURATION));
      next += CYCLE;
    }
  };
  planAhead();
  const id = setInterval(planAhead, 1500);

  return () => {
    clearInterval(id);
    // Останавливаем все запланированные ноты немедленно (отключаем мастер-гейн)
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0, ctx.currentTime);
    } catch {
      /* noop */
    }
    oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        /* noop */
      }
    });
    safeClose(ctx);
  };
};
