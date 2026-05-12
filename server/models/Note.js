import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [200, 'Title cannot be more than 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
      maxlength: [10000, 'Description cannot be more than 10000 characters']
    },
    dueDate: {
      type: Date
    },
    completed: {
      type: Boolean,
      default: false
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    file: {
      fileName: {
        type: String
      },
      originalName: {
        type: String
      },
      mimeType: {
        type: String
      },
      size: {
        type: Number
      },
      encryptedPath: {
        type: String
      },
      iv: {
        type: String // Initialization vector for decryption
      }
    }
  },
  {
    timestamps: true
  }
);

// Create indexes for better query performance
noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ user: 1, completed: 1, createdAt: -1 });
noteSchema.index({ team: 1, completed: 1, createdAt: -1 });
noteSchema.index({ assignedTo: 1, completed: 1, createdAt: -1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;
