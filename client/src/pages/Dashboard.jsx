import { useState, useEffect } from 'react';
import api from '../utils/api';
import NoteCard from '../components/NoteCard';
import NoteModal from '../components/NoteModal';
import './Dashboard.css';

const availablePermissions = [
  { value: 'view_team', label: 'View team' },
  { value: 'manage_members', label: 'Manage members' },
  { value: 'manage_roles', label: 'Manage roles' },
  { value: 'manage_tasks', label: 'Manage team tasks' },
];

const Dashboard = () => {
  const [workspaceMode, setWorkspaceMode] = useState('personal');
  const [teamPanelMode, setTeamPanelMode] = useState('directory');
  const [notes, setNotes] = useState([]);
  const [teams, setTeams] = useState([]);
  const [teamTasks, setTeamTasks] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRoleId, setMemberRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState(['view_team']);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalScope, setModalScope] = useState('personal');
  const [editNote, setEditNote] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotes();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamTasks(selectedTeamId);
    }
  }, [selectedTeamId]);

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

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data.teams);

      if (!selectedTeamId && response.data.teams.length > 0) {
        setSelectedTeamId(response.data.teams[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeamTasks = async (teamId) => {
    try {
      const response = await api.get(`/teams/${teamId}/tasks`);
      setTeamTasks(response.data.tasks);
    } catch (err) {
      setTeamTasks([]);
      console.error(err);
    }
  };

  const selectedTeam = teams.find((team) => team._id === selectedTeamId);
  const teamPermissions = selectedTeam?.currentUserPermissions || [];
  const canManageMembers = teamPermissions.includes('manage_members');
  const canManageRoles = teamPermissions.includes('manage_roles');
  const canManageTasks = teamPermissions.includes('manage_tasks');

  const replaceTeam = (updatedTeam) => {
    setTeams((currentTeams) =>
      currentTeams.map((team) => (team._id === updatedTeam._id ? updatedTeam : team)),
    );
    setSelectedTeamId(updatedTeam._id);
  };

  const getRoleName = (team, roleId) =>
    team.roles.find((role) => role._id === roleId)?.name || 'Unknown role';

  const handleCreateNote = () => {
    setModalScope('personal');
    setEditNote(null);
    setShowModal(true);
  };

  const handleEditNote = (note) => {
    setModalScope('personal');
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
    if (modalScope === 'team' && selectedTeam) {
      fetchTeamTasks(selectedTeam._id);
    } else {
      fetchNotes();
    }
    handleModalClose();
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();

    if (!teamName.trim()) {
      return;
    }

    try {
      const response = await api.post('/teams', { name: teamName.trim() });
      setTeams((currentTeams) => [response.data.team, ...currentTeams]);
      setSelectedTeamId(response.data.team._id);
      setTeamPanelMode('manage');
      setTeamName('');
    } catch (err) {
      alert('Failed to create team');
      console.error(err);
    }
  };

  const handlePermissionToggle = (permission) => {
    if (permission === 'view_team') {
      return;
    }

    setRolePermissions((currentPermissions) =>
      currentPermissions.includes(permission)
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions, permission],
    );
  };

  const handleCreateRole = async (event) => {
    event.preventDefault();

    if (!selectedTeam || !roleName.trim()) {
      return;
    }

    try {
      const response = await api.post(`/teams/${selectedTeam._id}/roles`, {
        name: roleName.trim(),
        permissions: rolePermissions,
      });
      replaceTeam(response.data.team);
      setRoleName('');
      setRolePermissions(['view_team']);
    } catch (err) {
      alert('Failed to create role');
      console.error(err);
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();

    if (!selectedTeam || !memberEmail.trim()) {
      return;
    }

    try {
      const response = await api.post(`/teams/${selectedTeam._id}/members`, {
        email: memberEmail.trim(),
        roleId: memberRoleId || undefined,
      });
      replaceTeam(response.data.team);
      setMemberEmail('');
      setMemberRoleId('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
      console.error(err);
    }
  };

  const handleTeamRoleChange = async (memberUserId, roleId) => {
    if (!selectedTeam) {
      return;
    }

    try {
      const response = await api.patch(
        `/teams/${selectedTeam._id}/members/${memberUserId}/role`,
        { roleId },
      );
      replaceTeam(response.data.team);
    } catch (err) {
      alert('Failed to update role');
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!selectedTeam || !window.confirm('Remove this member from the team?')) {
      return;
    }

    try {
      const response = await api.delete(`/teams/${selectedTeam._id}/members/${memberUserId}`);
      replaceTeam(response.data.team);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
      console.error(err);
    }
  };

  const openTeam = (teamId) => {
    setSelectedTeamId(teamId);
    setTeamPanelMode('manage');
  };

  const handleCreateTeamTask = () => {
    setModalScope('team');
    setEditNote(null);
    setShowModal(true);
  };

  const handleToggleTeamTask = async (task) => {
    try {
      const response = await api.patch(`/teams/${selectedTeam._id}/tasks/${task._id}`, {
        completed: !task.completed,
      });
      setTeamTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask._id === task._id ? response.data.task : currentTask,
        ),
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update team task');
      console.error(err);
    }
  };

  const handleDeleteTeamTask = async (taskId) => {
    if (!selectedTeam || !window.confirm('Delete this team task?')) {
      return;
    }

    try {
      await api.delete(`/teams/${selectedTeam._id}/tasks/${taskId}`);
      setTeamTasks((currentTasks) => currentTasks.filter((task) => task._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete team task');
      console.error(err);
    }
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
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className="workspace-rail" aria-label="Workspace selector">
        <button
          className={`workspace-button ${workspaceMode === 'personal' ? 'active' : ''}`}
          onClick={() => setWorkspaceMode('personal')}
          type="button"
        >
          <span>Personal</span>
          <small>{notes.length} tasks</small>
        </button>
        <button
          className={`workspace-button ${workspaceMode === 'team' ? 'active' : ''}`}
          onClick={() => setWorkspaceMode('team')}
          type="button"
        >
          <span>Team</span>
          <small>{teams.length} teams</small>
        </button>
      </aside>

      <main className="dashboard">
        {workspaceMode === 'personal' ? (
          <>
            <div className="dashboard-header">
              <div className="dashboard-title-wrap">
                <h1>Personal Tasks</h1>
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
                <h2>No personal tasks yet</h2>
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
          </>
        ) : (
          <div className="team-workspace">
            <div className="team-workspace-header">
              <div>
                <h1>Team Tasks</h1>
                <p className="dashboard-subtitle">
                  {teamPanelMode === 'directory' ? 'Create or choose a team' : selectedTeam?.name}
                </p>
              </div>
              {teamPanelMode !== 'directory' && (
                <button
                  className="btn-secondary"
                  onClick={() => setTeamPanelMode('directory')}
                  type="button"
                >
                  Back to Teams
                </button>
              )}
            </div>

            {teamPanelMode === 'directory' && (
              <section className="team-panel team-panel-primary">
                <div className="team-panel-left">
                  <div className="team-panel-header">
                    <h2>Create Team</h2>
                    <p>New teams appear on the right.</p>
                  </div>

                  <form className="team-form vertical" onSubmit={handleCreateTeam}>
                    <input
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      placeholder="Team name"
                    />
                    <button className="btn-create" type="submit">Create Team</button>
                  </form>
                </div>

                <div className="team-panel-right">
                  <div className="team-panel-header">
                    <h2>Your Teams</h2>
                    <p>{teams.length} active workspace{teams.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className="team-card-grid">
                    {teams.map((team) => (
                      <button
                        className={`team-card ${team._id === selectedTeamId ? 'active' : ''}`}
                        key={team._id}
                        onClick={() => openTeam(team._id)}
                        type="button"
                      >
                        <span className="team-logo" aria-hidden="true">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                        <span>
                          <strong>{team.name}</strong>
                          <small>{team.members.length} members</small>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {teamPanelMode === 'manage' && selectedTeam && (
              <section className="team-panel manage-panel">
                <div className="team-member-box">
                  <div className="team-panel-header compact">
                    <h2>Add Users</h2>
                    <p>{selectedTeam.name}</p>
                  </div>

                  {canManageMembers ? (
                    <form className="team-form" onSubmit={handleAddMember}>
                      <input
                        value={memberEmail}
                        onChange={(event) => setMemberEmail(event.target.value)}
                        placeholder="User email"
                        type="email"
                      />
                      <select
                        value={memberRoleId}
                        onChange={(event) => setMemberRoleId(event.target.value)}
                      >
                        <option value="">Default role</option>
                        {selectedTeam.roles
                          .filter((role) => !(role.isSystem && role.name === 'Owner'))
                          .map((role) => (
                            <option key={role._id} value={role._id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                      <button className="btn-create" type="submit">Add</button>
                    </form>
                  ) : (
                    <p className="muted-copy">You can view this team.</p>
                  )}

                  <div className="team-list">
                    {selectedTeam.members.map((member) => {
                      const memberUserId = member.user?._id || member.user;
                      const isOwner = selectedTeam.owner === memberUserId;

                      return (
                        <div className="team-list-item compact" key={memberUserId}>
                          <div>
                            <strong>{member.user?.name || 'Unknown user'}</strong>
                            <p>{getRoleName(selectedTeam, member.role)}{isOwner ? ' - Team creator' : ''}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="team-actions-box">
                  <div className="team-logo large" aria-hidden="true">
                    {selectedTeam.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2>{selectedTeam.name}</h2>
                    <p className="muted-copy">{selectedTeam.members.length} members</p>
                  </div>
                  <div className="team-action-buttons">
                    <button className="btn-create" onClick={() => setTeamPanelMode('tasks')} type="button">
                      Manage Tasks
                    </button>
                    <button className="btn-secondary" onClick={() => setTeamPanelMode('roles')} type="button">
                      Roles
                    </button>
                  </div>
                </div>
              </section>
            )}

            {teamPanelMode === 'roles' && selectedTeam && (
              <section className="team-panel roles-panel">
                <div className="roles-assignment-box">
                  <div className="team-panel-header">
                    <h2>Give Roles</h2>
                    <p>{selectedTeam.name}</p>
                  </div>

                  <div className="team-list">
                    {selectedTeam.members.map((member) => {
                      const memberUserId = member.user?._id || member.user;
                      const isOwner = selectedTeam.owner === memberUserId;

                      return (
                        <div className="team-list-item" key={memberUserId}>
                          <div>
                            <strong>{member.user?.name || 'Unknown user'}</strong>
                            <p>{member.user?.email || 'No email'}</p>
                          </div>
                          {canManageMembers && !isOwner ? (
                            <div className="team-row-actions">
                              <select
                                value={member.role}
                                onChange={(event) => handleTeamRoleChange(memberUserId, event.target.value)}
                              >
                                {selectedTeam.roles
                                  .filter((role) => !(role.isSystem && role.name === 'Owner'))
                                  .map((role) => (
                                    <option key={role._id} value={role._id}>
                                      {role.name}
                                    </option>
                                  ))}
                              </select>
                              <button
                                className="btn-secondary"
                                onClick={() => handleRemoveMember(memberUserId)}
                                type="button"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <span className="role-chip">{getRoleName(selectedTeam, member.role)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="roles-create-box">
                  <div className="team-panel-header">
                    <h2>Create Roles</h2>
                    <p>{selectedTeam.roles.length} roles</p>
                  </div>

                  {canManageRoles && (
                    <form className="team-role-form vertical" onSubmit={handleCreateRole}>
                      <input
                        value={roleName}
                        onChange={(event) => setRoleName(event.target.value)}
                        placeholder="Role name"
                      />
                      <div className="permission-grid">
                        {availablePermissions.map((permission) => (
                          <label className="permission-option" key={permission.value}>
                            <input
                              checked={rolePermissions.includes(permission.value)}
                              disabled={permission.value === 'view_team'}
                              onChange={() => handlePermissionToggle(permission.value)}
                              type="checkbox"
                            />
                            <span>{permission.label}</span>
                          </label>
                        ))}
                      </div>
                      <button className="btn-create" type="submit">Create Role</button>
                    </form>
                  )}

                  <div className="team-list">
                    {selectedTeam.roles.map((role) => (
                      <div className="team-list-item compact" key={role._id}>
                        <div>
                          <strong>{role.name}</strong>
                          <p>{role.permissions.join(', ')}</p>
                        </div>
                        {role.isSystem && <span className="role-chip">System</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {teamPanelMode === 'tasks' && selectedTeam && (
              <section className="team-panel tasks-panel">
                <div className="roles-create-box">
                  <div className="team-panel-header">
                    <h2>Create Team Task</h2>
                    <p>Uses the same task form as personal tasks.</p>
                  </div>

                  {canManageTasks ? (
                    <button className="btn-create" onClick={handleCreateTeamTask} type="button">
                      Create Team Task
                    </button>
                  ) : (
                    <p className="muted-copy">You do not have permission to create team tasks.</p>
                  )}
                </div>

                <div className="roles-assignment-box">
                  <div className="team-panel-header">
                    <h2>Team Tasks</h2>
                    <p>{teamTasks.length} task{teamTasks.length === 1 ? '' : 's'}</p>
                  </div>

                  <div className="team-list">
                    {teamTasks.map((task) => (
                      <div className={`team-list-item task-row ${task.completed ? 'completed' : ''}`} key={task._id}>
                        <div>
                          <strong>{task.title}</strong>
                          <p>{task.description}</p>
                          <p>Assigned to {task.assignedTo?.name || 'Unassigned'}</p>
                        </div>
                        <div className="team-row-actions">
                          <button
                            className="btn-secondary"
                            onClick={() => handleToggleTeamTask(task)}
                            type="button"
                          >
                            {task.completed ? 'Reopen' : 'Complete'}
                          </button>
                          {canManageTasks && (
                            <button
                              className="btn-secondary"
                              onClick={() => handleDeleteTeamTask(task._id)}
                              type="button"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {showModal && (
          <NoteModal
            note={editNote}
            onClose={handleModalClose}
            onSave={handleNoteSaved}
            scope={modalScope}
            team={selectedTeam}
            assigneeOptions={selectedTeam?.members || []}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;
