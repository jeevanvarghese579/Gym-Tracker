import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getBodyParts,
  addBodyPart,
  editBodyPart,
  deleteBodyPart
} from '../services/firestore';

function Settings() {
  const { currentUser } = useAuth();
  const [bodyParts, setBodyParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newPartName, setNewPartName] = useState('');
  const [editingPart, setEditingPart] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBodyParts();
  }, [currentUser]);

  const loadBodyParts = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const parts = await getBodyParts(currentUser.uid);
      setBodyParts(parts);
    } catch (err) {
      console.error('Error loading body parts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = async () => {
    if (!currentUser || !newPartName.trim()) return;

    const name = newPartName.trim();
    if (bodyParts.includes(name)) {
      setError('This body part already exists');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await addBodyPart(currentUser.uid, name);
      setBodyParts(updated);
      setNewPartName('');
      setAddingNew(false);
    } catch (err) {
      setError('Failed to add body part');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (oldName) => {
    if (!currentUser || !editName.trim()) return;

    const name = editName.trim();
    if (name === oldName) {
      setEditingPart(null);
      return;
    }

    if (bodyParts.includes(name) && name !== oldName) {
      setError('This body part already exists');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = await editBodyPart(currentUser.uid, oldName, name);
      setBodyParts(updated);
      setEditingPart(null);
      setEditName('');
    } catch (err) {
      setError('Failed to edit body part');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const updated = await deleteBodyPart(currentUser.uid, name);
      setBodyParts(updated);
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete body part');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="page-subtitle">Manage your body parts/exercises</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <section className="body-parts-section">
        <div className="section-header">
          <h2>Body Parts / Exercises</h2>
          <button
            className="btn btn-add"
            onClick={() => setAddingNew(true)}
            disabled={addingNew || saving}
          >
            + Add New
          </button>
        </div>

        {addingNew && (
          <div className="add-form">
            <input
              type="text"
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              placeholder="Enter body part/exercise name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddNew();
                if (e.key === 'Escape') {
                  setAddingNew(false);
                  setNewPartName('');
                }
              }}
            />
            <div className="form-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setAddingNew(false);
                  setNewPartName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddNew}
                disabled={!newPartName.trim() || saving}
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        )}

        <div className="body-parts-list">
          {bodyParts.length === 0 ? (
            <p className="empty-message">No body parts added yet.</p>
          ) : (
            bodyParts.map((part, index) => (
              <div key={`${part}-${index}`} className="body-part-item">
                {editingPart === part ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEdit(part);
                        if (e.key === 'Escape') {
                          setEditingPart(null);
                          setEditName('');
                        }
                      }}
                    />
                    <div className="item-buttons">
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => {
                          setEditingPart(null);
                          setEditName('');
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={() => handleEdit(part)}
                        disabled={!editName.trim() || saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="body-part-name">{part}</span>
                    <div className="item-buttons">
                      <button
                        className="btn btn-small btn-edit"
                        onClick={() => {
                          setEditingPart(part);
                          setEditName(part);
                        }}
                        disabled={saving}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-small btn-delete"
                        onClick={() => setDeleteConfirm(part)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}

                {deleteConfirm === part && (
                  <div className="modal-overlay">
                    <div className="modal confirm-modal">
                      <h3>Delete Body Part?</h3>
                      <p>
                        Are you sure you want to delete{' '}
                        <strong>{part}</strong>?
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
                          onClick={() => handleDelete(part)}
                          disabled={saving}
                        >
                          {saving ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <h2>About</h2>
        <div className="about-content">
          <p>
            Gym Tracker v 1.5 <p/> Developed by Jeevan Varghese. <p/>Visit{' '}
            <a
              href="https://itsjeevanvarghese.web.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              itsjeevanvarghese.web.app
            </a>{' '}
            for more softwares.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Settings;
