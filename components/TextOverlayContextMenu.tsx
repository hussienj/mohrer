import React, { useState, useEffect } from 'react';
import { TextOverlay, EditableFieldKey, EDITABLE_FIELD_LABELS } from '../types';
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_FONT_COLOR, DEFAULT_FONT_WEIGHT, FONT_FAMILIES, FONT_SIZES, FONT_COLORS } from '../constants';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';

interface TextOverlayContextMenuProps {
  overlay: TextOverlay;
  x: number; // Page X for positioning
  y: number; // Page Y for positioning
  onClose: () => void;
  onSave: (updatedOverlay: TextOverlay) => void;
  onDelete: (overlayId: string) => void;
}

const TextOverlayContextMenu: React.FC<TextOverlayContextMenuProps> = ({
  overlay,
  x,
  y,
  onClose,
  onSave,
  onDelete,
}) => {
  const [editedOverlay, setEditedOverlay] = useState<TextOverlay>(overlay);

  useEffect(() => {
    setEditedOverlay(overlay); // Sync if the target overlay prop changes
  }, [overlay]);

  const handleChange = (field: keyof TextOverlay, value: any) => {
    setEditedOverlay(prev => ({ ...prev, [field]: value }));
  };
  
  const handleNumericChange = (field: keyof TextOverlay, value: string) => {
    setEditedOverlay(prev => ({ ...prev, [field]: parseInt(value) || 0 }));
  };

  const handleCheckboxChange = (field: keyof TextOverlay, checked: boolean) => {
    setEditedOverlay(prev => {
        const newState = { ...prev, [field]: checked };
        if (field === 'isEditableByUser' && !checked) {
            newState.editKey = undefined; // Clear editKey if not editable
        }
        return newState;
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(editedOverlay);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`هل أنت متأكد من حذف التراكب "${overlay.text}"؟`)) {
      onDelete(overlay.id);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };
  
  const editableFieldKeyOptions = Object.entries(EDITABLE_FIELD_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }));

  return (
    <div
      className="absolute z-50 p-4 bg-slate-900 border border-sky-500 rounded-lg shadow-2xl text-white w-80"
      style={{ top: `${y}px`, left: `${x}px` }}
      onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
    >
      <h4 className="text-lg font-semibold text-cyan-300 mb-3 border-b border-slate-700 pb-2">تعديل النص</h4>
      
      <Input
        label="النص"
        value={editedOverlay.text}
        onChange={(e) => handleChange('text', e.target.value)}
        containerClassName="mb-2"
      />
      {/* Coordinates are not editable here as position is fixed once placed */}
      
      <div className="grid grid-cols-2 gap-x-3">
        <Select
            label="الخط"
            value={editedOverlay.fontFamily}
            onChange={(e) => handleChange('fontFamily', e.target.value)}
            options={FONT_FAMILIES.map(f => ({ value: f, label: f }))}
            containerClassName="mb-2"
        />
        <Input
            label="حجم الخط"
            type="number"
            value={editedOverlay.fontSize}
            onChange={(e) => handleNumericChange('fontSize', e.target.value)}
            containerClassName="mb-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <Select
            label="لون الخط"
            value={editedOverlay.color}
            onChange={(e) => handleChange('color', e.target.value)}
            options={FONT_COLORS}
            containerClassName="mb-2"
        />
        <Select
            label="سماكة الخط"
            value={editedOverlay.fontWeight}
            onChange={(e) => handleChange('fontWeight', e.target.value as 'normal' | 'bold')}
            options={[{ value: 'normal', label: 'عادي' }, { value: 'bold', label: 'عريض' }]}
            containerClassName="mb-2"
        />
      </div>
      
      <div className="flex items-center space-x-2 space-x-reverse mt-1 mb-2">
        <input 
            type="checkbox" 
            id={`isEditableCtx-${overlay.id}`} 
            className="form-checkbox h-4 w-4 text-sky-500 rounded border-slate-600 bg-slate-700 focus:ring-sky-400" 
            checked={editedOverlay.isEditableByUser} 
            onChange={(e) => handleCheckboxChange('isEditableByUser', e.target.checked)} 
        />
        <label htmlFor={`isEditableCtx-${overlay.id}`} className="text-sm text-gray-300">قابل للتعديل بواسطة المستخدم</label>
      </div>

      {editedOverlay.isEditableByUser && (
        <Select
          label="مفتاح الحقل"
          value={editedOverlay.editKey || ''}
          onChange={(e) => handleChange('editKey', e.target.value as EditableFieldKey)}
          options={[{ value: '', label: 'اختر مفتاح' }, ...editableFieldKeyOptions]}
          containerClassName="mb-3"
        />
      )}

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-700">
        <Button onClick={handleSave} variant="success" size="sm">حفظ التغييرات</Button>
        <Button onClick={handleDelete} variant="danger" size="sm">حذف النص</Button>
        <Button onClick={handleClose} variant="secondary" size="sm">إغلاق</Button>
      </div>
    </div>
  );
};

export default TextOverlayContextMenu;