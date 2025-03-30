import React from 'react';

const DeleteConfirmationModal = ({ session, onConfirm, onCancel }) => {
  if (!session) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Delete Confirmation</h3>
        <p>Are you sure you want to delete the chat "{session.title}"?</p>
        <p className="modal-warning">This action cannot be undone.</p>
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="delete-btn" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal; 