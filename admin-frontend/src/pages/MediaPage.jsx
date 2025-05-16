// admin-frontend/src/pages/MediaPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { UploadCloud, Image as ImageIcon, Video as VideoIcon, Globe as WebpageIcon, Trash2, AlertCircle, CheckCircle, Loader2, Link2 } from 'lucide-react'; // Añadido WebpageIcon, Link2

const MediaPage = () => {
  const [uploadType, setUploadType] = useState('file'); // 'file' o 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [contentUrl, setContentUrl] = useState('');
  const [webpageTitle, setWebpageTitle] = useState('');
  const [preview, setPreview] = useState(null);
  const [fileMediaType, setFileMediaType] = useState(''); // 'image' o 'video' para previsualización de archivo
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
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

  const resetUploadForm = () => {
    setSelectedFile(null);
    setContentUrl('');
    setWebpageTitle('');
    setPreview(null);
    setFileMediaType('');
    setUploadProgress(0);
    // No limpiar error/success aquí para que el usuario vea el resultado de la subida anterior
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      let detectedType = '';
      if (file.type.startsWith('image/')) {
        detectedType = 'image';
      } else if (file.type.startsWith('video/')) {
        detectedType = 'video';
      } else {
        setError('Tipo de archivo no soportado. Por favor, selecciona una imagen o un video.');
        resetUploadForm();
        return;
      }
      
      if (file.size > 50 * 1024 * 1024) { // Límite 50MB
          setError('El archivo es demasiado grande. El límite es de 50MB.');
          resetUploadForm();
          return;
      }

      setSelectedFile(file);
      setFileMediaType(detectedType);
      setError('');
      setSuccessMessage('');

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      resetUploadForm();
    }
  };

  const handleUpload = async () => {
    setError('');
    setSuccessMessage('');

    if (uploadType === 'file') {
      if (!selectedFile) {
        setError('Por favor, selecciona un archivo para subir.');
        return;
      }
      setIsUploading(true);
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('mediaFile', selectedFile);

      try {
        const response = await api.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          },
        });
        setSuccessMessage(`¡Archivo "${response.data.media.originalName}" subido exitosamente!`);
        resetUploadForm();
        fetchMediaItems();
      } catch (err) {
        console.error("Error al subir el archivo:", err.response ? err.response.data : err);
        setError(err.response?.data?.message || 'Error al subir el archivo.');
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
      }
    } else if (uploadType === 'url') {
      if (!contentUrl) {
        setError('Por favor, ingresa la URL de la página web.');
        return;
      }
      // Validación simple de URL en el frontend
      try {
        new URL(contentUrl);
      } catch (_) {
        setError('La URL proporcionada no parece válida. Asegúrate de que incluya http:// o https://');
        return;
      }
      setIsUploading(true); // Usar el mismo estado para indicar carga
      const payload = {
        contentUrl: contentUrl,
        webpageTitle: webpageTitle || contentUrl, // Si el título está vacío, usa la URL
        mediaTypeInput: 'webpage' // Para que el backend sepa qué procesar
      };
      try {
        const response = await api.post('/media/upload', payload);
        setSuccessMessage(`¡Página web "${response.data.media.originalName}" registrada exitosamente!`);
        resetUploadForm();
        fetchMediaItems();
      } catch (err) {
        console.error("Error al registrar la URL:", err.response ? err.response.data : err);
        setError(err.response?.data?.message || 'Error al registrar la URL.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteMedia = async (mediaId, mediaName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${mediaName}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await api.delete(`/media/${mediaId}`);
      setSuccessMessage(`"${mediaName}" eliminado exitosamente.`);
      fetchMediaItems();
      setError('');
    } catch (err) {
      console.error("Error al eliminar el contenido:", err);
      setError(err.response?.data?.message || 'Error al eliminar el contenido.');
      setSuccessMessage('');
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return 'N/A'; // Para páginas web o si el tamaño es 0
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  const renderMediaIcon = (mediaType) => {
    if (mediaType === 'image') return <ImageIcon size={48} className="text-blue-500" />;
    if (mediaType === 'video') return <VideoIcon size={48} className="text-purple-500" />;
    if (mediaType === 'webpage') return <WebpageIcon size={48} className="text-green-500" />;
    return <ImageIcon size={48} className="text-slate-400" />; // Icono por defecto
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-3">Añadir Nuevo Contenido Multimedia</h2>
        
        {error && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center" role="alert">
            <AlertCircle size={20} className="mr-3 text-red-500" /> <p className="text-sm">{error}</p>
          </div>
        )}
        {successMessage && !error && (
          <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md flex items-center" role="alert">
            <CheckCircle size={20} className="mr-3 text-green-500" /> <p className="text-sm">{successMessage}</p>
          </div>
        )}

        {/* Selector de Tipo de Subida */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de contenido a añadir:</label>
          <div className="flex space-x-4">
            <button 
              onClick={() => { setUploadType('file'); resetUploadForm(); setError(''); setSuccessMessage(''); }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${uploadType === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'}`}
            >
              <UploadCloud size={16} className="inline mr-2"/> Subir Archivo
            </button>
            <button 
              onClick={() => { setUploadType('url'); resetUploadForm(); setError(''); setSuccessMessage(''); }}
              className={`px-4 py-2 rounded-md text-sm font-medium border ${uploadType === 'url' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'}`}
            >
              <Link2 size={16} className="inline mr-2"/> Registrar URL de Página Web
            </button>
          </div>
        </div>

        {uploadType === 'file' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-slate-600 mb-1">
                Seleccionar archivo (imagen o video, máx. 50MB)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                  <div className="flex text-sm text-slate-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Sube un archivo</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,video/*" />
                    </label>
                    <p className="pl-1">o arrástralo y suéltalo aquí</p>
                  </div>
                  <p className="text-xs text-slate-500">PNG, JPG, GIF, MP4, MOV, etc. (máx. 50MB)</p>
                </div>
              </div>
            </div>
            {preview && selectedFile && (
              <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50">
                <h3 className="text-md font-medium text-slate-700 mb-2">Previsualización:</h3>
                {fileMediaType === 'image' && <img src={preview} alt="Previsualización" className="max-h-60 w-auto rounded-md shadow-sm mx-auto" />}
                {fileMediaType === 'video' && <video src={preview} controls className="max-h-60 w-auto rounded-md shadow-sm mx-auto">Tu navegador no soporta video.</video>}
                <p className="text-xs text-slate-500 mt-2 text-center">{selectedFile.name} ({formatBytes(selectedFile.size)})</p>
              </div>
            )}
            {isUploading && (
              <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                <p className="text-xs text-center text-slate-600 mt-1">{uploadProgress}% completado</p>
              </div>
            )}
          </div>
        )}

        {uploadType === 'url' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="contentUrl" className="block text-sm font-medium text-slate-700">URL de la Página Web</label>
              <input
                type="url"
                id="contentUrl"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                required={uploadType === 'url'}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="https://ejemplo.com/pagina-interesante"
              />
            </div>
            <div>
              <label htmlFor="webpageTitle" className="block text-sm font-medium text-slate-700">Título para la Página Web (Opcional)</label>
              <input
                type="text"
                id="webpageTitle"
                value={webpageTitle}
                onChange={(e) => setWebpageTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ej: Noticias en Vivo - Ejemplo.com"
              />
               <p className="mt-1 text-xs text-slate-500">Si se deja vacío, se usará la URL como título.</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={(uploadType === 'file' && !selectedFile) || (uploadType === 'url' && !contentUrl) || isUploading}
          className="mt-6 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? <><Loader2 className="animate-spin h-5 w-5 mr-3" />Procesando...</> : 
            (uploadType === 'file' ? <><UploadCloud size={20} className="mr-2" />Subir Archivo Seleccionado</> : <><Link2 size={20} className="mr-2" />Registrar URL</>)
          }
        </button>
      </div>

      {/* Sección de Listado de Contenido Multimedia */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-3">Contenido Multimedia Registrado</h2>
        {isLoadingMedia ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /><p className="ml-3 text-slate-600">Cargando...</p></div>
        ) : mediaItems.length === 0 ? (
          <p className="text-slate-500 text-center py-5">No hay contenido multimedia registrado todavía.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mediaItems.map((item) => (
              <div key={item._id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-w-16 aspect-h-9 bg-slate-100 flex items-center justify-center">
                  {item.mediaType === 'image' ? (
                    <img src={item.url} alt={item.originalName} className="object-cover w-full h-full" onError={(e) => e.target.src = 'https://placehold.co/300x200/EEE/31343C?text=Error'} />
                  ) : item.mediaType === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2">
                       <VideoIcon size={48} className="mb-2 text-purple-500" />
                       <p className="text-xs text-center">Video: <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver</a></p>
                    </div>
                  ) : item.mediaType === 'webpage' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 p-2">
                       <WebpageIcon size={48} className="mb-2 text-green-500" />
                       <p className="text-xs text-center">Página Web</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500"><ImageIcon size={48} /></div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <p className="text-sm font-medium text-slate-800 truncate" title={item.originalName}>{item.originalName}</p>
                  <p className="text-xs text-slate-500">{item.mediaType === 'webpage' ? 'Página Web' : formatBytes(item.size)} - {new Date(item.createdAt).toLocaleDateString()}</p>
                  {item.mediaType === 'webpage' && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate" title={item.url}>Visitar: {item.url}</a>}
                  <button
                    onClick={() => handleDeleteMedia(item._id, item.originalName)}
                    className="mt-auto pt-2 w-full flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
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
