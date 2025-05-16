// admin-frontend/src/pages/ActivatorsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { 
    PlusCircle, Edit3, Trash2, Link as LinkIcon, 
    Image as ImageIcon, Video as VideoIcon, Globe as WebpageIcon, Palette as PixelMapIcon, // Renombrado Palette a PixelMapIcon para claridad
    AlertCircle, CheckCircle, Loader2, XCircle, Eye, Info, Music, FileImage 
} from 'lucide-react';

// Modal Component (simple) - No necesita cambios
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const ActivatorsPage = () => {
  const [activators, setActivators] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentActivator, setCurrentActivator] = useState(null);
  const [activatorName, setActivatorName] = useState('');
  const [visualizerId, setVisualizerId] = useState('');
  const [description, setDescription] = useState('');
  const [assignedMedia, setAssignedMedia] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCurrentActivator(null);
    setActivatorName('');
    setVisualizerId('');
    setDescription('');
    setAssignedMedia('');
    setError('');
  };

  const fetchActivators = useCallback(async () => {
    try {
      const response = await api.get('/activators');
      setActivators(response.data);
    } catch (err) {
      console.error("Error al cargar activadores:", err);
      setError('No se pudo cargar la lista de activadores.');
    }
  }, []);

  const fetchMedia = useCallback(async () => {
    try {
      const response = await api.get('/media');
      setMediaItems(response.data);
    } catch (err) {
      console.error("Error al cargar multimedia:", err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(''); 
      setSuccessMessage(''); 
      await Promise.all([fetchActivators(), fetchMedia()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchActivators, fetchMedia]);

  const handleOpenModal = (activator = null) => {
    resetForm();
    if (activator) {
      setCurrentActivator(activator);
      setActivatorName(activator.name);
      setVisualizerId(activator.visualizerId);
      setDescription(activator.description || '');
      setAssignedMedia(activator.assignedMedia?._id || '');
    }
    setSuccessMessage('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmitActivator = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    const activatorData = {
      name: activatorName,
      visualizerId: visualizerId,
      description: description,
    };

    try {
      let responseActivator;
      if (currentActivator) {
        responseActivator = await api.put(`/activators/${currentActivator._id}`, activatorData);
        if (assignedMedia !== (currentActivator.assignedMedia?._id || '') || (assignedMedia === '' && currentActivator.assignedMedia)) {
            await api.patch(`/activators/${currentActivator._id}/assign-media`, { mediaId: assignedMedia || null });
        }
        setSuccessMessage('¡Activador actualizado exitosamente!');
      } else {
        responseActivator = await api.post('/activators', activatorData);
        if (assignedMedia) {
            await api.patch(`/activators/${responseActivator.data._id}/assign-media`, { mediaId: assignedMedia });
        }
        setSuccessMessage('¡Activador creado exitosamente!');
      }
      await fetchActivators();
      handleCloseModal();
    } catch (err) {
      console.error("Error al guardar el activador:", err.response ? err.response.data : err);
      setError(err.response?.data?.message || 'Error al guardar el activador.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteActivator = async (activatorId, activatorName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar el activador "${activatorName}"?`)) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      await api.delete(`/activators/${activatorId}`);
      setSuccessMessage(`Activador "${activatorName}" eliminado exitosamente.`);
      fetchActivators();
    } catch (err) {
      console.error("Error al eliminar el activador:", err);
      setError(err.response?.data?.message || 'Error al eliminar el activador.');
    }
  };
  
  const getVisualizerUrl = (vizId) => {
    const baseVisualizerUrl = import.meta.env.VITE_VISUALIZER_PAGE_BASE_URL || window.location.origin;
    return `${baseVisualizerUrl}/visualizer/${vizId}`;
  };

  const getMediaTypeDisplayName = (mediaType) => {
    switch (mediaType) {
      case 'image': return 'Imagen';
      case 'video': return 'Video';
      case 'webpage': return 'Página Web';
      case 'pixelmap': return 'Pixel Map';
      default: return 'Desconocido';
    }
  };

  const renderMediaInfo = (media) => {
    if (!media) return <span className="text-xs italic">Ninguna</span>;
    
    let icon;
    if (media.mediaType === 'image') icon = <ImageIcon size={16} className="mr-1.5 text-blue-500 flex-shrink-0" />;
    else if (media.mediaType === 'video') icon = <VideoIcon size={16} className="mr-1.5 text-purple-500 flex-shrink-0" />;
    else if (media.mediaType === 'webpage') icon = <WebpageIcon size={16} className="mr-1.5 text-green-500 flex-shrink-0" />;
    else if (media.mediaType === 'pixelmap') icon = <PixelMapIcon size={16} className="mr-1.5 text-orange-500 flex-shrink-0" />;
    else icon = <ImageIcon size={16} className="mr-1.5 text-slate-400 flex-shrink-0" />; // Icono por defecto

    return (
      <div className="flex items-center">
        {icon}
        <span className="truncate max-w-xs" title={media.originalName}>
          {media.originalName}
        </span>
      </div>
    );
  };


  if (isLoading) {
    return ( /* ... Contenido de carga ... */ <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /><p className="ml-3 text-slate-600">Cargando datos...</p></div>);
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <button onClick={() => handleOpenModal()} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors">
          <PlusCircle size={20} className="mr-2" />Crear Nuevo Activador
        </button>
      </div>

      {error && !isModalOpen && ( <div className="my-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center" role="alert"><AlertCircle size={20} className="mr-3 text-red-500" /> <p className="text-sm">{error}</p></div>)}
      {successMessage && !isModalOpen && (<div className="my-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md flex items-center" role="alert"><CheckCircle size={20} className="mr-3 text-green-500" /> <p className="text-sm">{successMessage}</p></div>)}

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={currentActivator ? 'Editar Activador' : 'Crear Nuevo Activador'}>
        <form onSubmit={handleSubmitActivator} className="space-y-4">
          {error && isModalOpen && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md flex items-center text-sm" role="alert"><AlertCircle size={18} className="mr-2 text-red-500 flex-shrink-0" /> {error}</div>)}
          <div>
            <label htmlFor="activatorName" className="block text-sm font-medium text-slate-700">Nombre del Activador</label>
            <input type="text" id="activatorName" value={activatorName} onChange={(e) => setActivatorName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Ej: Pantalla Principal Lobby" />
          </div>
          <div>
            <label htmlFor="visualizerId" className="block text-sm font-medium text-slate-700">ID del Visualizador (único)</label>
            <input type="text" id="visualizerId" value={visualizerId} onChange={(e) => setVisualizerId(e.target.value.toLowerCase().replace(/\s+/g, '-'))} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Ej: visualizador1 o pantalla-lobby" />
            <p className="mt-1 text-xs text-slate-500">Solo letras minúsculas, números y guiones. Parte de la URL del visualizador.</p>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">Descripción (Opcional)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Describe brevemente este activador." />
          </div>
          <div>
            <label htmlFor="assignedMedia" className="block text-sm font-medium text-slate-700">Asignar Contenido (Opcional)</label>
            <select id="assignedMedia" value={assignedMedia} onChange={(e) => setAssignedMedia(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
              <option value="">-- No asignar contenido --</option>
              {mediaItems.map(media => (
                <option key={media._id} value={media._id}>
                  {media.originalName} ({getMediaTypeDisplayName(media.mediaType)}) {/* Usar getMediaTypeDisplayName */}
                </option>
              ))}
            </select>
          </div>
          <div className="pt-2 flex justify-end space-x-3">
            <button type="button" onClick={handleCloseModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400">
              {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
              {currentActivator ? 'Guardar Cambios' : 'Crear Activador'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-white p-1 rounded-lg shadow-lg border border-slate-200">
        {activators.length === 0 && !isLoading ? (
          <p className="text-slate-500 text-center py-10 px-6">No hay activadores creados. ¡Crea el primero!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID Visualizador</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contenido Asignado</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">URL Visualizador</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {activators.map((activator) => (
                  <tr key={activator._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{activator.name}</div>
                      {activator.description && <div className="text-xs text-slate-500 truncate max-w-xs" title={activator.description}>{activator.description}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">{activator.visualizerId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {renderMediaInfo(activator.assignedMedia)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href={getVisualizerUrl(activator.visualizerId)} target="_blank" rel="noopener noreferrer" title={`Abrir ${getVisualizerUrl(activator.visualizerId)}`} className="text-blue-600 hover:text-blue-800 hover:underline flex items-center">
                        <LinkIcon size={16} className="mr-1" /> Ver Visualizador
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleOpenModal(activator)} className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-100 rounded-md" title="Editar Activador"><Edit3 size={18} /></button>
                      <button onClick={() => handleDeleteActivator(activator._id, activator.name)} className="text-red-600 hover:text-red-800 p-1 hover:bg-red-100 rounded-md" title="Eliminar Activador"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivatorsPage;
