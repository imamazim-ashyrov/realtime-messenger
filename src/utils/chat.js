/**
 * Детерминированный ID приватного чата из двух UID.
 * Сортировка гарантирует, что пара (A, B) и (B, A) дают один и тот же chatId,
 * поэтому случайно создать два чата на одну пару невозможно.
 * @param {string} uidA
 * @param {string} uidB
 * @returns {string|null}
 */
export const getPrivateChatId = (uidA, uidB) => {
  if (!uidA || !uidB) return null;
  return [uidA, uidB].sort().join("_");
};

/**
 * Для приватного чата возвращает UID собеседника (не текущего пользователя).
 * @param {string[]} members
 * @param {string} currentUid
 * @returns {string|undefined}
 */
export const getPeerUid = (members, currentUid) => {
  if (!Array.isArray(members)) return undefined;
  return members.find((uid) => uid !== currentUid);
};
