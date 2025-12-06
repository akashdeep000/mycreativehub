import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil, X, Plus } from 'lucide-react';
import { ColorKey } from './calendar-types';

const COLOR_OPTIONS = [
  '#FF6B9D', '#FF8E3C', '#FFD93D', '#6BCF7F', '#4ECDC4', 
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB6C1',
  '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#AED6F1', '#A9DFBF'
];

interface ColorKeyManagerProps {
  colorKeys: ColorKey[];
  selectedKeyId: string | null;
  onSelect: (keyId: string | null) => void;
  onUpdate: (keyId: string, updates: Partial<ColorKey>) => void;
  onDelete: (keyId: string) => void;
  onAdd: (label: string, color: string) => void;
  saveStatus?: 'idle' | 'saving' | 'saved';
}

export default function ColorKeyManager({
  colorKeys,
  selectedKeyId,
  onSelect,
  onUpdate,
  onDelete,
  onAdd,
  saveStatus = 'idle'
}: ColorKeyManagerProps) {
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingKeyValue, setEditingKeyValue] = useState('');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [isCreatingNewTag, setIsCreatingNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#FF6B9D');

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showColorPicker && !(event.target as Element).closest('.color-picker-container')) {
        setShowColorPicker(null);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  const startEditingKey = (keyId: string, currentLabel: string) => {
    setEditingKeyId(keyId);
    setEditingKeyValue(currentLabel);
  };

  const saveKeyEdit = () => {
    if (editingKeyId && editingKeyValue.trim()) {
      onUpdate(editingKeyId, { label: editingKeyValue.trim() });
    }
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const cancelKeyEdit = () => {
    setEditingKeyId(null);
    setEditingKeyValue('');
  };

  const addNewCustomTag = () => {
    if (newTagName.trim()) {
      onAdd(newTagName.trim(), newTagColor);
      setIsCreatingNewTag(false);
      setNewTagName('');
      setNewTagColor('#FF6B9D');
    }
  };

  const cancelNewTag = () => {
    setIsCreatingNewTag(false);
    setNewTagName('');
    setNewTagColor('#FF6B9D');
  };

  const updateColorKeyColor = (keyId: string, newColor: string) => {
    onUpdate(keyId, { color: newColor });
    setShowColorPicker(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md border-0 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Colour Key</h3>
        {saveStatus === 'saving' && (
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
      </div>
      <p className="text-gray-600 text-sm mb-4">
        Select a colour category, then click a calendar block to apply it.
      </p>
      <div className="flex flex-wrap gap-3 items-center">
        {/* Color keys */}
        {colorKeys.map((colorKey) => {
          const isOptimistic = colorKey.id.startsWith('temp-');
          return (
          <div
            key={colorKey.id}
            className={`group relative flex items-center gap-2 rounded-lg p-2 transition-all cursor-pointer ${
              selectedKeyId === colorKey.id 
                ? 'bg-blue-50 border-2 border-blue-500 shadow-md ring-2 ring-blue-200' 
                : 'bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
            } ${isOptimistic ? 'opacity-70 cursor-wait' : ''}`}
            onClick={() => !isOptimistic && editingKeyId !== colorKey.id && onSelect(selectedKeyId === colorKey.id ? null : colorKey.id)}
          >
            {selectedKeyId === colorKey.id && (
              <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                Selected
              </div>
            )}
            <div className="relative">
              <div
                className={`w-4 h-4 rounded-full border transition-all cursor-pointer hover:ring-2 hover:ring-gray-300 ${
                  selectedKeyId === colorKey.id ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-300'
                }`}
                style={{ backgroundColor: colorKey.color }}
                title={isOptimistic ? "Saving..." : "Click to change color"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOptimistic) setShowColorPicker(showColorPicker === colorKey.id ? null : colorKey.id);
                }}
              />
              {/* Color Picker */}
              {showColorPicker === colorKey.id && (
                <div className="color-picker-container absolute top-6 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]">
                  <div className="grid grid-cols-4 gap-3">
                    {COLOR_OPTIONS.map((color) => (
                      <div
                        key={color}
                        className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                        style={{ backgroundColor: color }}
                        onClick={() => updateColorKeyColor(colorKey.id, color)}
                        title={`Change to ${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {editingKeyId === colorKey.id ? (
              <Input
                value={editingKeyValue}
                onChange={(e) => setEditingKeyValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveKeyEdit();
                  if (e.key === 'Escape') cancelKeyEdit();
                }}
                onBlur={saveKeyEdit}
                className="text-sm font-medium h-7 w-24"
                autoFocus
              />
            ) : (
              <>
                <span className="text-sm font-medium">{colorKey.label}</span>
                {!isOptimistic && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingKey(colorKey.id, colorKey.label);
                      }}
                      className="ml-2 hover:bg-gray-200 rounded p-1"
                      title="Edit tag name"
                    >
                      <Pencil className="w-3 h-3 text-gray-500 hover:text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(colorKey.id);
                      }}
                      className="ml-1 hover:bg-red-100 rounded p-1"
                      title="Delete tag"
                    >
                      <X className="w-3 h-3 text-gray-500 hover:text-red-600" />
                    </button>
                  </>
                )}
                {isOptimistic && (
                  <div className="ml-2">
                    <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>
          );
        })}
        
        {/* Add new tag */}
        {isCreatingNewTag ? (
          <div className="relative">
            <div className="flex items-center gap-2 rounded-lg p-2 bg-green-50 border-2 border-green-500 shadow-md">
              <div className="relative">
                <div
                  className="w-4 h-4 rounded-full border border-green-400 cursor-pointer hover:ring-2 hover:ring-green-300"
                  style={{ backgroundColor: newTagColor }}
                  onClick={() => setShowColorPicker(showColorPicker === 'newTag' ? null : 'newTag')}
                  title="Click to change color"
                />
                {showColorPicker === 'newTag' && (
                  <div className="color-picker-container absolute top-6 left-0 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[200px]">
                    <div className="grid grid-cols-4 gap-3">
                      {COLOR_OPTIONS.map((color: string) => (
                        <div
                          key={color}
                          className="w-7 h-7 rounded-full border border-gray-300 cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setNewTagColor(color);
                            setShowColorPicker(null);
                          }}
                          title={`Change to ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addNewCustomTag();
                  if (e.key === 'Escape') cancelNewTag();
                }}
                onBlur={() => {
                  setTimeout(() => addNewCustomTag(), 50);
                }}
                placeholder="Tag name"
                className="text-sm font-medium h-7 w-24"
                autoFocus
              />
              <button
                onClick={addNewCustomTag}
                className="text-green-600 hover:text-green-800"
                title="Save new tag"
              >
                ✓
              </button>
              <button
                onClick={cancelNewTag}
                className="text-gray-400 hover:text-gray-600"
                title="Cancel"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingNewTag(true)}
            className="flex items-center gap-1 rounded-lg p-2 bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all text-gray-600 hover:text-gray-800"
            title="Add new custom tag"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Tag</span>
          </button>
        )}
      </div>
    </div>
  );
}
