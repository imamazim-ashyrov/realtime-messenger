const DeleteMessageModal = ({
  messageToDelete,
  currentUserUid,
  onDeleteForEveryone,
  onDeleteForMe,
  onCancel,
}) => {
  if (!messageToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl text-center">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Что сделать с сообщением?
        </h3>
        <div className="flex flex-col space-y-3">
          {messageToDelete.senderId === currentUserUid && (
            <button
              onClick={onDeleteForEveryone}
              className="rounded-lg bg-red-100 py-2 font-medium text-red-600 hover:bg-red-200 transition-colors"
            >
              Удалить у всех
            </button>
          )}
          <button
            onClick={onDeleteForMe}
            className="rounded-lg bg-yellow-100 py-2 font-medium text-yellow-700 hover:bg-yellow-200 transition-colors"
          >
            Удалить только у меня
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg bg-gray-100 py-2 font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteMessageModal;
