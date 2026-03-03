import { useState } from 'react';

interface Props {
  title: string;
  items: string[];
  onRename: (oldName: string, newName: string) => void;
  onRemove: (name: string) => void;
  onAdd: (name: string) => void;
}

export default function ListEditor({ title, items, onRename, onRemove, onAdd }: Props) {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newItem, setNewItem] = useState('');

  const startEdit = (item: string) => {
    setEditingItem(item);
    setEditValue(item);
  };

  const saveEdit = () => {
    if (editingItem && editValue.trim() && editValue.trim() !== editingItem) {
      onRename(editingItem, editValue.trim());
    }
    setEditingItem(null);
    setEditValue('');
  };

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  return (
    <div className="list-editor">
      <h4>{title}</h4>
      <ul className="list-editor-items">
        {items.map((item) => (
          <li key={item} className="list-editor-item">
            {editingItem === item ? (
              <div className="list-editor-edit-row">
                <input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingItem(null); }}
                  autoFocus
                />
                <button className="btn-icon" onClick={saveEdit} title="Save">&#10003;</button>
                <button className="btn-icon" onClick={() => setEditingItem(null)} title="Cancel">&#10005;</button>
              </div>
            ) : (
              <div className="list-editor-display-row">
                <span>{item}</span>
                <div>
                  <button className="btn-icon" onClick={() => startEdit(item)} title="Rename">&#9998;</button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => { if (confirm(`Remove "${item}"?`)) onRemove(item); }}
                    title="Remove"
                  >&#10005;</button>
                </div>
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="text-muted">No items</li>}
      </ul>
      <div className="list-editor-add">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={`Add new ${title.toLowerCase().replace(/s$/, '')}...`}
        />
        <button className="btn-primary" onClick={handleAdd} disabled={!newItem.trim()}>Add</button>
      </div>
    </div>
  );
}
