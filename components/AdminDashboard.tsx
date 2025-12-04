import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ImageConfig, TextOverlay, TemplateCategory, TEMPLATE_CATEGORY_LABELS, EditableFieldKey, EDITABLE_FIELD_LABELS, LogoOverlay } from '../types';
import { DEFAULT_FONT_FAMILY, DEFAULT_FONT_SIZE, DEFAULT_FONT_COLOR, DEFAULT_FONT_WEIGHT, FONT_FAMILIES, FONT_SIZES, FONT_COLORS, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT } from '../constants';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import ImageCanvas from './ImageCanvas';
import TextOverlayContextMenu from './TextOverlayContextMenu';

interface ContextMenuConfig {
  visible: boolean;
  x: number;
  y: number;
  targetOverlay: TextOverlay | null;
}

const OVERLAY_MOVE_INCREMENT = 2; // Pixels for keyboard movement

const AdminDashboard: React.FC = () => {
  const { imageTemplates, addImageTemplate, updateImageTemplate, deleteImageTemplate, logoutUser } = useAppContext();

  const [currentTemplate, setCurrentTemplate] = useState<Partial<ImageConfig>>({});
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [logoOverlay, setLogoOverlay] = useState<LogoOverlay | null>(null);
  const [currentOverlayData, setCurrentOverlayData] = useState<Partial<TextOverlay>>({});
  
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [canvasDimensions, setCanvasDimensions] = useState<{width: number, height: number}>({width: 600, height: 400});
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const [contextMenu, setContextMenu] = useState<ContextMenuConfig>({
    visible: false,
    x: 0,
    y: 0,
    targetOverlay: null,
  });
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);


  useEffect(() => {
    if (currentTemplate.imageUrl) {
      setPreviewImageUrl(currentTemplate.imageUrl);
      setImageLoadError(null);
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > MAX_CANVAS_WIDTH) {
          const ratio = MAX_CANVAS_WIDTH / w;
          w = MAX_CANVAS_WIDTH;
          h *= ratio;
        }
        if (h > MAX_CANVAS_HEIGHT) {
          const ratio = MAX_CANVAS_HEIGHT / h;
          h = MAX_CANVAS_HEIGHT;
          w *= ratio;
        }
        setCanvasDimensions({ width: Math.round(w), height: Math.round(h) });
      };
      img.onerror = () => {
        console.warn("Failed to load image for dimension calculation (admin preview setup):", currentTemplate.imageUrl);
        setCanvasDimensions({ width: 600, height: 400 });
      };
      img.src = currentTemplate.imageUrl;
    } else {
      setPreviewImageUrl('');
      setImageLoadError(null);
      setCanvasDimensions({ width: 600, height: 400 });
    }
  }, [currentTemplate.imageUrl]);

  const handleCanvasLeftClick = (x: number, y: number, targetOverlay: TextOverlay | null) => {
    // If an overlay was clicked, do nothing. Admin uses right-click to interact.
    if (targetOverlay) {
      if(contextMenu.visible) handleCloseContextMenu();
      return;
    }

    if (!isDraggingOverlay && (!contextMenu.visible || !contextMenu.targetOverlay)) {
        setCurrentOverlayData(prev => ({ ...prev, x, y }));
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
        alert(`تم تحديد الإحداثيات (X: ${Math.round(x)}, Y: ${Math.round(y)}). أدخل النص والخصائص ثم اضغط "إضافة تراكب".`);
    }
    if (contextMenu.visible) {
        handleCloseContextMenu();
    }
  };

  const handleCanvasContextMenu = (
    _eventX: number, _eventY: number, 
    pageX: number, pageY: number, 
    targetOverlay: TextOverlay | null
  ) => {
    if (targetOverlay) {
      setContextMenu({
        visible: true,
        x: pageX,
        y: pageY,
        targetOverlay: targetOverlay,
      });
    } else {
      handleCloseContextMenu();
    }
  };
  
  const handleCloseContextMenu = useCallback(() => {
    if (isDraggingOverlay) return; 
    setContextMenu({ visible: false, x:0, y:0, targetOverlay: null });
  }, [isDraggingOverlay]);

  const updateOverlayInList = useCallback((updatedOverlay: TextOverlay) => {
    setOverlays(prevOverlays =>
      prevOverlays.map(o => (o.id === updatedOverlay.id ? updatedOverlay : o))
    );
     if (contextMenu.targetOverlay && contextMenu.targetOverlay.id === updatedOverlay.id) {
      setContextMenu(prevMenu => ({
        ...prevMenu,
        targetOverlay: updatedOverlay, 
      }));
    }
  }, [contextMenu.targetOverlay]);


  const handleUpdateOverlayFromContextMenu = (updatedOverlay: TextOverlay) => {
    updateOverlayInList(updatedOverlay);
    handleCloseContextMenu(); 
  };

  const handleDeleteOverlayFromContextMenu = (overlayId: string) => {
    setOverlays(overlays.filter(o => o.id !== overlayId));
    handleCloseContextMenu();
  };


  const handleAddNewOverlayFromPanel = () => {
    if (!currentOverlayData.text || currentOverlayData.x == null || currentOverlayData.y == null) {
      alert("يرجى النقر على الصورة لتحديد الموضع، ثم ملء النص للتراكب.");
      return;
    }

    const newOverlay: TextOverlay = {
      id: `overlay-${Date.now()}`,
      text: currentOverlayData.text || '',
      x: Number(currentOverlayData.x),
      y: Number(currentOverlayData.y),
      fontFamily: currentOverlayData.fontFamily || DEFAULT_FONT_FAMILY,
      fontSize: Number(currentOverlayData.fontSize) || DEFAULT_FONT_SIZE,
      color: currentOverlayData.color || DEFAULT_FONT_COLOR,
      fontWeight: currentOverlayData.fontWeight || DEFAULT_FONT_WEIGHT,
      isEditableByUser: currentOverlayData.isEditableByUser || false,
      editKey: currentOverlayData.isEditableByUser ? currentOverlayData.editKey : undefined,
    };

    setOverlays([...overlays, newOverlay]);
    setCurrentOverlayData({ 
        fontFamily: currentOverlayData.fontFamily, 
        fontSize: currentOverlayData.fontSize,
        color: currentOverlayData.color,
        fontWeight: currentOverlayData.fontWeight,
        isEditableByUser: currentOverlayData.isEditableByUser,
        editKey: currentOverlayData.editKey,
    }); 
  };

  const handleDeleteOverlayFromList = (overlayId: string) => {
    setOverlays(overlays.filter(o => o.id !== overlayId));
  };

  const handleSaveTemplate = () => {
    if (!currentTemplate.name || !currentTemplate.category || !currentTemplate.imageUrl) {
      alert("يرجى إدخال اسم القالب، الفئة، ورابط الصورة.");
      return;
    }
    if (imageLoadError) {
        if(!window.confirm("تحذير: فشل تحميل صورة المعاينة. هل ترغب في حفظ القالب بالرغم من ذلك؟")) {
            return;
        }
    }

    const templateDataForFirebase: Omit<ImageConfig, 'id'> = {
      name: currentTemplate.name,
      category: currentTemplate.category,
      imageUrl: currentTemplate.imageUrl,
      overlays: overlays,
      logoOverlay: logoOverlay,
      canvasWidth: canvasDimensions.width,
      canvasHeight: canvasDimensions.height,
    };

    if (currentTemplate.id) {
      updateImageTemplate({ ...templateDataForFirebase, id: currentTemplate.id });
    } else {
      addImageTemplate(templateDataForFirebase);
    }
    
    setCurrentTemplate({});
    setOverlays([]);
    setLogoOverlay(null);
    setPreviewImageUrl('');
    setImageLoadError(null);
    setCurrentOverlayData({});
  };
  
  const handleLoadTemplateForEditing = (template: ImageConfig) => {
    setCurrentTemplate(template); 
    setOverlays(template.overlays);
    setLogoOverlay(template.logoOverlay || null);
    setImageLoadError(null); 
    setCurrentOverlayData({});
    handleCloseContextMenu();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!contextMenu.visible || !contextMenu.targetOverlay || isDraggingOverlay) {
        return;
      }

      let moved = false;
      let newX = contextMenu.targetOverlay.x;
      let newY = contextMenu.targetOverlay.y;

      switch (event.key) {
        case 'ArrowUp':
          newY -= OVERLAY_MOVE_INCREMENT;
          moved = true;
          break;
        case 'ArrowDown':
          newY += OVERLAY_MOVE_INCREMENT;
          moved = true;
          break;
        case 'ArrowLeft':
          newX -= OVERLAY_MOVE_INCREMENT;
          moved = true;
          break;
        case 'ArrowRight':
          newX += OVERLAY_MOVE_INCREMENT;
          moved = true;
          break;
      }

      if (moved) {
        event.preventDefault();
        const updatedOverlay = { ...contextMenu.targetOverlay, x: newX, y: newY };
        updateOverlayInList(updatedOverlay);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu.visible, contextMenu.targetOverlay, isDraggingOverlay, updateOverlayInList]);

  const handleOverlayDragStart = useCallback((_overlayId: string) => {
    setIsDraggingOverlay(true);
  }, []);

  const handleOverlayPositionUpdate = useCallback((overlayId: string, newX: number, newY: number) => {
    if (!isDraggingOverlay || !contextMenu.targetOverlay || contextMenu.targetOverlay.id !== overlayId) return;

    const target = overlays.find(o => o.id === overlayId); 
    if (target) {
        const updatedOverlay = { ...target, x: newX, y: newY };
        updateOverlayInList(updatedOverlay);
    }
  }, [isDraggingOverlay, overlays, updateOverlayInList, contextMenu.targetOverlay]);

  const handleOverlayDragEnd = useCallback((_overlayId: string) => {
    setIsDraggingOverlay(false);
  }, []);
  
  const handleLogoPositionUpdate = useCallback((newX: number, newY: number) => {
    setLogoOverlay(prev => prev ? {...prev, x: newX, y: newY} : null);
  }, []);

  const categoryOptions = Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }));

  const editableFieldKeyOptions = Object.entries(EDITABLE_FIELD_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }));
  
  const handleLocalLogout = () => {
    logoutUser(); 
  };

  const dashboardClickHandler = () => {
    if (contextMenu.visible && !isDraggingOverlay) {
    }
  };


  return (
    <div 
        className="p-4 sm:p-6 bg-slate-800 rounded-xl shadow-2xl" 
        onClick={dashboardClickHandler}
    >
      <h2 className="text-2xl sm:text-3xl font-bold text-sky-400 mb-6 text-center">لوحة تحكم المسؤول</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 space-y-4 p-4 bg-slate-700 rounded-lg">
          <h3 className="text-xl font-semibold text-cyan-300 border-b border-slate-600 pb-2">إعداد القالب</h3>
          <Input label="اسم القالب" value={currentTemplate.name || ''} onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})} />
          <Input 
            label="رابط الصورة" 
            placeholder="https://example.com/image.jpg" 
            value={currentTemplate.imageUrl || ''} 
            onChange={e => setCurrentTemplate({...currentTemplate, imageUrl: e.target.value})} 
          />
          <Select label="الفئة" value={currentTemplate.category || ''} onChange={e => setCurrentTemplate({...currentTemplate, category: e.target.value as TemplateCategory})} options={[{value: '', label: 'اختر فئة'}, ...categoryOptions]} />
          
          <div className="pt-4 border-t border-slate-600">
            <h4 className="text-lg font-semibold text-cyan-400">إعداد الشعار (اختياري)</h4>
            <Input
              label="رابط صورة الشعار"
              placeholder="https://example.com/logo.png"
              value={logoOverlay?.imageUrl || ''}
              onChange={e => {
                const imageUrl = e.target.value;
                if (!logoOverlay) {
                  setLogoOverlay({
                    id: 'logo-main',
                    imageUrl,
                    x: 100,
                    y: 100,
                    radius: 75, // approx 2cm
                    isEditableByUser: true,
                    editKey: EditableFieldKey.LOGO_URL,
                  });
                } else {
                  setLogoOverlay({ ...logoOverlay, imageUrl });
                }
              }}
            />
            <Input
              type="number"
              label="نصف قطر الشعار (بكسل)"
              value={logoOverlay?.radius || ''}
              onChange={e => {
                if(logoOverlay) setLogoOverlay({...logoOverlay, radius: parseInt(e.target.value) || 75})
              }}
              disabled={!logoOverlay}
              containerClassName="mb-2"
            />
            {logoOverlay && <Button onClick={() => setLogoOverlay(null)} variant="danger" size="sm">حذف الشعار</Button>}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4 p-4 bg-slate-700 rounded-lg">
          <h3 className="text-xl font-semibold text-cyan-300 border-b border-slate-600 pb-2">إضافة تراكب نصي جديد</h3>
          <p className="text-sm text-slate-400 -mt-2 mb-2">انقر على الصورة في قسم المعاينة لتحديد موضع النص.</p>
          <Input 
            label="النص" 
            value={currentOverlayData.text || ''} 
            onChange={e => setCurrentOverlayData({...currentOverlayData, text: e.target.value})} 
            ref={textInputRef}
            placeholder={currentOverlayData.x !== undefined ? "أدخل النص هنا" : "انقر على الصورة أولاً"}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="الخط" value={currentOverlayData.fontFamily || DEFAULT_FONT_FAMILY} onChange={e => setCurrentOverlayData({...currentOverlayData, fontFamily: e.target.value})} options={FONT_FAMILIES.map(f => ({value: f, label: f}))} />
            <Input type="number" label="حجم الخط" value={currentOverlayData.fontSize || DEFAULT_FONT_SIZE} onChange={e => setCurrentOverlayData({...currentOverlayData, fontSize: parseInt(e.target.value)})} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Select label="لون الخط" value={currentOverlayData.color || DEFAULT_FONT_COLOR} onChange={e => setCurrentOverlayData({...currentOverlayData, color: e.target.value})} options={FONT_COLORS} />
            <Select label="سماكة الخط" value={currentOverlayData.fontWeight || DEFAULT_FONT_WEIGHT} onChange={e => setCurrentOverlayData({...currentOverlayData, fontWeight: e.target.value as 'normal' | 'bold'})} options={[{value: 'normal', label: 'عادي'}, {value: 'bold', label: 'عريض'}]} />
          </div>
          <div className="flex items-center space-x-2 space-x-reverse mt-2">
            <input type="checkbox" id="isEditablePanel" className="form-checkbox h-5 w-5 text-sky-500 rounded border-slate-500 focus:ring-sky-400" checked={currentOverlayData.isEditableByUser || false} onChange={e => setCurrentOverlayData({...currentOverlayData, isEditableByUser: e.target.checked})} />
            <label htmlFor="isEditablePanel" className="text-gray-300">قابل للتعديل بواسطة المستخدم</label>
          </div>
          {currentOverlayData.isEditableByUser && (
            <Select label="مفتاح الحقل القابل للتعديل" value={currentOverlayData.editKey || ''} onChange={e => setCurrentOverlayData({...currentOverlayData, editKey: e.target.value as EditableFieldKey})} options={[{value: '', label: 'اختر مفتاح'}, ...editableFieldKeyOptions]} />
          )}
          <Button onClick={handleAddNewOverlayFromPanel} variant="success" className="w-full sm:w-auto">
            إضافة تراكب للقائمة المحلية
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-4 bg-slate-700 rounded-lg relative" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold text-cyan-300 mb-2">معاينة (انقر لوضع نص، انقر باليمين للتعديل/تحريك)</h3>
          {previewImageUrl ? (
            <>
              <ImageCanvas 
                imageUrl={previewImageUrl} 
                overlays={overlays} 
                logoOverlay={logoOverlay}
                canvasWidthProp={canvasDimensions.width}
                canvasHeightProp={canvasDimensions.height}
                onImageLoadError={() => setImageLoadError("فشل تحميل صورة المعاينة...")}
                onCanvasLeftClick={handleCanvasLeftClick} 
                onCanvasContextMenu={handleCanvasContextMenu}
                selectedOverlayId={contextMenu.targetOverlay?.id}
                onOverlayDragStart={handleOverlayDragStart}
                onOverlayPositionUpdate={handleOverlayPositionUpdate}
                onOverlayDragEnd={handleOverlayDragEnd}
                isMovementEnabled={!!contextMenu.targetOverlay} 
                isLogoDraggable={!!logoOverlay}
                onLogoPositionUpdate={handleLogoPositionUpdate}
              />
              {imageLoadError && <p className="text-red-400 text-sm mt-2 p-3 bg-red-900/60 border border-red-700 rounded">{imageLoadError}</p>}
            </>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-600 rounded-md text-slate-500">
              أدخل رابط صورة لعرض المعاينة
            </div>
          )}
          {contextMenu.visible && contextMenu.targetOverlay && (
            <TextOverlayContextMenu
              overlay={contextMenu.targetOverlay}
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={handleCloseContextMenu}
              onSave={handleUpdateOverlayFromContextMenu}
              onDelete={handleDeleteOverlayFromContextMenu}
            />
          )}
        </div>
        <div className="p-4 bg-slate-700 rounded-lg max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold text-cyan-300 mb-2">التراكبات المضافة (قائمة محلية)</h3>
          {overlays.length === 0 && <p className="text-slate-400">لم تتم إضافة أي تراكبات بعد. انقر على الصورة في المعاينة لإضافة أول تراكب.</p>}
          <ul className="space-y-2">
            {overlays.map(o => (
              <li key={o.id} className={`p-3 bg-slate-600 rounded-md flex justify-between items-center text-sm ${contextMenu.targetOverlay?.id === o.id ? 'ring-2 ring-sky-400' : ''}`}>
                <span className="truncate" title={o.text}>{o.text.substring(0,30)}{o.text.length > 30 ? '...' : ''} (X:{Math.round(o.x)}, Y:{Math.round(o.y)})</span>
                <div>
                  <Button onClick={() => handleDeleteOverlayFromList(o.id)} size="sm" variant="danger">حذف من القائمة</Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <Button onClick={handleSaveTemplate} variant="primary" size="lg" className="w-full md:w-auto">
        {currentTemplate.id ? 'تحديث القالب في Firebase' : 'حفظ القالب الجديد في Firebase'}
      </Button>
      {currentTemplate.id && <Button onClick={() => {setCurrentTemplate({}); setOverlays([]); setLogoOverlay(null); setPreviewImageUrl(''); setImageLoadError(null); setCurrentOverlayData({}); handleCloseContextMenu();}} variant="secondary" size="lg" className="w-full md:w-auto mt-2 md:mt-0 md:mr-2">إلغاء التعديل (قالب جديد)</Button>}

      <div className="mt-10 p-4 bg-slate-700 rounded-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-semibold text-cyan-300 mb-4">القوالب المحفوظة (من Firebase)</h3>
        {imageTemplates.length === 0 && <p className="text-slate-400">لا توجد قوالب محفوظة في Firebase.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {imageTemplates.map(template => (
            <div key={template.id} className="p-4 bg-slate-600 rounded-md shadow">
              <h4 className="font-semibold text-lg truncate mb-1" title={template.name}>{template.name}</h4>
              <p className="text-sm text-slate-300 mb-1">الفئة: {TEMPLATE_CATEGORY_LABELS[template.category]}</p>
              <img 
                src={template.imageUrl} 
                alt={template.name} 
                className="w-full h-32 object-cover rounded mb-3 bg-slate-500" 
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.alt = `فشل تحميل: ${template.name}`;
                  target.style.border = '2px solid red';
                }}
              />
              <div className="flex space-x-2 space-x-reverse">
                <Button onClick={() => handleLoadTemplateForEditing(template)} size="sm" variant="secondary">تحميل للتعديل</Button>
                <Button onClick={() => {if(window.confirm('هل أنت متأكد من حذف هذا القالب نهائياً من Firebase؟')) deleteImageTemplate(template.id)}} size="sm" variant="danger">حذف من Firebase</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;