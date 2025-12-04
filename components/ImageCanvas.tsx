import React, { useRef, useEffect, useState, useCallback } from 'react';
import { TextOverlay, UserEdits, LogoOverlay } from '../types';
import { MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT } from '../constants';

interface ImageCanvasProps {
  imageUrl?: string;
  overlays: TextOverlay[];
  logoOverlay?: LogoOverlay | null;
  userEdits?: UserEdits;
  onDrawComplete?: (canvas: HTMLCanvasElement) => void;
  canvasWidthProp?: number;
  canvasHeightProp?: number;
  backgroundColor?: string;
  onImageLoadError?: () => void;
  onCanvasLeftClick?: (x: number, y: number, targetOverlay: TextOverlay | null) => void;
  onCanvasContextMenu?: (
    eventX: number,
    eventY: number,
    pageX: number,
    pageY: number,
    targetOverlay: TextOverlay | null
  ) => void;
  selectedOverlayId?: string | null;
  isMovementEnabled?: boolean; 
  onOverlayDragStart?: (overlayId: string) => void;
  onOverlayPositionUpdate?: (overlayId: string, newX: number, newY: number) => void;
  onOverlayDragEnd?: (overlayId: string) => void;
  isLogoDraggable?: boolean;
  onLogoPositionUpdate?: (newX: number, newY: number) => void;
}

interface OverlayBounds {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DragContext {
  type: 'text' | 'logo';
  id: string;
  clickOffsetX: number; 
  clickOffsetY: number;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  overlays,
  logoOverlay,
  userEdits = {},
  onDrawComplete,
  canvasWidthProp,
  canvasHeightProp,
  backgroundColor = '#ffffff',
  onImageLoadError,
  onCanvasLeftClick,
  onCanvasContextMenu,
  selectedOverlayId,
  isMovementEnabled,
  onOverlayDragStart,
  onOverlayPositionUpdate,
  onOverlayDragEnd,
  isLogoDraggable,
  onLogoPositionUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loadedImgState, setLoadedImgState] = useState<{ element: HTMLImageElement; width: number; height: number } | null>(null);
  const [loadedLogo, setLoadedLogo] = useState<HTMLImageElement | null>(null);
  const [isImgError, setIsImgError] = useState<boolean>(false);
  const [isLogoError, setIsLogoError] = useState<boolean>(false);
  const overlayBoundsRef = useRef<OverlayBounds[]>([]);

  const [bufferWidth, setBufferWidth] = useState<number>(canvasWidthProp || MAX_CANVAS_WIDTH / 2);
  const [bufferHeight, setBufferHeight] = useState<number>(canvasHeightProp || MAX_CANVAS_HEIGHT / 2);

  const [dragContext, setDragContext] = useState<DragContext | null>(null);
  const [isMouseOverSelectedMovableOverlay, setIsMouseOverSelectedMovableOverlay] = useState(false);
  const didDragRef = useRef(false); 

  // Effect for background image
  useEffect(() => {
    let targetBufferWidth = canvasWidthProp || MAX_CANVAS_WIDTH / 2;
    let targetBufferHeight = canvasHeightProp || MAX_CANVAS_HEIGHT / 2;

    if (imageUrl) {
      setIsImgError(false);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!canvasWidthProp || !canvasHeightProp) {
            let w = img.width;
            let h = img.height;
            const capRatioW = w > MAX_CANVAS_WIDTH ? MAX_CANVAS_WIDTH / w : 1;
            const capRatioH = h > MAX_CANVAS_HEIGHT ? MAX_CANVAS_HEIGHT / h : 1;
            const capRatio = Math.min(capRatioW, capRatioH);

            if (capRatio < 1) {
                w *= capRatio;
                h *= capRatio;
            }
            targetBufferWidth = Math.round(w);
            targetBufferHeight = Math.round(h);
        }
        setBufferWidth(targetBufferWidth);
        setBufferHeight(targetBufferHeight);
        setLoadedImgState({ element: img, width: img.width, height: img.height });
      };
      img.onerror = () => {
        setLoadedImgState(null);
        setIsImgError(true);
        setBufferWidth(canvasWidthProp || MAX_CANVAS_WIDTH / 2);
        setBufferHeight(canvasHeightProp || MAX_CANVAS_HEIGHT / 2);
        if (onImageLoadError) onImageLoadError();
      };
      img.src = imageUrl;
    } else {
      setLoadedImgState(null);
      setIsImgError(false);
      setBufferWidth(targetBufferWidth);
      setBufferHeight(targetBufferHeight);
    }
  }, [imageUrl, canvasWidthProp, canvasHeightProp, onImageLoadError]);
  
  const finalLogoUrl = logoOverlay?.isEditableByUser && logoOverlay.editKey && userEdits[logoOverlay.editKey]
    ? userEdits[logoOverlay.editKey]
    : logoOverlay?.imageUrl;

  const shouldShowLogo = finalLogoUrl && finalLogoUrl.length > 0;

  // Effect for logo image
  useEffect(() => {
    if (!shouldShowLogo || !finalLogoUrl) {
      setLoadedLogo(null);
      setIsLogoError(false);
      return;
    }
    
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = () => {
      setLoadedLogo(logoImg);
      setIsLogoError(false);
    };
    logoImg.onerror = () => {
      console.error("Failed to load logo image:", finalLogoUrl);
      setLoadedLogo(null);
      setIsLogoError(true);
    };
    logoImg.src = finalLogoUrl;
  }, [finalLogoUrl, shouldShowLogo]);

  // Main drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (loadedImgState && !isImgError) {
      ctx.drawImage(loadedImgState.element, 0, 0, bufferWidth, bufferHeight);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw Logo
    if (logoOverlay && loadedLogo && !isLogoError) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoOverlay.x, logoOverlay.y, logoOverlay.radius, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(loadedLogo, logoOverlay.x - logoOverlay.radius, logoOverlay.y - logoOverlay.radius, logoOverlay.radius * 2, logoOverlay.radius * 2);
      ctx.restore();

      if ((dragContext && dragContext.type === 'logo') || (isLogoDraggable && !dragContext)) {
        ctx.save();
        ctx.strokeStyle = (dragContext && dragContext.type === 'logo') ? 'rgba(255, 100, 0, 0.9)' : 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = (dragContext && dragContext.type === 'logo') ? 3 : 2;
        ctx.setLineDash((dragContext && dragContext.type === 'logo') ? [4,2] : [6,3]);
        ctx.beginPath();
        ctx.arc(logoOverlay.x, logoOverlay.y, logoOverlay.radius, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.restore();
      }
    }

    const newBounds: OverlayBounds[] = [];
    overlays.forEach((overlay) => {
      ctx.font = `${overlay.fontWeight} ${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.fillStyle = overlay.color;
      ctx.textAlign = 'right';
      let textToDraw = overlay.text;
      if (overlay.isEditableByUser && overlay.editKey && userEdits[overlay.editKey]) {
        textToDraw = userEdits[overlay.editKey];
      }
      ctx.fillText(textToDraw, overlay.x, overlay.y);

      const metrics = ctx.measureText(textToDraw);
      const textWidth = metrics.width;
      const textHeight = overlay.fontSize; 
      const bound: OverlayBounds = {
        id: overlay.id,
        x1: overlay.x - textWidth, y1: overlay.y - textHeight,
        x2: overlay.x, y2: overlay.y + textHeight * 0.2,
      };
      newBounds.push(bound);

      if (overlay.id === selectedOverlayId) {
        ctx.save();
        ctx.strokeStyle = dragContext && dragContext.type === 'text' && dragContext.id === overlay.id ? 'rgba(255, 100, 0, 0.9)' : 'rgba(0, 150, 255, 0.7)';
        ctx.lineWidth = dragContext && dragContext.id === overlay.id ? 3 : 2;
        ctx.setLineDash(dragContext && dragContext.id === overlay.id ? [4, 2] : []);
        ctx.strokeRect(bound.x1 - 2, bound.y1 - 2, (bound.x2 - bound.x1) + 4, (bound.y2 - bound.y1) + 4);
        ctx.restore();
      }
    });
    overlayBoundsRef.current = newBounds;
    if (onDrawComplete) onDrawComplete(canvas);
  }, [loadedImgState, isImgError, loadedLogo, isLogoError, overlays, userEdits, selectedOverlayId, backgroundColor, onDrawComplete, bufferWidth, bufferHeight, dragContext, logoOverlay, isLogoDraggable]);


  const getMousePos = (event: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return {x: 0, y: 0};
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDownInternal = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return; 
    
    const { x: mouseX, y: mouseY } = getMousePos(event);
    didDragRef.current = false;

    if (isMovementEnabled && selectedOverlayId && onOverlayDragStart) {
      const selectedBounds = overlayBoundsRef.current.find(b => b.id === selectedOverlayId);
      const targetOverlay = overlays.find(o => o.id === selectedOverlayId);
      if (selectedBounds && targetOverlay &&
          mouseX >= selectedBounds.x1 && mouseX <= selectedBounds.x2 &&
          mouseY >= selectedBounds.y1 && mouseY <= selectedBounds.y2) {
        event.preventDefault();
        setDragContext({
          type: 'text',
          id: selectedOverlayId,
          clickOffsetX: mouseX - targetOverlay.x,
          clickOffsetY: mouseY - targetOverlay.y,
        });
        onOverlayDragStart(selectedOverlayId);
        return; 
      }
    }
    
    if (isLogoDraggable && logoOverlay) {
        const distance = Math.sqrt(Math.pow(mouseX - logoOverlay.x, 2) + Math.pow(mouseY - logoOverlay.y, 2));
        if (distance <= logoOverlay.radius) {
            event.preventDefault();
            setDragContext({
                type: 'logo',
                id: logoOverlay.id,
                clickOffsetX: mouseX - logoOverlay.x,
                clickOffsetY: mouseY - logoOverlay.y,
            });
            return;
        }
    }
  };

  const handleMouseMoveInternal = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x: mouseX, y: mouseY } = getMousePos(event);

    if (dragContext && onOverlayPositionUpdate && dragContext.type === 'text') {
        if (!didDragRef.current) didDragRef.current = true;
        const newOverlayX = mouseX - dragContext.clickOffsetX;
        const newOverlayY = mouseY - dragContext.clickOffsetY;
        onOverlayPositionUpdate(dragContext.id, newOverlayX, newOverlayY);
    } else if (dragContext && onLogoPositionUpdate && dragContext.type === 'logo') {
        if (!didDragRef.current) didDragRef.current = true;
        const newLogoX = mouseX - dragContext.clickOffsetX;
        const newLogoY = mouseY - dragContext.clickOffsetY;
        onLogoPositionUpdate(newLogoX, newLogoY);
    } else if (isMovementEnabled && selectedOverlayId) {
        const selectedBounds = overlayBoundsRef.current.find(b => b.id === selectedOverlayId);
        if (selectedBounds &&
            mouseX >= selectedBounds.x1 && mouseX <= selectedBounds.x2 &&
            mouseY >= selectedBounds.y1 && mouseY <= selectedBounds.y2) {
            setIsMouseOverSelectedMovableOverlay(true);
        } else {
            setIsMouseOverSelectedMovableOverlay(false);
        }
    } else {
        setIsMouseOverSelectedMovableOverlay(false);
    }
  };

  const handleMouseUpInternal = (event: React.MouseEvent<HTMLCanvasElement>) => {
     if (event.button !== 0) { 
        if (dragContext) { 
            if (dragContext.type === 'text' && onOverlayDragEnd) onOverlayDragEnd(dragContext.id);
            setDragContext(null);
        }
        return;
    }

    if (dragContext) {
      if (dragContext.type === 'text' && onOverlayDragEnd) onOverlayDragEnd(dragContext.id);
    }
    setDragContext(null);

    if (!didDragRef.current && onCanvasLeftClick) { 
        const { x, y } = getMousePos(event);
        let hitOverlay: TextOverlay | null = null;
        for (const bound of overlayBoundsRef.current) {
            if (x >= bound.x1 && x <= bound.x2 && y >= bound.y1 && y <= bound.y2) {
                const foundOverlay = overlays.find(o => o.id === bound.id);
                if (foundOverlay) {
                    hitOverlay = foundOverlay;
                    break;
                }
            }
        }
        onCanvasLeftClick(x, y, hitOverlay);
    }
    didDragRef.current = false; 
  };
  
  const handleContextMenuInternal = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCanvasContextMenu) return;
    event.preventDefault();
    if (dragContext) return; 

    const { x: clickX, y: clickY } = getMousePos(event);
    let hitOverlay: TextOverlay | null = null;
    for (const bound of overlayBoundsRef.current) {
      if (clickX >= bound.x1 && clickX <= bound.x2 && clickY >= bound.y1 && clickY <= bound.y2) {
        hitOverlay = overlays.find(o => o.id === bound.id) || null;
        break;
      }
    }
    onCanvasContextMenu(clickX, clickY, event.pageX, event.pageY, hitOverlay);
  };
  
  const getCursorStyle = (): React.CSSProperties['cursor'] => {
    if (dragContext) return 'grabbing';
    if (isMouseOverSelectedMovableOverlay && isMovementEnabled) return 'move';
    if (onCanvasLeftClick) return 'pointer';
    if (isLogoDraggable) return 'crosshair'; // General draggable indicator
    return 'crosshair';
  };

  const handleMouseLeaveInternal = () => {
    if (dragContext) {
        if (dragContext.type === 'text' && onOverlayDragEnd) onOverlayDragEnd(dragContext.id);
        setDragContext(null);
    }
    setIsMouseOverSelectedMovableOverlay(false);
    didDragRef.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className="border border-gray-500 rounded-md shadow-lg bg-white"
      style={{ 
        cursor: getCursorStyle(), 
        display: 'block',
        width: '100%',
        height: 'auto',
        aspectRatio: (bufferWidth > 0 && bufferHeight > 0) ? `${bufferWidth} / ${bufferHeight}` : '1 / 1',
        maxWidth: `${bufferWidth}px`,
      }}
      onMouseDown={handleMouseDownInternal}
      onMouseMove={handleMouseMoveInternal}
      onMouseUp={handleMouseUpInternal}
      onMouseLeave={handleMouseLeaveInternal} 
      onContextMenu={handleContextMenuInternal}
      aria-label="Image editing canvas"
      role="application"
      aria-roledescription="Interactive image editing area"
    ></canvas>
  );
};

export default ImageCanvas;