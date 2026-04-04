import { create } from 'zustand';

export const useChatStore = create((set) => ({
  selectedUser: null, // Здесь будем хранить объект пользователя, с которым общаемся
  
  // Функция для выбора пользователя
  setSelectedUser: (user) => set({ selectedUser: user }),
  
  // Функция для сброса выбора (например, при выходе)
  resetChat: () => set({ selectedUser: null }),
}));