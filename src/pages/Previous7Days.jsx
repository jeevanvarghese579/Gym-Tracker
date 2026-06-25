import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBodyParts,
  getWorkoutByDate,
  saveWorkout,
  formatDateForStorage
} from '../services/firestore';
import { format, subDays } from 'date-fns';

function Previous7Days() {
  const { currentUser } = useAuth();
  const [bodyParts, setBodyParts] = useState([]);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDay, setEditingDay] = useState(null);
  const [showSelector, setShowSelector] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const parts = await getBodyParts(currentUser.uid);
      setBodyParts(parts);

      // Load all 7 days in parallel
      const dates = [];
      for (let i = 0; i < 7; i++) {
        dates.push(subDays(new Date(), i));
      }

      const workoutPromises = dates.map(async (date) => {
        const dateStr = formatDateForStorage(date);
        const workout = await getWorkoutByDate(currentUser.uid, dateStr);
        return {
          date,
          dateStr,
          dayName: format(date, 'EEEE'),
          formattedDate: format(date, 'dd MMM yyyy'),
          workout
        };
      });

      const last7Days = await Promise.all(workoutPromises);
      setDays(last7Days);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddExercise = async (dateStr, bodyPart) => {
    const dayIndex = days.findIndex((d) => d.dateStr === dateStr);
    if (dayIndex === -1) return;

    const currentParts = days[dayIndex].workout?.selectedBodyParts || [];
    if (currentParts.includes(bodyPart)) return;

    const newParts = [...currentParts, bodyPart];
    await saveDayWorkout(dateStr, newParts, days[dayIndex].workout?.remarks || '');
  };

  const handleRemoveExercise = async (dateStr, bodyPart) => {
    const dayIndex = days.findIndex((d) => d.dateStr === dateStr);
    if (dayIndex === -1) return;

    const currentParts = days[dayIndex].workout?.selectedBodyParts || [];
    const newParts = currentParts.filter((p) => p !== bodyPart);
    await saveDayWorkout(dateStr, newParts, days[dayIndex].workout?.remarks || '');
  };

  const handleSaveRemarks = async (dateStr, remarks) => {
    const dayIndex = days.findIndex((d) => d.dateStr === dateStr);
    if (dayIndex === -1) return;

    const currentParts = days[dayIndex].workout?.selectedBodyParts || [];
    await saveDayWorkout(dateStr, currentParts, remarks);
  };

  // Local state for editing remarks to avoid typing lag
  const [editingRemarks, setEditingRemarks] = useState({});

  const handleRemarksChange = (dateStr, value) => {
    setEditingRemarks(prev => ({ ...prev, [dateStr]: value }));
  };

  const handleSaveRemarksClick = async (dateStr) => {
    const remarks = editingRemarks[dateStr] ?? days.find(d => d.dateStr === dateStr)?.workout?.remarks ?? '';
    await handleSaveRemarks(dateStr, remarks);
    setEditingRemarks(prev => {
      const updated = { ...prev };
      delete updated[dateStr];
      return updated;
    });
  };

  const saveDayWorkout = async (dateStr, selectedParts, remarks) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const saved = await saveWorkout(currentUser.uid, dateStr, selectedParts, remarks);

      // Update the specific day
      setDays(prevDays => {
        const dayIndex = prevDays.findIndex((d) => d.dateStr === dateStr);
        if (dayIndex !== -1) {
          const updatedDays = [...prevDays];
          updatedDays[dayIndex] = {
            ...updatedDays[dayIndex],
            workout: saved
          };
          return updatedDays;
        }
        return prevDays;
      });
    } catch (error) {
      console.error('Error saving workout:', error);
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
    <div className="previous-days-page">
      <div className="page-header">
        <h1>Previous 7 Days</h1>
        <p className="page-subtitle">Manage your recent workouts</p>
      </div>

      <div className="days-list">
        {days.map((day) => {
          const exercises = day.workout?.selectedBodyParts || [];
          const availableParts = bodyParts.filter(
            (bp) => !exercises.includes(bp)
          );
          const isExpanded = editingDay === day.dateStr;

          return (
            <div key={day.dateStr} className="day-card">
              <div
                className="day-header"
                onClick={() => setEditingDay(isExpanded ? null : day.dateStr)}
              >
                <div className="day-info">
                  <span className="day-name">{day.dayName}</span>
                  <span className="day-date">{day.formattedDate}</span>
                </div>
                <div className="day-summary">
                  {exercises.length > 0 ? (
                    <span className="exercise-names">
                      {exercises.join(', ')}
                    </span>
                  ) : (
                    <span className="no-workout">No workout</span>
                  )}
                  <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div className="day-details">
                  <div className="day-actions">
                    <button
                      className="btn btn-add-small"
                      onClick={() =>
                        setShowSelector(
                          showSelector === day.dateStr ? null : day.dateStr
                        )
                      }
                      disabled={saving || bodyParts.length === 0}
                    >
                      + Add Exercise
                    </button>
                  </div>

                  {showSelector === day.dateStr && availableParts.length > 0 && (
                    <div className="exercise-selector">
                      <div className="selector-grid">
                        {availableParts.map((part) => (
                          <button
                            key={part}
                            className="btn btn-selector"
                            onClick={() => handleAddExercise(day.dateStr, part)}
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
                            onClick={() =>
                              handleRemoveExercise(day.dateStr, exercise)
                            }
                            disabled={saving}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-message">No exercises logged.</p>
                  )}

                  <div className="remarks-section">
                    <label>Remarks</label>
                    <textarea
                      value={editingRemarks[day.dateStr] ?? day.workout?.remarks ?? ''}
                      onChange={(e) => handleRemarksChange(day.dateStr, e.target.value)}
                      placeholder="Add notes..."
                      rows={2}
                    />
                    <button
                      className="btn btn-save"
                      onClick={() => handleSaveRemarksClick(day.dateStr)}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Remarks'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Previous7Days;