
import React from 'react';
import { ImageIcon, ProcessingIcon, DownloadIcon, SelectionIcon, MagicWandIcon } from './Icons';

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCardProps {
  title: string;
  imageUrl: string | null;
  isLoading?: boolean;
  onDownload?: () => void;
  onSelectAreaToggle?: () => void;
  isSelecting?: boolean;
  selection?: Selection | null;
  onSelectionChange?: (selection: Selection | null) => void;
  inpaintPrompt?: string;
  onInpaintPromptChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onInpaintRequest?: () => void;
  placeholderText?: string;
}

const ImageCard: React.FC<ImageCardProps> = ({ 
  title, 
  imageUrl, 
  isLoading = false, 
  onDownload, 
  onSelectAreaToggle,
  isSelecting = false,
  selection,
  onSelectionChange,
  inpaintPrompt,
  onInpaintPromptChange,
  onInpaintRequest,
  placeholderText
}) => {
  const showActions = imageUrl && !isLoading;
  
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });

  const getRelativeCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      // Clamp coordinates to be within the 0-100 range
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (!isSelecting || !onSelectionChange) return;
      const coords = getRelativeCoords(e);
      if (!coords) return;
      
      e.preventDefault();
      setIsDrawing(true);
      setStartPos(coords);
      onSelectionChange({ ...coords, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDrawing || !onSelectionChange) return;
      const currentCoords = getRelativeCoords(e);
      if (!currentCoords) return;

      const x = Math.min(startPos.x, currentCoords.x);
      const y = Math.min(startPos.y, currentCoords.y);
      const width = Math.abs(startPos.x - currentCoords.x);
      const height = Math.abs(startPos.y - currentCoords.y);

      onSelectionChange({ x, y, width, height });
  };

  const handleMouseUp = () => {
      setIsDrawing(false);
  };


  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div 
          ref={containerRef}
          className="relative aspect-square w-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves
          style={{ cursor: isSelecting ? 'crosshair' : 'default' }}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-50 flex flex-col items-center justify-center z-20">
              <ProcessingIcon className="w-12 h-12 text-white animate-spin" />
              <p className="text-white mt-4 font-medium">Editando sua imagem...</p>
            </div>
          )}
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
              <ImageIcon className="w-16 h-16" />
              <p className="mt-2 text-sm font-medium">
                {placeholderText || (title === 'Imagem Original' ? 'Envie uma imagem para começar' : 'Sua imagem editada aparecerá aqui')}
              </p>
            </div>
          )}

          {isSelecting && selection && (
              <div
                  className="absolute border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-25 z-10"
                  style={{
                      left: `${selection.x}%`,
                      top: `${selection.y}%`,
                      width: `${selection.width}%`,
                      height: `${selection.height}%`,
                      pointerEvents: 'none', // Don't let the selection div interfere with mouse events on the container
                  }}
              />
          )}
        </div>
        
        {showActions && (
          <div className="bg-gray-50 border-t border-gray-200 p-4">
             {isSelecting && selection && selection.width > 0 && selection.height > 0 ? (
              <div className="flex flex-col gap-3">
                <label htmlFor="inpaint-prompt" className="font-semibold text-gray-700">Editar área selecionada:</label>
                <textarea
                  id="inpaint-prompt"
                  value={inpaintPrompt}
                  onChange={onInpaintPromptChange}
                  placeholder="ex: 'Remova os fios elétricos', 'faça o céu ficar mais azul'"
                  className="w-full h-20 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none bg-white text-gray-800 placeholder-gray-400"
                  disabled={isLoading}
                />
                <div className="flex flex-col sm:flex-row gap-4">
                   <button 
                    onClick={onInpaintRequest} 
                    disabled={isLoading || !inpaintPrompt?.trim()}
                    className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <MagicWandIcon className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? 'Gerando...' : 'Gerar'}
                  </button>
                  <button 
                    onClick={onSelectAreaToggle} 
                    className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition disabled:opacity-50"
                    disabled={isLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
            <div className="flex items-center justify-center gap-4">
              {onDownload && (
                <button 
                  onClick={onDownload} 
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition disabled:opacity-50"
                  disabled={isLoading}
                >
                  <DownloadIcon className="w-5 h-5 mr-2" />
                  Baixar
                </button>
              )}
              {onSelectAreaToggle && (
                <button 
                  onClick={onSelectAreaToggle} 
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition disabled:opacity-50"
                  disabled={isLoading}
                >
                  <SelectionIcon className="w-5 h-5 mr-2" />
                  {isSelecting ? 'Cancelar Seleção' : 'Editar Área'}
                </button>
              )}
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCard;
