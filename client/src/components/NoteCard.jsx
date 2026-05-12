import api from '../utils/api';
import './NoteCard.css';

const NoteCard = ({ note, onEdit, onDelete, onToggle }) => {
// const NoteCard = ({ note, onEdit, onDelete }) => {
  const ownerName =
    note.user && typeof note.user === 'object' ? note.user.name : null;

  const getTaskStatus = () => {
    if (note.completed) {
      return {
        className: 'status-complete',
        label: 'Completed task',
      };
    }
    if (note.dueDate) {
      const now = new Date();
      const dueDate = new Date(note.dueDate);
      const timeRemaining = dueDate.getTime() - now.getTime();
      const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;

      if (timeRemaining <= oneWeekInMs) {
        return {
          className: 'status-warning',
          label: 'Task due within one week',
        };
      }
    }

    return {
      className: 'status-assigned',
      label: 'Assigned task',
    };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDownloadFile = async () => {
    try {
      const response = await api.get(`/notes/${note._id}/file`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', note.file.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file');
      console.error(err);
    }
  };

  const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const taskStatus = getTaskStatus();

  return (
    <div className={`note-card ${note.isPinned ? 'pinned' : ''} ${note.completed ? 'completed' : ''}`}>
      {note.isPinned && (
        <div className="pin-badge">Pinned</div>
      )}

      <div className="note-card-header">
        <div className="note-header-top">
          <div className="note-date-complete">
            <input
              type="checkbox"
              checked={note.completed}
              onChange={() => onToggle(note._id)}
              title="Mark as complete"
              className="complete-checkbox"
              aria-label="Mark task as complete"
            />
            <span className="note-date">
              {formatDate(note.updatedAt || note.createdAt)}
            </span>
          </div>
          <div className="note-actions">
            <button
              className="btn-icon"
              onClick={() => onEdit(note)}
              title="Edit task"
              type="button"
            >
              Edit
            </button>
            <button
              className="btn-icon"
              onClick={() => onDelete(note._id)}
              title="Delete task"
              type="button"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="note-title-group">
          <span
            className={`task-status-indicator ${taskStatus.className}`}
            aria-label={taskStatus.label}
            title={taskStatus.label}
          />
          <h3 className="note-title">{note.title}</h3>
        </div>

        <div className="note-meta">
          {note.completed && <span className="badge badge-success">Completed</span>}
          {note.dueDate && <span className="badge badge-info">Due {new Date(note.dueDate).toLocaleDateString()}</span>}
          {ownerName && <span className="badge badge-owner">Owner: {ownerName}</span>}
        </div>
      </div>

      <p className="note-content">{truncateText(note.description, 200)}</p>

      {note.file && (
        <div className="note-file">
          <div className="file-info">
            <span className="file-icon" aria-hidden="true">&#128206;</span>
            <span className="file-name">{note.file.originalName}</span>
          </div>
          <button className="btn-download" onClick={handleDownloadFile} type="button">
            Download
          </button>
        </div>
      )}
    </div>
  );
};
export default NoteCard;
