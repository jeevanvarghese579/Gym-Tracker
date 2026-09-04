import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBodyParts,
  getWorkoutsForMonth,
  getWorkoutByDate,
  saveWorkout,
  formatDateForStorage
} from '../services/firestore';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isToday,
  startOfMonth,
  subMonths
} from 'date-fns';

// Create today's date once at module level to avoid recreation on every render
const TODAY = new Date();

function Dashboard() {
  const { currentUser } = useAuth();
  const [bodyParts, setBodyParts] = useState([]);
  const [monthWorkouts, setMonthWorkouts] = useState([]);
  const [todayWorkout, setTodayWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [editWorkout, setEditWorkout] = useState(null);
  const [editRemarks, setEditRemarks] = useState('');
  const [showEditSelector, setShowEditSelector] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(TODAY));

  // Use module-level constants
  const today = TODAY;
  const todayStr = formatDateForStorage(today);

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const [parts, workouts, todaysWorkout] = await Promise.all([
        getBodyParts(currentUser.uid),
        getWorkoutsForMonth(
          currentUser.uid,
          selectedMonth.getFullYear(),
          selectedMonth.getMonth()
        ),
        getWorkoutByDate(currentUser.uid, todayStr)
      ]);

      setBodyParts(parts);
      setMonthWorkouts(workouts);
      setTodayWorkout(todaysWorkout);
      setRemarks(todaysWorkout?.remarks || '');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, selectedMonth, todayStr]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh data when window gains focus or becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loadDashboardData]);

  const getWorkoutDates = () => {
    const dates = new Set();
    monthWorkouts.forEach((w) => {
      if (w.selectedBodyParts && w.selectedBodyParts.length > 0) {
        dates.add(w.date);
      }
    });
    return dates;
  };

  const getActivityDays = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start, end });
    const workoutDates = getWorkoutDates();

    return days.map((day) => {
      const dateStr = formatDateForStorage(day);
      const hasWorkout = workoutDates.has(dateStr);
      return {
        date: day,
        dateStr,
        hasWorkout,
        isToday: isToday(day),
        dayOfWeek: getDay(day)
      };
    });
  };

  const handleAddExercise = async (bodyPart) => {
    const currentParts = todayWorkout?.selectedBodyParts || [];
    if (currentParts.includes(bodyPart)) return;

    const newParts = [...currentParts, bodyPart];
    await saveTodayWorkout(newParts, remarks);
  };

  const handleRemoveExercise = async (bodyPart) => {
    const currentParts = todayWorkout?.selectedBodyParts || [];
    const newParts = currentParts.filter((p) => p !== bodyPart);

    if (newParts.length === 0) {
      setShowSelector(false);
    }

    await saveTodayWorkout(newParts, remarks);
  };

  const handleSaveRemarks = async () => {
    const currentParts = todayWorkout?.selectedBodyParts || [];
    await saveTodayWorkout(currentParts, remarks);
  };

  const saveTodayWorkout = async (selectedParts, currentRemarks) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const saved = await saveWorkout(currentUser.uid, todayStr, selectedParts, currentRemarks);
      setTodayWorkout(saved);
      // Update month workouts cache
      const monthWorkoutsUpdated = await getWorkoutsForMonth(
        currentUser.uid,
        selectedMonth.getFullYear(),
        selectedMonth.getMonth()
      );
      setMonthWorkouts(monthWorkoutsUpdated);
    } catch (error) {
      console.error('Error saving workout:', error);
    } finally {
      setSaving(false);
    }
  };

  // Calendar day click handlers
  const handleDayClick = async (day) => {
    if (!currentUser) return;

    const workout = await getWorkoutByDate(currentUser.uid, day.dateStr);
    setEditingDay(day);
    setEditWorkout(workout);
    setEditRemarks(workout?.remarks || '');
    setShowEditSelector(false);
  };

  const handleCloseEditModal = () => {
    setEditingDay(null);
    setEditWorkout(null);
    setEditRemarks('');
    setShowEditSelector(false);
    // Refresh data
    loadDashboardData();
  };

  const handleAddExerciseToEditDay = async (bodyPart) => {
    if (!currentUser || !editingDay) return;

    const currentParts = editWorkout?.selectedBodyParts || [];
    if (currentParts.includes(bodyPart)) return;

    const newParts = [...currentParts, bodyPart];
    await saveEditDayWorkout(newParts, editRemarks);
  };

  const handleRemoveExerciseFromEditDay = async (bodyPart) => {
    if (!currentUser || !editingDay) return;

    const currentParts = editWorkout?.selectedBodyParts || [];
    const newParts = currentParts.filter((p) => p !== bodyPart);
    await saveEditDayWorkout(newParts, editRemarks);
  };

  const handleSaveEditRemarks = async () => {
    if (!currentUser || !editingDay) return;

    const currentParts = editWorkout?.selectedBodyParts || [];
    await saveEditDayWorkout(currentParts, editRemarks);
  };

  const saveEditDayWorkout = async (selectedParts, currentRemarks) => {
    if (!currentUser || !editingDay) return;

    setSaving(true);
    try {
      const saved = await saveWorkout(currentUser.uid, editingDay.dateStr, selectedParts, currentRemarks);
      setEditWorkout(saved);

      // Update today's workout if editing today
      if (editingDay.dateStr === todayStr) {
        setTodayWorkout(saved);
        setRemarks(currentRemarks);
      }
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
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const activityDays = getActivityDays();
  const todayExercises = todayWorkout?.selectedBodyParts || [];
  const availableParts = bodyParts.filter((bp) => !todayExercises.includes(bp));

  const editExercises = editWorkout?.selectedBodyParts || [];
  const availableEditParts = bodyParts.filter((bp) => !editExercises.includes(bp));

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="month-navigation" aria-label="Dashboard month navigation">
          <button
            type="button"
            className="month-nav-button"
            onClick={() => setSelectedMonth((month) => subMonths(month, 1))}
            aria-label="Show previous month"
            title="Previous month"
          >
            &#8249;
          </button>
          <p className="page-subtitle" aria-live="polite">
            {format(selectedMonth, 'MMMM yyyy')}
          </p>
          <button
            type="button"
            className="month-nav-button"
            onClick={() => setSelectedMonth((month) => addMonths(month, 1))}
            aria-label="Show next month"
            title="Next month"
          >
            &#8250;
          </button>
        </div>
      </div>

      {/* Monthly Activity Grid */}
      <section className="activity-section">
        <h2>{format(selectedMonth, 'MMMM')} Activity</h2>
        <div className="activity-grid">
          {activityDays.map((day) => (
            <button
              key={day.dateStr}
              className={`activity-day ${day.hasWorkout ? 'active' : ''} ${
                day.isToday ? 'today' : ''
              }`}
              title={`${format(day.date, 'dd MMM yyyy')}${day.hasWorkout ? ' - Click to edit' : ' - Click to add'}`}
              onClick={() => handleDayClick(day)}
            />
          ))}
        </div>
        <p className="activity-legend">
          <span className="legend-item">
            <span className="legend-box active"></span> Workout completed
          </span>
          <span className="legend-item">
            <span className="legend-box"></span> No workout
          </span>
        </p>
        <p className="activity-hint">Click on any day to add or edit exercises</p>
      </section>

      {/* Today's Exercise */}
      <section className="today-section">
        <div className="section-header">
          <h2>Today’s Exercise</h2>
          <button
            className="btn btn-add"
            onClick={() => setShowSelector(!showSelector)}
            disabled={saving || bodyParts.length === 0}
          >
            + Add
          </button>
        </div>

        {showSelector && availableParts.length > 0 && (
          <div className="exercise-selector">
            <p>Select exercises to add:</p>
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

        {todayExercises.length > 0 ? (
          <div className="exercise-list">
            {todayExercises.map((exercise) => (
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
          <p className="empty-message">No exercises logged for today.</p>
        )}

        {/* Remarks */}
        <div className="remarks-section">
          <label htmlFor="remarks">Remarks</label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add notes about today's workout..."
            rows={3}
          />
          <button
            className="btn btn-save"
            onClick={handleSaveRemarks}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Remarks'}
          </button>
        </div>
      </section>

      {/* Edit Day Modal */}
      {editingDay && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal day-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{format(editingDay.date, 'EEEE, dd MMM yyyy')}</h3>
              <button className="modal-close" onClick={handleCloseEditModal}>
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="modal-actions">
                <button
                  className="btn btn-add-small"
                  onClick={() => setShowEditSelector(!showEditSelector)}
                  disabled={saving || bodyParts.length === 0}
                >
                  + Add Exercise
                </button>
              </div>

              {showEditSelector && availableEditParts.length > 0 && (
                <div className="exercise-selector">
                  <div className="selector-grid">
                    {availableEditParts.map((part) => (
                      <button
                        key={part}
                        className="btn btn-selector"
                        onClick={() => handleAddExerciseToEditDay(part)}
                      >
                        {part}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {editExercises.length > 0 ? (
                <div className="exercise-list">
                  {editExercises.map((exercise) => (
                    <div key={exercise} className="exercise-tag">
                      <span>{exercise}</span>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveExerciseFromEditDay(exercise)}
                        disabled={saving}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No exercises logged for this day.</p>
              )}

              <div className="remarks-section">
                <label>Remarks</label>
                <textarea
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Add notes..."
                  rows={2}
                />
                <button
                  className="btn btn-save"
                  onClick={handleSaveEditRemarks}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Remarks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
