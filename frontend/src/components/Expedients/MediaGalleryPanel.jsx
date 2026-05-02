/**
 * MediaGalleryPanel.jsx
 * Galería multimedia para expedientes con soporte para fotos, videos, planos, tours 360 y docs marketing
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Grid3X3,
  List,
  Upload,
  X,
  Play,
  Pause,
  Image as ImageIcon,
  Video,
  FileText,
  Map,
  Box,
  Star,
  Trash2,
  ExternalLink,
  Crown,
  Loader2,
  AlertCircle,
  Link,
  FolderOpen,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Download,
  Building2,
} from 'lucide-react';
import api from '../../api/client';

// ─── Constantes ────────────────────────────────────────────────────────────────

const MEDIA_TYPES = {
  ALL: { id: 'all', label: 'Todos', icon: ImageIcon, color: 'bg-gray-500' },
  PHOTO: { id: 'PHOTO', label: 'Fotos', icon: ImageIcon, color: 'bg-emerald-500' },
  VIDEO: { id: 'VIDEO', label: 'Vídeos', icon: Video, color: 'bg-purple-500' },
  FLOOR_PLAN: { id: 'FLOOR_PLAN', label: 'Planos', icon: Map, color: 'bg-blue-500' },
  TOUR_360: { id: 'TOUR_360', label: '360°', icon: Box, color: 'bg-amber-500' },
  DOCUMENT_MKT: { id: 'DOCUMENT_MKT', label: 'Marketing', icon: FileText, color: 'bg-pink-500' },
};

const PORTALS = [
  { id: 'idealista', label: 'Idealista', color: 'bg-red-500' },
  { id: 'fotocasa', label: 'Fotocasa', color: 'bg-blue-500' },
  { id: 'habitaclia', label: 'Habitaclia', color: 'bg-green-500' },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function MediaGalleryPanel({ expedientId }) {
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterType, setFilterType] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);
  const fileInputRef = useRef(null);

  // ─── Estados del Lightbox ──────────────────────────────────────────────────
  const [previewIndex, setPreviewIndex] = useState(null);

  // ─── Estados del Modal ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('local'); // 'local' | 'url'
  const [title, setTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  // ─── React Query ───────────────────────────────────────────────────────────

  const { data: media = [], isLoading } = useQuery({
    queryKey: ['media', expedientId],
    queryFn: () => api.get(`/media/expedient/${expedientId}`).then((r) => r.data),
    staleTime: 30000,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const uploadMutation = useMutation({
    mutationFn: async ({ files, title: uploadTitle }) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (uploadTitle) formData.append('title', uploadTitle);
      return api.post(`/media/expedient/${expedientId}/upload`, formData);
    },
    onSuccess: (res) => {
      toast.success(`${res.data.length} archivo(s) subido(s) correctamente`);
      setShowModal(false);
      setTitle('');
      setSelectedFiles([]);
      qc.invalidateQueries(['media', expedientId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al subir archivos');
    },
  });

  const uploadFromUrlMutation = useMutation({
    mutationFn: async ({ url, title: imageTitle, type = 'PHOTO' }) => {
      return api.post(`/media/expedient/${expedientId}/upload-url`, { url, title: imageTitle, type });
    },
    onSuccess: () => {
      toast.success('Imagen subida desde URL correctamente');
      setShowModal(false);
      setUrlInput('');
      setTitle('');
      qc.invalidateQueries(['media', expedientId]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Error al subir desde URL');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/media/${id}`),
    onSuccess: () => {
      toast.success('Archivo eliminado');
      qc.invalidateQueries(['media', expedientId]);
    },
    onError: () => toast.error('Error al eliminar archivo'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/media/${id}`, data),
    onSuccess: () => {
      toast.success('Actualizado correctamente');
      qc.invalidateQueries(['media', expedientId]);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const portalSyncMutation = useMutation({
    mutationFn: ({ id, portal, enabled }) =>
      api.post(`/media/${id}/portal-sync`, { portal, enabled }),
    onSuccess: (_, vars) => {
      toast.success(`Portal ${vars.portal} ${vars.enabled ? 'activado' : 'desactivado'}`);
      qc.invalidateQueries(['media', expedientId]);
    },
    onError: () => toast.error('Error al sincronizar con portal'),
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        setSelectedFiles(files);
        setShowModal(true);
        setModalMode('local');
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        setSelectedFiles(files);
        setShowModal(true);
        setModalMode('local');
      }
    },
    []
  );

  const handleSubmitUpload = () => {
    if (modalMode === 'local') {
      if (selectedFiles.length === 0) {
        toast.error('Selecciona al menos un archivo');
        return;
      }
      uploadMutation.mutate({ files: selectedFiles, title });
    } else {
      if (!urlInput.trim()) {
        toast.error('Introduce una URL válida');
        return;
      }
      uploadFromUrlMutation.mutate({ url: urlInput.trim(), title, type: 'PHOTO' });
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const setAsCover = (id) => {
    updateMutation.mutate({ id, data: { isCover: true } });
  };

  const togglePortal = (mediaId, portalId, currentEnabled) => {
    portalSyncMutation.mutate({ id: mediaId, portal: portalId, enabled: !currentEnabled });
  };

  // ─── Filtrado ──────────────────────────────────────────────────────────────

  const filteredMedia =
    filterType === 'all' ? media : media.filter((m) => m.type === filterType);

  // Contadores por tipo
  const counts = {
    all: media.length,
    PHOTO: media.filter((m) => m.type === 'PHOTO').length,
    VIDEO: media.filter((m) => m.type === 'VIDEO').length,
    FLOOR_PLAN: media.filter((m) => m.type === 'FLOOR_PLAN').length,
    TOUR_360: media.filter((m) => m.type === 'TOUR_360').length,
    DOCUMENT_MKT: media.filter((m) => m.type === 'DOCUMENT_MKT').length,
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─── Header con filtros ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Object.values(MEDIA_TYPES).map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === type.id
                  ? 'bg-[var(--primary-color)] text-white'
                  : 'bg-[var(--sidebar-bg)] text-[var(--text-muted)] hover:bg-gray-200'
              }`}
            >
              <type.icon size={14} />
              {type.label}
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px]">
                {counts[type.id] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex items-center bg-[var(--sidebar-bg)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Botón subir */}
          <button
            onClick={() => {
              setShowModal(true);
              setModalMode('local');
              setSelectedFiles([]);
              setUrlInput('');
              setTitle('');
            }}
            disabled={uploadMutation.isPending || uploadFromUrlMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {uploadMutation.isPending || uploadFromUrlMutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Subir
          </button>

          {/* Botón Portales Inmobiliarios */}
          <button
            onClick={() => {
              toast('La integración con portales (Idealista, Fotocasa, etc.) se implementará en la siguiente fase.', {
                icon: '🏗️',
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            <Building2 size={16} />
            Portales
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* ─── Drop Zone ────────────────────────────────────────────────────────── */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging
            ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5'
            : 'border-[var(--border-color)] bg-[var(--bg-color)]'
        }`}
      >
        <Upload size={32} className="mx-auto mb-2 text-[var(--text-muted)]" />
        <p className="text-sm text-[var(--text-muted)]">
          Arrastra y suelta archivos aquí, o{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[var(--primary-color)] hover:underline"
          >
            selecciona archivos
          </button>
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Imágenes, videos y PDFs. Máx. 50 archivos, 100 MB cada uno.
        </p>
      </div>

      {/* ─── Contenido ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <SkeletonCard key={i} viewMode={viewMode} />
          ))}
        </div>
      ) : filteredMedia.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSetCover={setAsCover}
              onTogglePortal={togglePortal}
              onOpenPreview={() => setPreviewIndex(filteredMedia.findIndex((m) => m.id === item.id))}
              playingVideo={playingVideo}
              setPlayingVideo={setPlayingVideo}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <MediaListItem
              key={item.id}
              item={item}
              onDelete={(id) => deleteMutation.mutate(id)}
              onSetCover={setAsCover}
              onTogglePortal={togglePortal}
            />
          ))}
        </div>
      )}

      {/* ─── Modal de Subida ──────────────────────────────────────────────────── */}
      {showModal && (
        <UploadModal
          mode={modalMode}
          setMode={setModalMode}
          title={title}
          setTitle={setTitle}
          urlInput={urlInput}
          setUrlInput={setUrlInput}
          selectedFiles={selectedFiles}
          setSelectedFiles={setSelectedFiles}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          onSubmit={handleSubmitUpload}
          onClose={() => {
            setShowModal(false);
            setSelectedFiles([]);
            setUrlInput('');
            setTitle('');
          }}
          isLoading={uploadMutation.isPending || uploadFromUrlMutation.isPending}
        />
      )}

      {/* ─── Lightbox / Vista previa ──────────────────────────────────────────── */}
      {previewIndex !== null && filteredMedia[previewIndex] && (
        <ImagePreview
          media={filteredMedia}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNext={() => setPreviewIndex((prev) => (prev + 1) % filteredMedia.length)}
          onPrev={() => setPreviewIndex((prev) => (prev - 1 + filteredMedia.length) % filteredMedia.length)}
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────────

function MediaCard({ item, onDelete, onSetCover, onTogglePortal, onOpenPreview, playingVideo, setPlayingVideo }) {
  const [isHovered, setIsHovered] = useState(false);
  const isVideo = item.type === 'VIDEO';
  const isImage = ['PHOTO', 'FLOOR_PLAN'].includes(item.type);
  const isPdf = item.mimeType === 'application/pdf';
  const typeConfig = MEDIA_TYPES[item.type] || MEDIA_TYPES.ALL;

  const handleVideoClick = () => {
    if (playingVideo === item.id) {
      setPlayingVideo(null);
    } else {
      setPlayingVideo(item.id);
    }
  };

  return (
    <div
      className="group relative bg-[var(--bg-color)] rounded-lg overflow-hidden border border-[var(--border-color)] hover:shadow-lg transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Preview */}
      <div className="aspect-square relative bg-gray-100">
        {isImage && (
          <button
            onClick={onOpenPreview}
            className="block w-full h-full p-0 border-0 bg-transparent"
          >
            <img
              src={item.url}
              alt={item.originalName}
              className="w-full h-full object-cover cursor-pointer"
              loading="lazy"
            />
          </button>
        )}

        {isVideo && (
          <>
            {playingVideo === item.id ? (
              <video
                src={item.url}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <video src={item.url} className="w-full h-full object-cover" />
                <button
                  onClick={handleVideoClick}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <Play size={40} className="text-white" />
                </button>
              </>
            )}
          </>
        )}

        {isPdf && (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <FileText size={48} className="text-red-500" />
          </div>
        )}

        {/* Badge tipo */}
        <div
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${typeConfig.color}`}
        >
          {typeConfig.label}
        </div>

        {/* Badge portada */}
        {item.isCover && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white bg-yellow-500 flex items-center gap-1">
            <Star size={10} fill="currentColor" />
            Portada
          </div>
        )}

        {/* Badges portales */}
        {item.portalSync && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {PORTALS.map((portal) => {
              const sync = item.portalSync?.[portal.id];
              if (!sync?.enabled) return null;
              return (
                <span
                  key={portal.id}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-medium text-white ${portal.color}`}
                >
                  {portal.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Overlay de acciones */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 p-4">
            {(isImage || isVideo) && (
              <button
                onClick={onOpenPreview}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                <ZoomIn size={14} />
                Vista previa
              </button>
            )}
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              <ExternalLink size={14} />
              Ver original
            </a>
            {!item.isCover && (
              <button
                onClick={() => onSetCover(item.id)}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-white rounded-full text-sm font-medium hover:bg-yellow-600 transition-colors"
              >
                <Crown size={14} />
                Portada
              </button>
            )}
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-[var(--text-main)] truncate">
          {item.title || item.originalName}
        </p>
        {item.description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{item.description}</p>
        )}

        {/* Botones de portal */}
        <div className="flex gap-1 mt-2">
          {PORTALS.map((portal) => {
            const sync = item.portalSync?.[portal.id];
            const isEnabled = sync?.enabled || false;
            return (
              <button
                key={portal.id}
                onClick={() => onTogglePortal(item.id, portal.id, isEnabled)}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  isEnabled
                    ? `${portal.color} text-white`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {portal.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MediaListItem({ item, onDelete, onSetCover, onTogglePortal }) {
  const isVideo = item.type === 'VIDEO';
  const isImage = ['PHOTO', 'FLOOR_PLAN'].includes(item.type);
  const isPdf = item.mimeType === 'application/pdf';
  const typeConfig = MEDIA_TYPES[item.type] || MEDIA_TYPES.ALL;

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--bg-color)] rounded-lg border border-[var(--border-color)] hover:shadow-sm transition-all">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {isImage && <img src={item.url} alt="" className="w-full h-full object-cover" />}
        {isVideo && (
          <div className="w-full h-full bg-purple-100 flex items-center justify-center">
            <Video size={24} className="text-purple-500" />
          </div>
        )}
        {isPdf && (
          <div className="w-full h-full bg-red-100 flex items-center justify-center">
            <FileText size={24} className="text-red-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
          {item.isCover && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white bg-yellow-500 flex items-center gap-0.5">
              <Star size={8} fill="currentColor" />
              Portada
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-[var(--text-main)] truncate mt-1">
          {item.title || item.originalName}
        </p>
        <p className="text-xs text-[var(--text-muted)]">{(item.fileSize / 1024 / 1024).toFixed(2)} MB</p>
      </div>

      {/* Portales */}
      <div className="flex gap-1">
        {PORTALS.map((portal) => {
          const sync = item.portalSync?.[portal.id];
          const isEnabled = sync?.enabled || false;
          return (
            <button
              key={portal.id}
              onClick={() => onTogglePortal(item.id, portal.id, isEnabled)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                isEnabled ? `${portal.color} text-white` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {portal.label}
            </button>
          );
        })}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ExternalLink size={16} />
        </a>
        {!item.isCover && (
          <button
            onClick={() => onSetCover(item.id)}
            className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
          >
            <Crown size={16} />
          </button>
        )}
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function SkeletonCard({ viewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-3 p-3 bg-[var(--bg-color)] rounded-lg border border-[var(--border-color)] animate-pulse">
        <div className="w-16 h-16 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-[var(--bg-color)] rounded-lg overflow-hidden border border-[var(--border-color)] animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <ImageIcon size={48} className="mx-auto mb-4 text-gray-300" />
      <h3 className="text-lg font-medium text-[var(--text-main)] mb-1">Sin contenido multimedia</h3>
      <p className="text-sm text-[var(--text-muted)]">
        Este expediente aún no tiene fotos, videos u otros archivos multimedia.
      </p>
      <p className="text-sm text-[var(--text-muted)] mt-1">
        Arrastra archivos arriba o usa el botón "Subir" para añadir contenido.
      </p>
    </div>
  );
}

// ─── Modal de Subida ───────────────────────────────────────────────────────────

function UploadModal({
  mode,
  setMode,
  title,
  setTitle,
  urlInput,
  setUrlInput,
  selectedFiles,
  setSelectedFiles,
  fileInputRef,
  handleFileSelect,
  onSubmit,
  onClose,
  isLoading,
}) {
  const handleLocalFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-[var(--bg-color)] rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Subir multimedia</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selector de modo */}
        <div className="flex border-b border-[var(--border-color)]">
          <button
            onClick={() => setMode('local')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'local'
                ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FolderOpen size={18} />
            Desde archivos
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'url'
                ? 'bg-[var(--primary-color)]/10 text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Link size={18} />
            Desde URL
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Campo de título (común a ambos modos) */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
              Título <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Foto de la fachada principal"
              className="input-base w-full"
            />
          </div>

          {mode === 'local' ? (
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                Archivos
              </label>

              {selectedFiles.length > 0 ? (
                <div className="bg-[var(--sidebar-bg)] rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      {file.type.startsWith('image/') && <ImageIcon size={16} className="text-emerald-500" />}
                      {file.type.startsWith('video/') && <Video size={16} className="text-purple-500" />}
                      {file.type === 'application/pdf' && <FileText size={16} className="text-red-500" />}
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Limpiar selección
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-6 text-center">
                  <FolderOpen size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500 mb-3">Selecciona archivos de tu dispositivo</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    Elegir archivos
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,application/pdf"
                    className="hidden"
                    onChange={handleLocalFileSelect}
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1">
                URL de la imagen
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="input-base flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Introduce la URL completa de una imagen (JPG, PNG, WebP...)
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border-color)] bg-gray-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={
              isLoading ||
              (mode === 'local' && selectedFiles.length === 0) ||
              (mode === 'url' && !urlInput.trim())
            }
            className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'local' ? `Subir ${selectedFiles.length || ''} archivo${selectedFiles.length !== 1 ? 's' : ''}` : 'Subir desde URL'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de Vista Previa (Lightbox) ─────────────────────────────────────────

function ImagePreview({ media, currentIndex, onClose, onNext, onPrev }) {
  const currentItem = media[currentIndex];
  const isImage = ['PHOTO', 'FLOOR_PLAN'].includes(currentItem?.type);
  const isVideo = currentItem?.type === 'VIDEO';
  const isPdf = currentItem?.mimeType === 'application/pdf';

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Botón cerrar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
      >
        <X size={24} />
      </button>

      {/* Botón anterior */}
      {media.length > 1 && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Botón siguiente */}
      {media.length > 1 && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Contenido */}
      <div className="max-w-[90vw] max-h-[85vh] flex flex-col items-center">
        {/* Imagen/Video/PDF */}
        <div className="relative max-w-full max-h-[75vh]">
          {isImage && (
            <img
              src={currentItem.url}
              alt={currentItem.originalName}
              className="max-w-full max-h-[75vh] object-contain"
            />
          )}
          {isVideo && (
            <video
              src={currentItem.url}
              controls
              autoPlay
              className="max-w-full max-h-[75vh]"
            />
          )}
          {isPdf && (
            <iframe
              src={currentItem.url}
              title={currentItem.originalName}
              className="w-[80vw] h-[70vh] bg-white"
            />
          )}
        </div>

        {/* Info bar */}
        <div className="mt-4 text-center text-white">
          <p className="text-lg font-medium">{currentItem.title || currentItem.originalName}</p>
          <p className="text-sm text-gray-400 mt-1">
            {currentIndex + 1} de {media.length} · {(currentItem.fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <a
              href={currentItem.url}
              download
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20 transition-colors"
            >
              <Download size={16} />
              Descargar
            </a>
            <a
              href={currentItem.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20 transition-colors"
            >
              <ExternalLink size={16} />
              Abrir en nueva pestaña
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
