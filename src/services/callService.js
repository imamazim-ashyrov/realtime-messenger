import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

/**
 * Слой работы с Firestore по сущности calls/{callId}.
 *  - calls/{callId}                     — основной документ (offer, answer, status)
 *  - calls/{callId}/callerCandidates    — ICE-кандидаты вызывающего
 *  - calls/{callId}/calleeCandidates    — ICE-кандидаты принимающего
 */

const memberInfo = (u) => ({
  uid: u.uid,
  displayName: u.displayName || u.email?.split("@")[0] || "Пользователь",
  avatarUrl: u.photoURL || u.avatarUrl || null,
});

/** Сгенерировать новый callId до записи (нужен ICE до setDoc). */
export const newCallId = () => doc(collection(db, "calls")).id;

/** Создать документ звонка под заранее известным callId. */
export const createCallDoc = async ({ callId, caller, callee, offer }) => {
  await setDoc(doc(db, "calls", callId), {
    callerUid: caller.uid,
    calleeUid: callee.uid,
    participants: [caller.uid, callee.uid],
    callerInfo: memberInfo(caller),
    calleeInfo: memberInfo(callee),
    status: "ringing",
    offer,
    answer: null,
    createdAt: serverTimestamp(),
    acceptedAt: null,
    endedAt: null,
  });
};

/** Принять звонок: сохранить answer и переключить статус в "active". */
export const acceptCallDoc = async (callId, answer) => {
  await updateDoc(doc(db, "calls", callId), {
    answer,
    status: "active",
    acceptedAt: serverTimestamp(),
  });
};

/** Отклонить входящий звонок. */
export const rejectCallDoc = async (callId) => {
  await updateDoc(doc(db, "calls", callId), {
    status: "rejected",
    endedAt: serverTimestamp(),
  });
};

/** Завершить звонок (любой стороной). */
export const endCallDoc = async (callId) => {
  try {
    await updateDoc(doc(db, "calls", callId), {
      status: "ended",
      endedAt: serverTimestamp(),
    });
  } catch {
    /* документ мог быть уже закрыт другой стороной */
  }
};

/** Добавить ICE-кандидата в свою подколлекцию. */
export const addIceCandidate = async (callId, role, candidate) => {
  const subPath = role === "caller" ? "callerCandidates" : "calleeCandidates";
  await addDoc(collection(db, "calls", callId, subPath), candidate);
};

const logError = (where) => (err) =>
  console.error(`[callService] ${where} failed:`, err?.code || err?.message || err);

/** Подписаться на чужие ICE-кандидаты. */
export const subscribeRemoteCandidates = (callId, myRole, onCandidate) => {
  // Я caller → слушаю calleeCandidates, и наоборот
  const subPath = myRole === "caller" ? "calleeCandidates" : "callerCandidates";
  return onSnapshot(
    collection(db, "calls", callId, subPath),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") onCandidate(change.doc.data());
      });
    },
    logError(`subscribeRemoteCandidates(${subPath})`),
  );
};

/** Подписаться на сам документ звонка (status, answer, endedAt). */
export const subscribeCallDoc = (callId, onChange) =>
  onSnapshot(
    doc(db, "calls", callId),
    (snap) => {
      if (snap.exists()) onChange({ id: snap.id, ...snap.data() });
      else onChange(null);
    },
    logError("subscribeCallDoc"),
  );

/**
 * Слушать звонящие входящие звонки. onSnapshot отдаёт полный массив
 * активно звонящих документов — менеджер сам решит, какой показать
 * и когда закрыть (если звонящий отменил, документ выпадает из выборки).
 */
export const subscribeIncomingCalls = (myUid, onChange) => {
  const q = query(
    collection(db, "calls"),
    where("calleeUid", "==", myUid),
    where("status", "==", "ringing"),
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    logError("subscribeIncomingCalls"),
  );
};
