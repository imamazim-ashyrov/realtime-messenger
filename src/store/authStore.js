import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,          // Данные пользователя
  isLoading: true,     // Состояние начальной проверки
  
  // Функция для обновления пользователя
  setUser: (userData) => set({ user: userData, isLoading: false }),
  
  // Функция для выхода
  logout: () => set({ user: null, isLoading: false }),
}));