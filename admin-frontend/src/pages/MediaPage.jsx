// admin-frontend/src/pages/MediaPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
    UploadCloud, Image as ImageIcon, Video as VideoIcon, Globe as WebpageIcon, 
    Trash2, AlertCircle, CheckCircle, Loader2, Link2, Palette, Music, FileImage 
} from 'lucide-react'; // Añadidos Palette, Music, FileImage

const MediaPage = () => {
  const [uploadType, setUploadType] = useState('file'); // 'file', 'url', o 'pixelmap'
  // Estados para subida de archivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fileMediaType, setFileMediaType] = useState('');
  // Estados para URL de página web
  const [contentUrl, setContentUrl] = useState('');
  const [webpageTitle, setWebpageTitle] = useState('');
  // Estados para Pixel Map
  const [pixelMapName, setPixelMapName] = useState('');
  const [pixelMapColors, setPixelMapColors] = useState(['#FF0000', '#00FF00', '#0000FF']); // Colores por defecto
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  
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
    setPreview(null);
    setFileMediaType('');
    setContentUrl('');
    setWebpageTitle('');
    setPixelMapName('');
    setPixelMapColors(['#FF0000', '#00FF00', '#0000FF']);
    setLogoFile(null);
    setLogoPreview(null);
    setAudioFile(null);
    setUploadProgress(0);
    // No limpiar error/success aquí para que el usuario vea el resultado
  };

  const handleMainFileChange = (event) => {
    // Para el tipo 'file' (imagen/video)
    const file = event.target.files[0];
    if (file) {
      let detectedType = '';
      if (file.type.startsWith('image/')) detectedType = 'image';
      else if (file.type.startsWith('video/')) detectedType = 'video';
      else {
        setError('Tipo de archivo no soportado. Por favor, selecciona una imagen o un video.');
        resetUploadForm(); return;
      }
      if (file.size > 50 * 1024 * 1024) {
          setError('El archivo es demasiado grande. El límite es de 50MB.');
          resetUploadForm(); return;
      }
      setSelectedFile(file);
      setFileMediaType(detectedType);
      setError(''); setSuccessMessage('');
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else resetUploadForm();
  };

  const handleLogoFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/png')) {
        setError('El logo debe ser un archivo PNG para asegurar transparencia.');
        setLogoFile(null); setLogoPreview(null); return;
      }
      if (file.size > 2 * 1024 * 1024) { // Límite para logo, ej. 2MB
          setError('El archivo del logo es demasiado grande. Límite 2MB.');
          setLogoFile(null); setLogoPreview(null); return;
      }
      setLogoFile(file);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    } else { setLogoFile(null); setLogoPreview(null); }
  };

  const handleAudioFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Por favor, selecciona un archivo de audio válido (ej. MP3, WAV, OGG).');
        setAudioFile(null); return;
      }
      if (file.size > 10 * 1024 * 1024) { // Límite para audio, ej. 10MB
          setError('El archivo de audio es demasiado grande. Límite 10MB.');
          setAudioFile(null); return;
      }
      setAudioFile(file);
      setError('');
    } else setAudioFile(null);
  };

  const handleAddColor = () => {
    if (pixelMapColors.length < 10) { // Limitar a 10 colores por ejemplo
        setPixelMapColors([...pixelMapColors, '#FFFFFF']);
    } else {
        setError("Se pueden añadir un máximo de 10 colores.");
    }
  };
  const handleColorChange = (index, newColor) => {
    const updatedColors = [...pixelMapColors];
    updatedColors[index] = newColor;
    setPixelMapColors(updatedColors);
  };
  const handleRemoveColor = (index) => {
    if (pixelMapColors.length > 1) { // Mantener al menos un color
        setPixelMapColors(pixelMapColors.filter((_, i) => i !== index));
    } else {
        setError("Debe haber al menos un color.");
    }
  };

  const handleUpload = async () => {
    setError(''); setSuccessMessage('');
    setIsUploading(true); setUploadProgress(0);
    
    const formData = new FormData();
    let endpoint = '/media/upload'; // Endpoint general

    if (uploadType === 'file') {
      if (!selectedFile) { setError('Por favor, selecciona un archivo.'); setIsUploading(false); return; }
      formData.append('mediaFile', selectedFile);
    } else if (uploadType === 'url') {
      if (!contentUrl) { setError('Por favor, ingresa la URL.'); setIsUploading(false); return; }
      try { new URL(contentUrl); } catch (_) { setError('URL no válida.'); setIsUploading(false); return; }
      formData.append('contentUrl', contentUrl);
      formData.append('webpageTitle', webpageTitle || contentUrl);
      formData.append('mediaTypeInput', 'webpage');
    } else if (uploadType === 'pixelmap') {
      if (!pixelMapName) { setError('Nombre del Pixel Map es requerido.'); setIsUploading(false); return; }
      formData.append('pixelMapName', pixelMapName);
      formData.append('pixelMapColors', JSON.stringify(pixelMapColors)); // Enviar colores como string JSON
      formData.append('mediaTypeInput', 'pixelmap');
      if (logoFile) formData.append('logoFile', logoFile);
      if (audioFile) formData.append('audioFile', audioFile);
    }

    try {
      const response = await api.post(endpoint, formData, {
        headers: { 
          // Axios ajustará Content-Type a multipart/form-data automáticamente si formData contiene archivos
          // Si solo enviamos JSON (como en el caso de URL sin archivos), se podría mantener application/json
          // Pero como pixelmap puede tener archivos, es mejor dejar que Axios decida o forzar multipart
          ...( (uploadType === 'file' || (uploadType === 'pixelmap' && (logoFile || audioFile))) && {'Content-Type': 'multipart/form-data'} )
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });
      setSuccessMessage(`¡Contenido "${response.data.media.originalName}" procesado exitosamente!`);
      resetUploadForm();
      fetchMediaItems();
    } catch (err) {
      console.error("Error en la operación:", err.response ? err.response.data : err);
      setError(err.response?.data?.message || 'Error en la operación.');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId, mediaName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${mediaName}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/media/${mediaId}`);
      setSuccessMessage(`"${mediaName}" eliminado exitosamente.`);
      fetchMediaItems(); setError('');
    } catch (err) {
      console.error("Error al eliminar:", err);
      setError(err.response?.data?.message || 'Error al eliminar.'); setSuccessMessage('');
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes && bytes !== 0) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const renderMediaIcon = (mediaType) => {
    if (mediaType === 'image') return <ImageIcon size={48} className="text-blue-500" />;
    if (mediaType === 'video') return <VideoIcon size={48} className="text-purple-500" />;
    if (mediaType === 'webpage') return <WebpageIcon size={48} className="text-green-500" />;
    if (mediaType === 'pixelmap') return <Palette size={48} className="text-orange-500" />;
    return <ImageIcon size={48} className="text-slate-400" />;
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-3">Añadir Nuevo Contenido Multimedia</h2>
        
        {error && <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center" role="alert"><AlertCircle size={20} className="mr-3 text-red-500" /> <p className="text-sm">{error}</p></div>}
        {successMessage && !error && <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md flex items-center" role="alert"><CheckCircle size={20} className="mr-3 text-green-500" /> <p className="text-sm">{successMessage}</p></div>}

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de contenido a añadir:</label>
          <div className="flex flex-wrap gap-2">
            {/* Botones para seleccionar tipo de contenido */}
            <button onClick={() => { setUploadType('file'); resetUploadForm(); setError(''); setSuccessMessage(''); }} className={`px-4 py-2 rounded-md text-sm font-medium border flex items-center ${uploadType === 'file' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'}`}><UploadCloud size={16} className="mr-2"/>Subir Archivo</button>
            <button onClick={() => { setUploadType('url'); resetUploadForm(); setError(''); setSuccessMessage(''); }} className={`px-4 py-2 rounded-md text-sm font-medium border flex items-center ${uploadType === 'url' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'}`}><Link2 size={16} className="mr-2"/>Registrar URL Web</button>
            <button onClick={() => { setUploadType('pixelmap'); resetUploadForm(); setError(''); setSuccessMessage(''); }} className={`px-4 py-2 rounded-md text-sm font-medium border flex items-center ${uploadType === 'pixelmap' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'}`}><Palette size={16} className="mr-2"/>Crear Pixel Map</button>
          </div>
        </div>

        {/* Formulario para Subir Archivo (Imagen/Video) */}
        {uploadType === 'file' && ( /* ... Contenido del formulario de archivo sin cambios ... */ 
            <div className="space-y-4">
                <div>
                    <label htmlFor="file-upload" className="block text-sm font-medium text-slate-600 mb-1">Seleccionar archivo (imagen o video, máx. 50MB)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
                        <div className="space-y-1 text-center"><UploadCloud className="mx-auto h-12 w-12 text-slate-400" />
                            <div className="flex text-sm text-slate-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"><span>Sube un archivo</span><input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleMainFileChange} accept="image/*,video/*" /></label>
                                <p className="pl-1">o arrástralo y suéltalo aquí</p>
                            </div>
                            <p className="text-xs text-slate-500">PNG, JPG, GIF, MP4, MOV, etc. (máx. 50MB)</p>
                        </div>
                    </div>
                </div>
                {preview && selectedFile && (<div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50"><h3 className="text-md font-medium text-slate-700 mb-2">Previsualización:</h3>{fileMediaType === 'image' && <img src={preview} alt="Previsualización" className="max-h-60 w-auto rounded-md shadow-sm mx-auto" />}{fileMediaType === 'video' && <video src={preview} controls className="max-h-60 w-auto rounded-md shadow-sm mx-auto">Tu navegador no soporta video.</video>}<p className="text-xs text-slate-500 mt-2 text-center">{selectedFile.name} ({formatBytes(selectedFile.size)})</p></div>)}
                {isUploading && (<div className="w-full bg-slate-200 rounded-full h-2.5 mt-4"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div><p className="text-xs text-center text-slate-600 mt-1">{uploadProgress}% completado</p></div>)}
            </div>
        )}

        {/* Formulario para Registrar URL de Página Web */}
        {uploadType === 'url' && ( /* ... Contenido del formulario de URL sin cambios ... */ 
            <div className="space-y-4">
                <div><label htmlFor="contentUrl" className="block text-sm font-medium text-slate-700">URL de la Página Web</label><input type="url" id="contentUrl" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} required={uploadType === 'url'} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="https://ejemplo.com/pagina-interesante" /></div>
                <div><label htmlFor="webpageTitle" className="block text-sm font-medium text-slate-700">Título para la Página Web (Opcional)</label><input type="text" id="webpageTitle" value={webpageTitle} onChange={(e) => setWebpageTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Ej: Noticias en Vivo - Ejemplo.com" /><p className="mt-1 text-xs text-slate-500">Si se deja vacío, se usará la URL como título.</p></div>
            </div>
        )}

        {/* Formulario para Crear Pixel Map */}
        {uploadType === 'pixelmap' && (
          <div className="space-y-6">
            <div>
              <label htmlFor="pixelMapName" className="block text-sm font-medium text-slate-700">Nombre del Pixel Map</label>
              <input type="text" id="pixelMapName" value={pixelMapName} onChange={(e) => setPixelMapName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Ej: Fiesta Neón Colores"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paleta de Colores</label>
              {pixelMapColors.map((color, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input type="color" value={color} onChange={(e) => handleColorChange(index, e.target.value)} className="w-10 h-10 p-0 border-none rounded cursor-pointer"/>
                  <input type="text" value={color} onChange={(e) => handleColorChange(index, e.target.value)} className="w-28 px-2 py-1 border border-slate-300 rounded-md shadow-sm text-sm" placeholder="#RRGGBB"/>
                  {pixelMapColors.length > 1 && (
                    <button type="button" onClick={() => handleRemoveColor(index)} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddColor} className="mt-1 text-sm text-blue-600 hover:text-blue-800 flex items-center"><PlusCircle size={16} className="mr-1"/>Añadir Color</button>
            </div>

            <div>
              <label htmlFor="logoFile" className="block text-sm font-medium text-slate-700">Logo (Opcional, PNG con transparencia, máx. 2MB)</label>
              <input type="file" id="logoFile" onChange={handleLogoFileChange} accept="image/png" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
              {logoPreview && <img src={logoPreview} alt="Previsualización del Logo" className="mt-2 max-h-20 w-auto rounded border p-1"/>}
            </div>

            <div>
              <label htmlFor="audioFile" className="block text-sm font-medium text-slate-700">Archivo de Audio (Opcional, MP3/WAV/OGG, máx. 10MB)</label>
              <input type="file" id="audioFile" onChange={handleAudioFileChange} accept="audio/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
              {audioFile && <p className="text-xs text-slate-600 mt-1">Archivo de audio seleccionado: {audioFile.name}</p>}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={
            (uploadType === 'file' && !selectedFile) || 
            (uploadType === 'url' && !contentUrl) ||
            (uploadType === 'pixelmap' && !pixelMapName) || 
            isUploading
          }
          className="mt-6 w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? <><Loader2 className="animate-spin h-5 w-5 mr-3" />Procesando...</> : 
            (uploadType === 'file' ? <><UploadCloud size={20} className="mr-2" />Subir Archivo</> : 
            (uploadType === 'url' ? <><Link2 size={20} className="mr-2" />Registrar URL</> : 
            <><Palette size={20} className="mr-2" />Crear Pixel Map</>))
          }
        </button>
      </div>

      {/* Sección de Listado de Contenido Multimedia */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-4 border-b pb-3">Contenido Multimedia Registrado</h2>
        {isLoadingMedia ? ( /* ... */ ) : mediaItems.length === 0 ? ( /* ... */ ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {mediaItems.map((item) => (
              <div key={item._id} className="border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-w-16 aspect-h-9 bg-slate-100 flex items-center justify-center p-2">
                  {renderMediaIcon(item.mediaType)}
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <p className="text-sm font-medium text-slate-800 truncate" title={item.originalName}>{item.originalName}</p>
                  <p className="text-xs text-slate-500">
                    {item.mediaType === 'pixelmap' ? 'Config. Pixel Map' : (item.mediaType === 'webpage' ? 'Página Web' : formatBytes(item.size))}
                    {' - '} {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  {item.mediaType === 'webpage' && <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate" title={item.url}>Visitar: {item.url}</a>}
                  {item.mediaType === 'pixelmap' && (
                    <div className="mt-1 text-xs space-y-0.5">
                      {item.pixelMapConfig?.logoUrl && <p className="text-slate-600 flex items-center"><FileImage size={12} className="mr-1 flex-shrink-0"/> Logo asignado</p>}
                      {item.pixelMapConfig?.audioUrl && <p className="text-slate-600 flex items-center"><Music size={12} className="mr-1 flex-shrink-0"/> Audio asignado</p>}
                      <div className="flex flex-wrap gap-1 mt-1" title={`Colores: ${item.pixelMapConfig?.colors?.join(', ')}`}>
                        {item.pixelMapConfig?.colors?.slice(0, 5).map((color, idx) => ( // Mostrar hasta 5 colores
                          <div key={idx} style={{ backgroundColor: color }} className="w-3 h-3 rounded-sm border border-slate-300"></div>
                        ))}
                        {item.pixelMapConfig?.colors?.length > 5 && <span className="text-xxs text-slate-400">...</span>}
                      </div>
                    </div>
                  )}
                  <button onClick={() => handleDeleteMedia(item._id, item.originalName)} className="mt-auto pt-2 w-full flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
                    <Trash2 size={14} className="mr-1.5" />Eliminar
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
