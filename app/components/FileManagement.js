import { useState } from 'react';
import styles from './FileManagement.module.css';

const FileManagement = ({ 
  onRefresh,
  currentDirectory 
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setSelectedItem(item);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
    setSelectedItem(null);
  };

  const handleNewFolder = async () => {
    if (!newName.trim()) return;
    
    setIsCreating(true);
    try {
      if (currentDirectory && 'getDirectoryHandle' in currentDirectory) {
        await currentDirectory.getDirectoryHandle(newName, { create: true });
        setNewName('');
        setShowNewFolderDialog(false);
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || !selectedItem) return;
    
    setIsCreating(true);
    try {
      // Note: File System Access API doesn't directly support rename
      // This would need to be implemented with copy + delete
      alert('Rename functionality requires additional implementation');
      setNewName('');
      setShowRenameDialog(false);
      closeContextMenu();
    } catch (error) {
      console.error('Error renaming:', error);
      alert('Failed to rename: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      setIsCreating(true);
      if (currentDirectory && selectedItem.handle) {
        await currentDirectory.removeEntry(selectedItem.name, { recursive: selectedItem.type === 'folder' });
        if (onRefresh) onRefresh();
      }
      setShowDeleteDialog(false);
      closeContextMenu();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Toolbar Actions */}
      <div className={styles.fileActions}>
        <button 
          className={styles.actionBtn}
          onClick={() => setShowNewFolderDialog(true)}
          disabled={!currentDirectory}
          title="New Folder"
        >
          [📁+] NEW FOLDER
        </button>
        <button 
          className={styles.actionBtn}
          onClick={onRefresh}
          disabled={!currentDirectory}
          title="Refresh"
        >
          [↻] REFRESH
        </button>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div className={styles.contextMenuOverlay} onClick={closeContextMenu} />
          <div 
            className={styles.contextMenu}
            style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          >
            <div 
              className={styles.contextMenuItem}
              onClick={() => {
                setShowRenameDialog(true);
                setNewName(selectedItem?.name || '');
              }}
            >
              Rename
            </div>
            <div 
              className={styles.contextMenuItem}
              onClick={handleDelete}
            >
              Delete
            </div>
            <div 
              className={styles.contextMenuItem}
              onClick={closeContextMenu}
            >
              Cancel
            </div>
          </div>
        </>
      )}

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <span>$ MKDIR - CREATE NEW FOLDER</span>
              <button onClick={() => setShowNewFolderDialog(false)}>×</button>
            </div>
            <div className={styles.dialogContent}>
              <label>$ Enter folder name:</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNewFolder()}
                className={styles.dialogInput}
                placeholder="new_folder"
                autoFocus
                disabled={isCreating}
              />
            </div>
            <div className={styles.dialogActions}>
              <button 
                onClick={handleNewFolder}
                className={styles.dialogBtn}
                disabled={!newName.trim() || isCreating}
              >
                {isCreating ? '[CREATING...]' : '[CREATE]'}
              </button>
              <button 
                onClick={() => setShowNewFolderDialog(false)}
                className={styles.dialogBtn}
                disabled={isCreating}
              >
                [CANCEL]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <span>$ MV - RENAME {selectedItem?.type.toUpperCase()}</span>
              <button onClick={() => setShowRenameDialog(false)}>×</button>
            </div>
            <div className={styles.dialogContent}>
              <label>$ Enter new name for: {selectedItem?.name}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                className={styles.dialogInput}
                placeholder={selectedItem?.name}
                autoFocus
                disabled={isCreating}
              />
            </div>
            <div className={styles.dialogActions}>
              <button 
                onClick={handleRename}
                className={styles.dialogBtn}
                disabled={!newName.trim() || isCreating}
              >
                {isCreating ? '[RENAMING...]' : '[RENAME]'}
              </button>
              <button 
                onClick={() => setShowRenameDialog(false)}
                className={styles.dialogBtn}
                disabled={isCreating}
              >
                [CANCEL]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <span>$ RM - DELETE {selectedItem?.type.toUpperCase()}</span>
              <button onClick={() => setShowDeleteDialog(false)}>×</button>
            </div>
            <div className={styles.dialogContent}>
              <label style={{ color: '#ff6600', marginBottom: '15px' }}>
                ⚠️ WARNING: This action cannot be undone!
              </label>
              <label>
                Delete &quot;{selectedItem?.name}&quot;?
              </label>
              {selectedItem?.type === 'folder' && (
                <label style={{ color: '#ff6600', marginTop: '10px' }}>
                  This will delete the folder and all its contents.
                </label>
              )}
            </div>
            <div className={styles.dialogActions}>
              <button 
                onClick={confirmDelete}
                className={styles.dialogBtn}
                disabled={isCreating}
                style={{ 
                  borderColor: '#aa0000', 
                  color: '#ff6666',
                  background: '#110000'
                }}
              >
                {isCreating ? '[DELETING...]' : '[DELETE]'}
              </button>
              <button 
                onClick={() => setShowDeleteDialog(false)}
                className={styles.dialogBtn}
                disabled={isCreating}
              >
                [CANCEL]
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileManagement;
