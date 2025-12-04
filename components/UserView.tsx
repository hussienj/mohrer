import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ImageConfig, TemplateCategory, TEMPLATE_CATEGORY_LABELS, UserEdits, EditableFieldKey, EDITABLE_FIELD_LABELS, TextOverlay } from '../types';
import Button from './common/Button';
import Input from './common/Input';
import ImageCanvas from './ImageCanvas';
import Select from './common/Select';


const UserView: React.FC = () => {
  const { imageTemplates, loadTemplates } = useAppContext();
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | ''>('');
  const [selectedTemplate, setSelectedTemplate] = useState<ImageConfig | null>(null);
  const [userEdits, setUserEdits] = useState<UserEdits>({});
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [editableOverlays, setEditableOverlays] = useState<TextOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const canvasExportRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadTemplates(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (selectedTemplate) {
        setEditableOverlays(selectedTemplate.overlays);
    } else {
        setEditableOverlays([]);
    }
    setSelectedOverlayId(null);
    setIsDragging(false);
  }, [selectedTemplate]);

  const handleCategoryChange = (category: TemplateCategory | '') => {
    setSelectedCategory(category);
    setSelectedTemplate(null); 
    setUserEdits({});
    setImageLoadError(null);
  };

  const handleTemplateSelect = (template: ImageConfig) => {
    setSelectedTemplate(template);
    setImageLoadError(null);
    const initialEdits: UserEdits = {};
    template.overlays.forEach(overlay => {
      if (overlay.isEditableByUser && overlay.editKey) {
        initialEdits[overlay.editKey] = overlay.text; 
      }
    });
    if (template.logoOverlay?.isEditableByUser && template.logoOverlay.editKey) {
      initialEdits[template.logoOverlay.editKey] = template.logoOverlay.imageUrl;
    }
    setUserEdits(initialEdits);
  };

  const handleUserEditChange = (key: EditableFieldKey, value: string) => {
    setUserEdits(prev => ({ ...prev, [key]: value }));
  };
  
  const handleLogoFileUpload = (event: React.ChangeEvent<HTMLInputElement>, key: EditableFieldKey) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
        alert("يرجى اختيار ملف صورة صالح.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result;
        if (typeof result === 'string') {
            handleUserEditChange(key, result);
        } else {
            alert("فشل في قراءة الملف.");
        }
    };
    reader.onerror = () => {
        alert("حدث خطأ أثناء قراءة الملف.");
    };
    reader.readAsDataURL(file);
    
    event.target.value = ''; 
  };
  
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
  };

    const handleCanvasClick = (x: number, y: number, targetOverlay: TextOverlay | null) => {
        if (isDragging) return;
        
        if (targetOverlay && targetOverlay.isEditableByUser) {
            setSelectedOverlayId(targetOverlay.id);
        } else {
            setSelectedOverlayId(null);
        }
    };

    const handleOverlayDragStart = useCallback((overlayId: string) => {
        if (overlayId === selectedOverlayId) {
            setIsDragging(true);
        }
    }, [selectedOverlayId]);

    const handleOverlayPositionUpdate = useCallback((overlayId: string, newX: number, newY: number) => {
        if (isDragging && overlayId === selectedOverlayId) {
            setEditableOverlays(prevOverlays =>
                prevOverlays.map(o => (o.id === overlayId ? { ...o, x: newX, y: newY } : o))
            );
        }
    }, [isDragging, selectedOverlayId]);

    const handleOverlayDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

  const handleExportImage = async () => {
    if (!selectedTemplate || !canvasExportRef.current) return;
    
    if (imageLoadError) {
      alert("لا يمكن تصدير الصورة لأن صورة القالب الأساسية فشلت في التحميل. يرجى إبلاغ المسؤول.");
      return;
    }
    
    const canvas = canvasExportRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = selectedTemplate.canvasWidth;
    canvas.height = selectedTemplate.canvasHeight;
    ctx.clearRect(0,0, canvas.width, canvas.height);

    try {
        const backgroundImg = await loadImage(selectedTemplate.imageUrl);
        ctx.drawImage(backgroundImg, 0, 0, selectedTemplate.canvasWidth, selectedTemplate.canvasHeight);

        editableOverlays.forEach((overlay) => {
            ctx.font = `${overlay.fontWeight} ${overlay.fontSize}px ${overlay.fontFamily}`;
            ctx.fillStyle = overlay.color;
            ctx.textAlign = 'right';
            let textToDraw = overlay.text;
            if (overlay.isEditableByUser && overlay.editKey && userEdits[overlay.editKey] !== undefined) {
            textToDraw = userEdits[overlay.editKey];
            }
            ctx.fillText(textToDraw, overlay.x, overlay.y);
        });
        
        const logoConfig = selectedTemplate.logoOverlay;
        const userLogoUrl = logoConfig?.editKey ? userEdits[logoConfig.editKey] : undefined;
        const finalLogoUrl = userLogoUrl !== undefined ? userLogoUrl : logoConfig?.imageUrl;

        if (logoConfig && finalLogoUrl && finalLogoUrl.length > 0) {
            const logoImg = await loadImage(finalLogoUrl);
            ctx.save();
            ctx.beginPath();
            ctx.arc(logoConfig.x, logoConfig.y, logoConfig.radius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(logoImg, logoConfig.x - logoConfig.radius, logoConfig.y - logoConfig.radius, logoConfig.radius * 2, logoConfig.radius * 2);
            ctx.restore();
        }

        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${selectedTemplate.name.replace(/\s+/g, '_')}_modified.png`;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Error during image export:", error);
        alert("حدث خطأ أثناء تحميل الصور للتصدير. قد يكون أحد الروابط غير صالح أو غير متاح.");
    }
  };

  const filteredTemplates = selectedCategory
    ? imageTemplates.filter(t => t.category === selectedCategory)
    : imageTemplates; 

  const categoryOptions = Object.entries(TEMPLATE_CATEGORY_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }));
  
  const currentEditableOverlays = selectedTemplate?.overlays.filter(o => o.isEditableByUser && o.editKey) || [];
  const logoEditKey = selectedTemplate?.logoOverlay?.editKey;
  const showLogoControls = selectedTemplate?.logoOverlay?.isEditableByUser && logoEditKey;

  return (
    <div className="p-4 sm:p-6 bg-slate-800 rounded-xl shadow-2xl">
      <h2 className="text-2xl sm:text-3xl font-bold text-center text-sky-400 mb-6 sm:mb-8">عرض وتعديل المستندات</h2>
      
      <div className="mb-6">
        <Select
            label="اختر فئة المستند:"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value as TemplateCategory | '')}
            options={[{ value: '', label: 'جميع الفئات' }, ...categoryOptions]}
            containerClassName="max-w-md mx-auto"
        />
      </div>

      {selectedCategory && filteredTemplates.length === 0 && (
        <p className="text-center text-slate-400 my-8">لا توجد قوالب متاحة لهذه الفئة.</p>
      )}

      {!selectedCategory && imageTemplates.length === 0 && (
         <p className="text-center text-slate-400 my-8">لا توجد أي قوالب. يرجى الطلب من المسؤول إعداد بعض القوالب.</p>
      )}


      {!selectedTemplate && filteredTemplates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filteredTemplates.map(template => (
            <div key={template.id} 
                 className="p-4 bg-slate-700 rounded-lg shadow-lg cursor-pointer hover:bg-slate-600 transition-colors duration-150 flex flex-col"
                 onClick={() => handleTemplateSelect(template)}>
              <img 
                src={template.imageUrl} 
                alt={`معاينة لـ ${template.name}`}
                className="w-full h-40 object-cover rounded-md mb-3 bg-slate-500 border border-transparent" 
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.alt = `فشل تحميل معاينة: ${template.name}`;
                  target.style.border = '2px solid red';
                  const parent = target.parentNode as HTMLElement | null;
                  if (parent) {
                    parent.classList.add('bg-slate-800', 'flex', 'items-center', 'justify-center');
                  }
                  target.style.display = 'none';
                  const errorText = document.createElement('span');
                  errorText.className = 'text-red-400 text-xs text-center p-2';
                  errorText.textContent = 'فشل تحميل الصورة';
                  if (target.parentNode && !target.parentNode.querySelector('.text-red-400')) {
                     target.parentNode.appendChild(errorText);
                  }
                }}
              />
              <div className="mt-auto">
                <h3 className="font-semibold text-lg text-cyan-300 truncate" title={template.name}>{template.name}</h3>
                <p className="text-sm text-slate-300">{TEMPLATE_CATEGORY_LABELS[template.category]}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <div className="mt-8">
          <Button onClick={() => { setSelectedTemplate(null); setUserEdits({}); setImageLoadError(null);}} variant="secondary" className="mb-6">
            &larr; العودة لاختيار القوالب
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-xl font-semibold text-cyan-300 mb-2">{selectedTemplate.name}</h3>
              <p className="text-sm text-slate-400 -mt-1 mb-4">انقر على أي نص قابل للتعديل لتحديده، ثم اسحبه لتغيير موضعه.</p>
              {imageLoadError && (
                <div className="p-4 mb-4 text-center bg-red-900/60 border border-red-700 text-red-300 rounded-md">
                  <p className="font-semibold">فشل تحميل صورة القالب!</p>
                  <p className="text-sm">{imageLoadError}</p>
                  <p className="text-sm mt-1">لا يزال بإمكانك تعديل الحقول النصية، ولكن الخلفية لن تكون مرئية. يرجى إبلاغ المسؤول بالمشكلة.</p>
                </div>
              )}
              <ImageCanvas 
                imageUrl={selectedTemplate.imageUrl} 
                overlays={editableOverlays}
                logoOverlay={selectedTemplate.logoOverlay}
                userEdits={userEdits}
                canvasWidthProp={selectedTemplate.canvasWidth}
                canvasHeightProp={selectedTemplate.canvasHeight}
                backgroundColor="#DDDDDD"
                onImageLoadError={() => {
                  setImageLoadError(`تعذر تحميل صورة الخلفية للقالب "${selectedTemplate.name}". قد يكون الرابط غير صحيح أو هناك قيود على الوصول (CORS).`);
                }}
                onCanvasLeftClick={handleCanvasClick}
                selectedOverlayId={selectedOverlayId}
                isMovementEnabled={true}
                onOverlayDragStart={handleOverlayDragStart}
                onOverlayPositionUpdate={handleOverlayPositionUpdate}
                onOverlayDragEnd={handleOverlayDragEnd}
              />
               <canvas ref={canvasExportRef} style={{ display: 'none' }}></canvas>
            </div>
            <div className="md:col-span-1 p-4 bg-slate-700 rounded-lg">
              <h3 className="text-xl font-semibold text-cyan-300 mb-4">تعديل الحقول</h3>
              {currentEditableOverlays.length === 0 && !showLogoControls && <p className="text-slate-400">لا توجد حقول قابلة للتعديل في هذا القالب.</p>}
              {currentEditableOverlays.map(overlay => (
                overlay.editKey && ( 
                  <Input
                    key={overlay.editKey}
                    label={EDITABLE_FIELD_LABELS[overlay.editKey] || overlay.editKey}
                    value={userEdits[overlay.editKey] || ''}
                    onChange={(e) => handleUserEditChange(overlay.editKey!, e.target.value)}
                    containerClassName="mb-3"
                  />
                )
              ))}
              {showLogoControls && logoEditKey && (
                <div className="mt-4 pt-4 border-t border-slate-600">
                  <h4 className="text-lg font-semibold text-cyan-400 mb-2">
                    {EDITABLE_FIELD_LABELS[logoEditKey]}
                  </h4>

                  <div>
                      <label htmlFor="logo-upload" className="w-full text-center block cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out text-sm mb-2">
                          رفع شعار من الجهاز
                      </label>
                      <input 
                          id="logo-upload"
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoFileUpload(e, logoEditKey)}
                      />
                  </div>

                  <div className="flex items-center my-2">
                      <div className="flex-grow border-t border-slate-600"></div>
                      <span className="flex-shrink mx-2 text-slate-400 text-sm">أو</span>
                      <div className="flex-grow border-t border-slate-600"></div>
                  </div>

                  <Input
                    key={`${logoEditKey}-url`}
                    label="لصق رابط شعار"
                    value={(userEdits[logoEditKey] || '').startsWith('data:') ? '' : userEdits[logoEditKey] || ''}
                    onChange={(e) => handleUserEditChange(logoEditKey, e.target.value)}
                    placeholder={(userEdits[logoEditKey] || '').startsWith('data:') ? 'تم رفع ملف. استخدم الزر أدناه للحذف.' : 'https://example.com/logo.png'}
                    disabled={(userEdits[logoEditKey] || '').startsWith('data:')}
                    containerClassName="mb-3"
                  />

                  {(userEdits[logoEditKey]) && (
                      <Button
                        onClick={() => {
                            handleUserEditChange(logoEditKey, '');
                            const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                        }}
                        variant="danger"
                        size="sm"
                        className="w-full"
                      >
                        حذف الشعار المخصص
                      </Button>
                  )}
                </div>
              )}
              {(currentEditableOverlays.length > 0 || showLogoControls) && (
                <Button 
                  onClick={handleExportImage} 
                  variant="success" 
                  size="lg" 
                  className="w-full mt-4"
                  disabled={!!imageLoadError}
                  title={imageLoadError ? "التصدير معطل بسبب فشل تحميل صورة القالب" : "تصدير الصورة المعدلة"}
                >
                  تصدير الصورة المعدلة
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserView;