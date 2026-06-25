import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBodyParts,
  getWorkouts,
  getWorkoutByDate,
  saveWorkout,
  deleteWorkout,
  parseDateFromStorage
} from '../services/firestore';
import { format } from 'date-fns';

function DetailedView() {
  const { currentUser } = useAuth();
  const [bodyParts, setBodyParts] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const [parts, allWorkouts] = await Promise.all([
        getBodyParts(currentUser.uid),
        getWorkouts(currentUser.uid)
      ]);

      setBodyParts(parts);
      setWorkouts(allWorkouts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalWorkouts = workouts.length;
  const totalPages = Math.ceil(totalWorkouts / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedWorkouts = workouts.slice(startIndex, endIndex);

  const getDayName = (dateStr) => {
    try {
      const date = parseDateFromStorage(dateStr);
      return format(date, 'EEEE');
    } catch {
      return '';
    }
  };

  const getFormattedDate = (dateStr) => {
    try {
      const date = parseDateFromStorage(dateStr);
      return format(date, 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const handleEdit = (workout) => {
    setEditingWorkout(workout);
    setEditingRemarks(workout?.remarks || '');
    setShowSelector(false);
  };

  const handleCancelEdit = async () => {
    setEditingWorkout(null);
    setEditingRemarks('');
    setShowSelector(false);
    // Refresh data
    const allWorkouts = await getWorkouts(currentUser.uid);
    setWorkouts(allWorkouts);
  };

  const handleAddExercise = async (bodyPart) => {
    if (!editingWorkout) return;

    const currentParts = editingWorkout.selectedBodyParts || [];
    if (currentParts.includes(bodyPart)) return;

    const newParts = [...currentParts, bodyPart];
    await saveEditingWorkout(newParts, editingRemarks);
  };

  const handleRemoveExercise = async (bodyPart) => {
    if (!editingWorkout) return;

    const currentParts = editingWorkout.selectedBodyParts || [];
    const newParts = currentParts.filter((p) => p !== bodyPart);
    await saveEditingWorkout(newParts, editingRemarks);
  };

  // Local state for editing remarks to avoid typing lag
  const [editingRemarks, setEditingRemarks] = useState('');

  const handleRemarksChange = (value) => {
    setEditingRemarks(value);
  };

  const handleSaveRemarks = async () => {
    if (!editingWorkout) return;
    const currentParts = editingWorkout.selectedBodyParts || [];
    await saveEditingWorkout(currentParts, editingRemarks);
    // Don't clear editingRemarks - user may want to continue editing
  };

  const saveEditingWorkout = async (selectedParts, remarks) => {
    if (!currentUser || !editingWorkout) return;

    setSaving(true);
    try {
      const saved = await saveWorkout(currentUser.uid, editingWorkout.date, selectedParts, remarks);
      if (saved) {
        setEditingWorkout(saved);
      } else {
        setEditingWorkout(null);
      }
    } catch (error) {
      console.error('Error saving workout:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dateStr) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      await deleteWorkout(currentUser.uid, dateStr);
      // Update state directly instead of fetching all workouts
      setWorkouts(prev => {
        const updated = prev.filter(w => w.date !== dateStr);
        return updated;
      });
      setDeleteConfirm(null);

      // Adjust current page if necessary
      const newTotalPages = Math.ceil((workouts.length - 1) / pageSize);
      if (currentPage > newTotalPages) {
        setCurrentPage(Math.max(1, newTotalPages));
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="detailed-view-page">
      <div className="page-header">
        <h1>Detailed View</h1>
        <p className="page-subtitle">All workout entries</p>
      </div>

      {/* Page Size Control */}
      <div className="controls-bar">
        <div className="page-size-control">
          <label>Show:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries</span>
        </div>

        <div className="pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, totalWorkouts)} of {totalWorkouts}
        </div>
      </div>

      {workouts.length === 0 ? (
        <div className="empty-state">
          <p>No workout entries found.</p>
          <p className="empty-hint">Start tracking your workouts from the dashboard.</p>
        </div>
      ) : (
        <>
          <div className="workouts-list">
            {paginatedWorkouts.map((workout) => {
              const isEditing = editingWorkout?.date === workout.date;
              const exercises = workout.selectedBodyParts || [];
              const availableParts = bodyParts.filter(
                (bp) => !exercises.includes(bp)
              );

              return (
                <div key={workout.date} className="workout-card">
                  {isEditing ? (
                    <div className="workout-edit">
                      <div className="edit-header">
                        <h3>{getFormattedDate(workout.date)}</h3>
                        <span className="day-name">{getDayName(workout.date)}</span>
                      </div>

                      <div className="edit-actions">
                        <button
                          className="btn btn-add-small"
                          onClick={() => setShowSelector(!showSelector)}
                          disabled={saving || bodyParts.length === 0}
                        >
                          + Add Exercise
                        </button>
                      </div>

                      {showSelector && availableParts.length > 0 && (
                        <div className="exercise-selector">
                          <div className="selector-grid">
                            {availableParts.map((part) => (
                              <button
                                key={part}
                                className="btn btn-selector"
                                onClick={() => handleAddExercise(part)}
                              >
                                {part}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {exercises.length > 0 ? (
                        <div className="exercise-list">
                          {exercises.map((exercise) => (
                            <div key={exercise} className="exercise-tag">
                              <span>{exercise}</span>
                              <button
                                className="btn-remove"
                                onClick={() => handleRemoveExercise(exercise)}
                                disabled={saving}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="empty-message">No exercises.</p>
                      )}

                      <div className="remarks-section">
                        <label>Remarks</label>
                        <textarea
                          value={editingRemarks}
                          onChange={(e) => handleRemarksChange(e.target.value)}
                          placeholder="Add notes..."
                          rows={2}
                        />
                        <button
                          className="btn btn-save"
                          onClick={handleSaveRemarks}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Remarks'}
                        </button>
                      </div>

                      <div className="edit-buttons">
                        <button
                          className="btn btn-secondary"
                          onClick={handleCancelEdit}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="workout-view">
                      <div className="workout-info">
                        <div className="workout-date">
                          <span className="date">{getFormattedDate(workout.date)}</span>
                          <span className="day-name">{getDayName(workout.date)}</span>
                        </div>
                        <div className="workout-exercises">
                          {exercises.length > 0 ? (
                            <div className="exercise-tags">
                              {exercises.map((ex) => (
                                <span key={ex} className="tag">
                                  {ex}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-exercises">No exercises</span>
                          )}
                        </div>
                        {workout.remarks && (
                          <div className="workout-remarks">
                            <p>{workout.remarks}</p>
                          </div>
                        )}
                      </div>
                      <div className="workout-actions">
                        <button
                          className="btn btn-edit"
                          onClick={() => handleEdit(workout)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-delete"
                          onClick={() => setDeleteConfirm(workout.date)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Modal */}
                  {deleteConfirm === workout.date && (
                    <div className="modal-overlay">
                      <div className="modal confirm-modal">
                        <h3>Delete Workout?</h3>
                        <p>
                          Are you sure you want to delete the workout for{' '}
                          <strong>{getFormattedDate(workout.date)}</strong>?
                        </p>
                        <div className="modal-buttons">
                          <button
                            className="btn btn-secondary"
                            onClick={() => setDeleteConfirm(null)}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-delete"
                            onClick={() => handleDelete(workout.date)}
                            disabled={saving}
                          >
                            {saving ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="pagination">
            <button
              className="btn btn-page"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-page"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DetailedView;