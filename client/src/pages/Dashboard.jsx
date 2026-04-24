import { useState, useEffect } from 'react';
import api from '../utils/api';
import NoteCard from '../components/NoteCard';
import NoteModal from '../components/NoteModal';
import './Dashboard.css';

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editNote, setEditNote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const response = await api.get('/notes');
      setNotes(response.data.notes);
      setError('');
    } catch (err) {
      setError('Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = () => {
    setEditNote(null);
    setShowModal(true);
  };

  const handleEditNote = (note) => {
    setEditNote(note);
    setShowModal(true);
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await api.delete(`/notes/${noteId}`);
      setNotes(notes.filter((note) => note._id !== noteId));
    } catch (err) {
      alert('Failed to delete note');
      console.error(err);
    }
  };

  const handleToggleComplete = async (noteId) => {
    try {
      const note = notes.find((n) => n._id === noteId);
      await api.put(`/notes/${noteId}`, {
        completed: !note.completed,
      });
      setNotes(
        notes.map((n) =>
          n._id === noteId ? { ...n, completed: !n.completed } : n,
        ),
      );
    } catch (err) {
      alert('Failed to update task status');
      console.error(err);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditNote(null);
  };

  const handleNoteSaved = () => {
    fetchNotes();
    handleModalClose();
  };

  const getTaskBreakdown = () => {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();

    const counts = notes.reduce(
      (accumulator, note) => {
        if (note.completed) {
          accumulator.completed += 1;
          return accumulator;
        }

        if (note.dueDate) {
          const dueDate = new Date(note.dueDate);
          const timeRemaining = dueDate.getTime() - now.getTime();

          if (timeRemaining <= oneWeekInMs) {
            accumulator.approaching += 1;
            return accumulator;
          }
        }

        accumulator.remaining += 1;
        return accumulator;
      },
      {
        completed: 0,
        approaching: 0,
        remaining: 0,
      },
    );

    const total = notes.length;
    const completedAngle = total ? (counts.completed / total) * 360 : 0;
    const approachingAngle = total ? (counts.approaching / total) * 360 : 0;

    return {
      ...counts,
      total,
      completedAngle,
      approachingAngle,
    };
  };

  const taskBreakdown = getTaskBreakdown();
  const chartStyle = taskBreakdown.total
    ? {
        '--completed-angle': `${taskBreakdown.completedAngle}deg`,
        '--approaching-angle': `${taskBreakdown.approachingAngle}deg`,
      }
    : {};

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your notes...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title-wrap">
          <h1>My Tasks</h1>
          <p className="dashboard-subtitle">
            {notes.length} {notes.length === 1 ? 'task' : 'tasks'} total
          </p>
          {notes.length > 0 && (
            <div className="task-overview-status">
              <div
                className="task-overview-chart"
                style={chartStyle}
                role="img"
                aria-label={`Task summary: ${taskBreakdown.completed} completed, ${taskBreakdown.remaining} remaining, ${taskBreakdown.approaching} approaching deadline`}
              >
                <span className="task-overview-total">{taskBreakdown.total}</span>
              </div>
              <div className="task-overview-legend">
                <span className="task-overview-heading">Task breakdown</span>
                <div className="task-overview-legend-item">
                  <span className="task-overview-swatch swatch-complete" aria-hidden="true" />
                  <span>{taskBreakdown.completed} completed</span>
                </div>
                <div className="task-overview-legend-item">
                  <span className="task-overview-swatch swatch-remaining" aria-hidden="true" />
                  <span>{taskBreakdown.remaining} remaining</span>
                </div>
                <div className="task-overview-legend-item">
                  <span className="task-overview-swatch swatch-approaching" aria-hidden="true" />
                  <span>{taskBreakdown.approaching} approaching deadline</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button className="btn-create" onClick={handleCreateNote} type="button">
          Create Task
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <span className="task-overview-chart is-empty" aria-hidden="true" />
          </div>
          <h2>No tasks yet</h2>
          <p>Create your first task to get started</p>
          <button className="btn-primary" onClick={handleCreateNote} type="button">
            Create Your First Task
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <NoteCard
              key={note._id}
              note={note}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              onToggle={handleToggleComplete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NoteModal
          note={editNote}
          onClose={handleModalClose}
          onSave={handleNoteSaved}
        />
      )}
    </div>
  );
};

export default Dashboard;
