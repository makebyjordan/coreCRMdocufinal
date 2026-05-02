/**
 * SignaturePad.jsx
 * Componente de firma digital mediante canvas HTML5.
 * Funciona en escritorio (ratón) y móvil/tablet (touch).
 *
 * Props:
 *   onSave(dataUrl, blob)  — callback cuando el usuario confirma la firma
 *   onCancel()             — callback al cancelar
 *   width  (default 600)
 *   height (default 200)
 *   label  (default "Firma aquí")
 *   disabled
 *   existingSignature      — dataUrl de firma previa (modo edición)
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Pen, Trash2, Check, X, RotateCcw, Download } from 'lucide-react';

export default function SignaturePad({
  onSave,
  onCancel,
  width = 600,
  height = 200,
  label = 'Firma aquí',
  disabled = false,
  existingSignature = null,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [penColor, setPenColor] = useState('#1e293b');
  const [penWidth, setPenWidth] = useState(2);
  const lastPoint = useRef(null);

  // ─── Inicialización ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Si hay firma previa, cargarla
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setIsEmpty(false);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  // ─── Helpers de coordenadas ──────────────────────────────────────────────────
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  // ─── Dibujo ──────────────────────────────────────────────────────────────────
  const startDrawing = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(true);
    setIsEmpty(false);
    const pos = getPos(e);
    lastPoint.current = pos;

    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, penWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();
  }, [disabled, getPos, penColor, penWidth]);

  const draw = useCallback((e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e);

    ctx.beginPath();
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Suavizado con punto medio (Bezier)
    if (lastPoint.current) {
      const midX = (lastPoint.current.x + pos.x) / 2;
      const midY = (lastPoint.current.y + pos.y) / 2;
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY);
    } else {
      ctx.moveTo(pos.x, pos.y);
    }

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
  }, [isDrawing, disabled, getPos, penColor, penWidth]);

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPoint.current = null;
  }, []);

  // ─── Limpiar ─────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }, []);

  // ─── Guardar ─────────────────────────────────────────────────────────────────
  const save = useCallback(() => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    canvas.toBlob((blob) => {
      onSave?.(dataUrl, blob);
    }, 'image/png');
  }, [isEmpty, onSave]);

  // ─── Descargar ───────────────────────────────────────────────────────────────
  const download = useCallback(() => {
    if (isEmpty) return;
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `firma_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [isEmpty]);

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-slate-600">{label}</span>

        {/* Color del bolígrafo */}
        <div className="flex items-center gap-1">
          {['#1e293b', '#1d4ed8', '#15803d', '#dc2626'].map(color => (
            <button
              key={color}
              onClick={() => setPenColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${penColor === color ? 'border-slate-500 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: color }}
              title={`Color: ${color}`}
            />
          ))}
        </div>

        {/* Grosor del trazo */}
        <div className="flex items-center gap-1">
          {[1, 2, 4].map(w => (
            <button
              key={w}
              onClick={() => setPenWidth(w)}
              className={`flex items-center justify-center w-8 h-8 rounded border transition-colors ${penWidth === w ? 'bg-slate-200 border-slate-400' : 'border-slate-200 hover:bg-slate-100'}`}
              title={`Grosor ${w}px`}
            >
              <div className="rounded-full bg-slate-700" style={{ width: w * 3, height: w * 3 }} />
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={clear}
            disabled={isEmpty || disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </button>
          <button
            onClick={download}
            disabled={isEmpty}
            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className={`relative border-2 rounded-lg overflow-hidden select-none transition-colors ${
          disabled
            ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
            : isEmpty
            ? 'border-dashed border-slate-300 bg-white cursor-crosshair hover:border-blue-400'
            : 'border-slate-300 bg-white cursor-crosshair'
        }`}
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full block"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
        />

        {/* Placeholder cuando está vacío */}
        {isEmpty && !disabled && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <Pen className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-sm text-slate-400">Firma en este espacio</span>
          </div>
        )}

        {/* Indicador de bloqueado */}
        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-slate-50/70">
            <span className="text-sm text-slate-400">Firma bloqueada</span>
          </div>
        )}
      </div>

      {/* Línea de firma */}
      <div className="flex items-center gap-2 px-4">
        <div className="flex-1 border-b border-slate-300" />
        <span className="text-xs text-slate-400">X</span>
      </div>

      {/* Botones de acción */}
      {(onSave || onCancel) && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          )}
          {onSave && (
            <button
              onClick={save}
              disabled={isEmpty}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-4 h-4" />
              Confirmar firma
            </button>
          )}
        </div>
      )}
    </div>
  );
}
