import { useState, useEffect } from 'react';
import api from '../utils/api';
import './NoteModal.css';

const NoteModal = ({
  note,
  onClose,
  onSave,
  scope = 'personal',
  team = null,
  assigneeOptions = [],
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    completed: false,
    assignedTo: '',
  });
  const [file, setFile] = useState(null);
  const [existingFile, setExistingFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        description: note.description,
        dueDate: note.dueDate ? note.dueDate.slice(0, 10) : '',
        completed: note.completed || false,
        assignedTo: note.assignedTo?._id || note.assignedTo || '',
      });
      setExistingFile(note.file || null);
    }
  }, [note]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (10MB limit)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    document.getElementById('file-input').value = '';
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.description.trim()) {
      setError('Title and description are required');
      return;
    }

    let dueDateToSave = formData.dueDate;

    if (!dueDateToSave) {
      const useToday = window.confirm(
        'This task needs a deadline. Press OK to set the deadline to today, or Cancel to go back and choose a different date.',
      );

      if (!useToday) {
        setError('Please choose a due date to continue.');
        document.getElementById('dueDate')?.focus();
        return;
      }

      dueDateToSave = getTodayDate();
      setFormData((currentFormData) => ({
        ...currentFormData,
        dueDate: dueDateToSave,
      }));
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('dueDate', dueDateToSave);
      formDataToSend.append('completed', formData.completed);

      if (scope === 'team') {
        formDataToSend.append('assignedTo', formData.assignedTo);
      }

      if (file) {
        formDataToSend.append('file', file);
      }

      if (scope === 'team' && team) {
        const teamTaskUrl = note
          ? `/teams/${team._id}/tasks/${note._id}`
          : `/teams/${team._id}/tasks`;
        const method = note ? api.patch : api.post;

        await method(teamTaskUrl, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else if (note) {
        await api.put(`/notes/${note._id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/notes', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await api.delete(`/notes/${note._id}/file`);
      setExistingFile(null);
      alert('File deleted successfully');
    } catch (err) {
      alert('Failed to delete file');
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{note ? 'Edit Task' : scope === 'team' ? 'Create Team Task' : 'Create New Task'}</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="note-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter note title"
              required
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your task..."
              required
              rows={6}
              maxLength={10000}
            />
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
            />
            <p className="field-help-text">
              A deadline is required before the task can be saved.
            </p>
          </div>

          <div className="form-group-checkbox">
            <input
              type="checkbox"
              id="completed"
              name="completed"
              checked={formData.completed}
              onChange={handleChange}
            />
            <label htmlFor="completed">✅ Mark task complete</label>
          </div>

          {scope === 'team' && (
            <div className="form-group">
              <label htmlFor="assignedTo">Assign To</label>
              <select
                id="assignedTo"
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleChange}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((member) => {
                  const memberUserId = member.user?._id || member.user;
                  const memberName = member.user?.name || member.user?.email || 'Unknown user';

                  return (
                    <option key={memberUserId} value={memberUserId}>
                      {memberName}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="file-input">
              🔐 Encrypted File Attachment (Optional)
            </label>
            
            {existingFile && !file && (
              <div className="existing-file">
                <div className="file-info">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{existingFile.originalName}</span>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={handleDeleteFile}
                >
                  Remove
                </button>
              </div>
            )}

            <input
              type="file"
              id="file-input"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip"
            />

            {file && (
              <div className="file-preview">
                <div className="file-info">
                  <span className="file-icon">📎</span>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={handleRemoveFile}
                >
                  Remove
                </button>
              </div>
            )}

            <p className="help-text">
              Max file size: 10MB. Files are automatically encrypted before
              storage.
            </p>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : note ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
