const getNoteOwnerId = (note) => {
  if (!note?.user) {
    return null;
  }

  return note.user._id ? note.user._id.toString() : note.user.toString();
};

export const canManageNote = (user, note) =>
  getNoteOwnerId(note) === user.id;

export const sanitizeNoteForResponse = (note) => {
  const responseNote = note.toObject ? note.toObject() : { ...note };

  if (responseNote.file) {
    delete responseNote.file.encryptedPath;
    delete responseNote.file.iv;
  }

  return responseNote;
};
