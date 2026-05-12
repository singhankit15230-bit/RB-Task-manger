import Note from '../models/Note.js';
import { encryptFile, decryptFile, deleteEncryptedFile } from '../utils/encryption.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { canManageNote, sanitizeNoteForResponse } from '../utils/permissions.js';

/**
 * @desc    Create a new note
 * @route   POST /api/notes
 * @access  Private
 */
export const createNote = async (req, res, next) => {
  try {
    const { title, description, dueDate, completed } = req.body;

    // Validate input
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and description'
      });
    }

    // Create task object
    const noteData = {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      completed: completed === 'true' || completed === true,
      user: req.user.id
    };

    // Handle file upload if present
    if (req.file) {
      try {
        // Encrypt the file
        const { encryptedPath, iv } = await encryptFile(req.file.path);

        noteData.file = {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          encryptedPath,
          iv
        };
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'File encryption failed'
        });
      }
    }

    // Create note
    const note = await Note.create(noteData);

    await createAuditLog({
      actor: req.user.id,
      action: 'note.create',
      entityType: 'note',
      entityId: note._id.toString(),
      details: {
        title: note.title,
        hasFile: Boolean(note.file?.encryptedPath)
      },
      req
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      note: sanitizeNoteForResponse(note)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all notes for user
 * @route   GET /api/notes
 * @access  Private
 */
export const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ user: req.user.id, team: { $exists: false } })
      .populate('user', 'name email role')
      .sort({ completed: 1, createdAt: -1 })
      .select('-file.encryptedPath -file.iv');

    res.status(200).json({
      success: true,
      count: notes.length,
      notes: notes.map((note) => sanitizeNoteForResponse(note))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single note
 * @route   GET /api/notes/:id
 * @access  Private
 */
export const getNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('user', 'name email role')
      .select('-file.encryptedPath -file.iv');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership
    if (!canManageNote(req.user, note)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this note'
      });
    }

    res.status(200).json({
      success: true,
      note: sanitizeNoteForResponse(note)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update note
 * @route   PUT /api/notes/:id
 * @access  Private
 */
export const updateNote = async (req, res, next) => {
  try {
    let note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership
    if (!canManageNote(req.user, note)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this note'
      });
    }

    const { title, description, dueDate, completed } = req.body;

    // Update basic fields
    if (title) note.title = title;
    if (description) note.description = description;
    if (dueDate) note.dueDate = new Date(dueDate);
    if (typeof completed !== 'undefined') note.completed = completed === 'true' || completed === true;

    // Handle file upload if present
    if (req.file) {
      // Delete old encrypted file if exists
      if (note.file && note.file.encryptedPath) {
        await deleteEncryptedFile(note.file.encryptedPath);
      }

      try {
        // Encrypt the new file
        const { encryptedPath, iv } = await encryptFile(req.file.path);

        note.file = {
          fileName: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          encryptedPath,
          iv
        };
      } catch (error) {
        return res.status(500).json({
          success: false,
          message: 'File encryption failed'
        });
      }
    }

    await note.save();

    await createAuditLog({
      actor: req.user.id,
      action: 'note.update',
      entityType: 'note',
      entityId: note._id.toString(),
      details: {
        title: note.title,
        completed: note.completed,
        updatedOwnResource: note.user.toString() === req.user.id
      },
      req
    });

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      note: sanitizeNoteForResponse(note)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete note
 * @route   DELETE /api/notes/:id
 * @access  Private
 */
export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership
    if (!canManageNote(req.user, note)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this note'
      });
    }

    // Delete encrypted file if exists
    if (note.file && note.file.encryptedPath) {
      await deleteEncryptedFile(note.file.encryptedPath);
    }

    await createAuditLog({
      actor: req.user.id,
      action: 'note.delete',
      entityType: 'note',
      entityId: note._id.toString(),
      details: {
        title: note.title,
        deletedOwnResource: note.user.toString() === req.user.id
      },
      req
    });

    await note.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Note deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download decrypted file
 * @route   GET /api/notes/:id/file
 * @access  Private
 */
export const downloadFile = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership
    if (!canManageNote(req.user, note)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this file'
      });
    }

    // Check if file exists
    if (!note.file || !note.file.encryptedPath) {
      return res.status(404).json({
        success: false,
        message: 'No file attached to this note'
      });
    }

    // Decrypt file
    const decryptedBuffer = await decryptFile(
      note.file.encryptedPath,
      note.file.iv
    );

    await createAuditLog({
      actor: req.user.id,
      action: 'note.file_download',
      entityType: 'note',
      entityId: note._id.toString(),
      details: {
        fileName: note.file.originalName
      },
      req
    });

    // Set headers for file download
    res.setHeader('Content-Type', note.file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${note.file.originalName}"`
    );
    res.setHeader('Content-Length', decryptedBuffer.length);

    // Send decrypted file
    res.send(decryptedBuffer);
  } catch (error) {
    console.error('File download error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
};

/**
 * @desc    Delete file from note
 * @route   DELETE /api/notes/:id/file
 * @access  Private
 */
export const deleteFile = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Check ownership
    if (!canManageNote(req.user, note)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this note'
      });
    }

    // Check if file exists
    if (!note.file || !note.file.encryptedPath) {
      return res.status(404).json({
        success: false,
        message: 'No file attached to this note'
      });
    }

    // Delete encrypted file
    await deleteEncryptedFile(note.file.encryptedPath);

    await createAuditLog({
      actor: req.user.id,
      action: 'note.file_delete',
      entityType: 'note',
      entityId: note._id.toString(),
      details: {
        fileName: note.file.originalName
      },
      req
    });

    // Remove file data from note
    note.file = undefined;
    await note.save();

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
