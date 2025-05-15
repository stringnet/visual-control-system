// admin-frontend/src/pages/MediaPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api'; // Nuestro servicio API configurado con Axios
import { UploadCloud, Image as ImageIcon, Video as VideoIcon, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const MediaPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mediaType, setMediaType] = useState(''); // 'image' o 'video'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Progreso de 0 a 100
  
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(true);
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchMediaItems = useCallback(async () => {
    setIsLoadingMedia(true);
    try {
      const response = await api.get('/media');
      setMediaItems(response.data);
      setError('');
    } catch (err) {
      console.error("Error al cargar la multimedia:", err);
      setError('No se pudo cargar la lista de multimedia. Inténtalo de nuevo más tarde.');
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    fetchMediaItems();
  }, [fetchMediaItems]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setMediaType('image');
      } else if (file.type.startsWith('video/')) {
        setMediaType('video');
      } else {
        setError('Tipo de archivo no soportado. Por favor, selecciona una imagen o un video.');
        setSelectedFile(null);
        setPreview(null);
        setMediaType('');
        return;
      }
      
      // Límite de tamaño (ej. 50MB)
      if (file.size > 50 * 1024 * 1024) {
          setError('El archivo es demasiado grande. El límite es de 50MB.');
          setSelectedFile(null);
          setPreview(null);
          setMediaType('');
          return;
      }

      setSelectedFile(file);
      setError('');
      setSuccessMessage('');

      // Crear previsualización
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreview(null);
      setMediaType('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor, selecciona un archivo para subir.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccessMessage('');

    const formData = new FormData();
    formData.append('mediaFile', selectedFile); // 'mediaFile' debe coincidir con el nombre esperado en el backend (Multer)

    try {
      const response = await api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
      setSuccessMessage(`¡${response.data.media.originalName} subido exitosamente!`);
      setSelectedFile(null);
      setPreview(null);
      setMediaType('');
      setUploadProgress(0);
      fetchMediaItems(); // Recargar la lista de media
    } catch (err) {
      console.error("Error al subir el archivo:", err.response ? err.response.data : err);
      setError(err.response?.data?.message || 'Error al subir el archivo. Inténtalo de nuevo.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId, mediaName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${mediaName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await api.delete(`/media/${mediaId}`);
      setSuccessMessage(`"${mediaName}" eliminado exitosamente.`);
      fetchMediaItems(); // Recargar la lista
      setError('');
    } catch (err) {
      console.error("Error al eliminar el archivo:", err);
      setError(err.response?.data?.message || 'Error al eliminar el archivo.');
      setSuccessMessage('');
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-8">
      {/* Sección de Subida de Archivos */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-3">Subir Nuevo Archivo Multimedia</h2>
        
        {error && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center" role="alert">
            <AlertCircle size={20} className="mr-3 text-red-500" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        {successMessage && !error && ( // Mostrar solo si no hay error activo
          <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md flex items-center" role="alert">
            <CheckCircle size={20} className="mr-3 text-green-500" />
            <p className="text-sm">{successMessage}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-slate-600 mb-1">
              Seleccionar archivo (imagen o video, máx. 50MB)
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                <div className="flex text-sm text-slate-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Sube un archivo</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,video/*" />
                  </label>
                  <p className="pl-1">o arrástralo y suéltalo aquí</p>
                </div>
                <p className="text-xs text-slate-500">PNG, JPG, GIF hasta 10MB. MP4, MOV hasta 50MB.</p>
              </div>
            </div>
          </div>

          {preview && (
            <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50">
              <h3 className="text-md font-medium text-slate-700 mb-2">Previsualización:</h3>
              {mediaType === 'image' && (
                <img src={preview} alt="Previsualización" className="max-h-60 w-auto rounded-md shadow-sm mx-auto" />
              )}
              {mediaType === 'video' && (
                <video src={preview} controls className="max-h-60 w-auto rounded-md shadow-sm mx-auto">
                  Tu navegador no soporta la etiqueta de video.
                </video>
              )}
              <p className="text-xs text-slate-500 mt-2 text-center">{selectedFile?.name} ({formatBytes(selectedFile?.size || 0)})</p>
            </div>
          )}

          {isUploading && (
            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
              <p className="text-xs text-center text-slate-600 mt-1">{uploadProgress}% completado</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-3" />
                Subiendo...
              </>
            ) : (
              <>
                <UploadCloud size={20} className="mr-2" />
                Subir Archivo Seleccionado
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sección de Listado de Archivos Multimedia */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-3">Archivos Multimedia Subidos</h2>
        {isLoadingMedia ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
            <p className="ml-3 text-slate-600">Cargando multimedia...</p>
          </div>
        ) : mediaItems.length === 0 ? (
          <p className="text-slate-500 text-center py-5">No hay archivos multimedia subidos todavía.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mediaItems.map((item) => (
              <div key={item._id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-w-16 aspect-h-9 bg-slate-100 flex items-center justify-center">
                  {item.mediaType === 'image' ? (
                    <img src={item.url} alt={item.originalName} className="object-cover w-full h-full" onError={(e) => e.target.src = 'https://placehold.co/600x400/EEE/31343C?text=Error+Imagen'} />
                  ) : item.mediaType === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2">
                       <VideoIcon size={48} className="mb-2" />
                       <p className="text-xs text-center">Previsualización de video no disponible aquí. <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver video</a></p>
                    </div>
                    // O podrías intentar un <video> pequeño, pero puede ser pesado para una lista
                    // <video src={item.url} controls className="w-full h-auto max-h-32" preload="metadata"></video>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <ImageIcon size={48} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-slate-800 truncate" title={item.originalName}>{item.originalName}</p>
                  <p className="text-xs text-slate-500">{formatBytes(item.size)} - {new Date(item.createdAt).toLocaleDateString()}</p>
                  <button
                    onClick={() => handleDeleteMedia(item._id, item.originalName)}
                    className="mt-3 w-full flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPage;
