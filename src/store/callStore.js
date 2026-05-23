import { create } from "zustand";

/**
 * Состояние звонков. Один активный звонок за раз.
 *
 *  incomingCall — звонит ИЗВНЕ кто-то нам (рендерим модалку «принять/отклонить»).
 *  activeCall   — мы либо инициатор, либо приняли входящий: идёт сигнализация
 *                 или уже активная сессия.
 *
 * Поля:
 *   id, role: "caller" | "callee",
 *   peer: { uid, displayName, avatarUrl? },
 *   status: "ringing" | "active" | "ended"
 *   startedAt: Timestamp (когда поднялась)
 */
export const useCallStore = create((set) => ({
  incomingCall: null,
  activeCall: null,
  isMuted: false,

  setIncomingCall: (call) => set({ incomingCall: call }),
  setActiveCall: (call) => set({ activeCall: call }),
  patchActiveCall: (patch) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, ...patch } : null,
    })),
  setMuted: (muted) => set({ isMuted: muted }),

  reset: () => set({ incomingCall: null, activeCall: null, isMuted: false }),
}));
