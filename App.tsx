
import React, { useState, useCallback, useRef } from 'react';
import { editImageWithPrompt, editImageWithSelection } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import ImageCard from './components/ImageCard';
import { MagicWandIcon, UploadIcon, AlertTriangleIcon } from './components/Icons';

interface OriginalImage {
  url: string;
  base64: string;
  mimeType: string;
}

interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<OriginalImage | null>(null);
  const [referenceImage, setReferenceImage] = useState<OriginalImage | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [inpaintPrompt, setInpaintPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const referenceFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check for valid image types
      if (!file.type.startsWith('image/')) {
          setError("Tipo de arquivo inválido. Por favor, envie uma imagem.");
          return;
      }

      setError(null);
      setEditedImage(null); // Clear previous edit
      setIsSelecting(false); // Disable selection mode on new upload
      setSelection(null); // Clear selection on new upload
      try {
        const { base64, mimeType } = await fileToBase64(file);
        setOriginalImage({
          url: URL.createObjectURL(file),
          base64,
          mimeType,
        });
      } catch (err) {
        setError("Não foi possível processar o arquivo enviado.");
        console.error(err);
      }
    }
  }, []);

  const handleReferenceImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            setError("Tipo de arquivo inválido. Por favor, envie uma imagem.");
            return;
        }
        setError(null);
        try {
            const { base64, mimeType } = await fileToBase64(file);
            setReferenceImage({
                url: URL.createObjectURL(file),
                base64,
                mimeType,
            });
        } catch (err) {
            setError("Não foi possível processar o arquivo de referência.");
            console.error(err);
        }
    }
  }, []);

  const handleEditRequest = useCallback(async () => {
    if (!originalImage || !prompt.trim()) {
      setError('Por favor, envie uma imagem e insira uma instrução de edição.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    setIsSelecting(false); // Turn off selection mode when generating
    setSelection(null); // Clear selection when generating

    const finalPrompt = prompt.trim();

    try {
      const newImageBase64 = await editImageWithPrompt(
        originalImage.base64,
        originalImage.mimeType,
        finalPrompt,
        referenceImage ?? undefined
      );
      setEditedImage(`data:image/png;base64,${newImageBase64}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalImage, prompt, referenceImage]);

  const handleInpaintRequest = useCallback(async () => {
    if (!editedImage || !selection || !inpaintPrompt.trim()) {
      setError('Por favor, selecione uma área e insira uma instrução para editar.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const [header, base64] = editedImage.split(',');
    const mimeTypeMatch = header.match(/:(.*?);/);
    if (!base64 || !mimeTypeMatch) {
        setError("Não foi possível processar a imagem editada existente.");
        setIsLoading(false);
        return;
    }
    const mimeType = mimeTypeMatch[1];
    
    try {
      const newImageBase64 = await editImageWithSelection(
        base64,
        mimeType,
        inpaintPrompt,
        selection
      );
      setEditedImage(`data:image/png;base64,${newImageBase64}`);
      // Clear selection and prompt after successful generation
      setIsSelecting(false);
      setSelection(null);
      setInpaintPrompt('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setError(errorMessage);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [editedImage, selection, inpaintPrompt]);
  
  const handleDownload = useCallback(() => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [editedImage]);

  const handleSelectAreaToggle = useCallback(() => {
    setIsSelecting(prev => {
        const nextState = !prev;
        // If we are turning off selection mode, clear any existing selection and prompt
        if (!nextState) {
            setSelection(null);
            setInpaintPrompt('');
        }
        return nextState;
    });
  }, []);


  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerReferenceFileUpload = () => {
    referenceFileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Editor de Fotos de Produto com IA
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Limpe e aprimore suas fotos de produtos com simples comandos de texto.
          </p>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Suas Instruções</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Instructions Textarea */}
            <div className="md:col-span-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="ex: 'Remova o fundo e deixe-o branco', 'Adicione uma sombra natural', 'Deixe as cores mais vibrantes'..."
                className="w-full h-full min-h-[112px] p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200 resize-none bg-gray-800 text-white placeholder-gray-400"
                disabled={isLoading}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
                disabled={isLoading}
              />
              <input
                type="file"
                ref={referenceFileInputRef}
                onChange={handleReferenceImageUpload}
                className="hidden"
                accept="image/*"
                disabled={isLoading}
              />
              <button
                onClick={triggerFileUpload}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <UploadIcon className="w-5 h-5 mr-2" />
                {originalImage ? 'Alterar Imagem' : '2. Enviar Imagem'}
              </button>
              
              <button
                onClick={triggerReferenceFileUpload}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <UploadIcon className="w-5 h-5 mr-2" />
                {referenceImage ? 'Alterar Imagem de Ref.' : 'Enviar Imagem de Referência'}
              </button>

              <button
                onClick={handleEditRequest}
                disabled={isLoading || !originalImage || !prompt}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <MagicWandIcon className="w-5 h-5 mr-2" />
                )}
                {isLoading ? 'Gerando...' : '3. Gerar'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md" role="alert">
              <div className="flex">
                <div className="py-1"><AlertTriangleIcon className="h-5 w-5 text-red-400 mr-3"/></div>
                <div>
                  <p className="text-sm text-red-700 font-semibold">Ocorreu um erro</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <ImageCard title="Imagem Original" imageUrl={originalImage?.url ?? null} />
          <ImageCard title="Imagem de Referência" imageUrl={referenceImage?.url ?? null} placeholderText="Envie uma imagem de referência (opcional)" />
          <ImageCard 
            title="Imagem Editada" 
            imageUrl={editedImage} 
            isLoading={isLoading}
            onDownload={handleDownload}
            onSelectAreaToggle={handleSelectAreaToggle}
            isSelecting={isSelecting}
            selection={selection}
            onSelectionChange={setSelection}
            inpaintPrompt={inpaintPrompt}
            onInpaintPromptChange={(e) => setInpaintPrompt(e.target.value)}
            onInpaintRequest={handleInpaintRequest}
          />
        </div>
      </main>

      <footer className="text-center py-6 text-sm text-gray-500">
          <p>Desenvolvido com a API Gemini. Projetado para aprimoramento de fotografia de produtos.</p>
      </footer>
    </div>
  );
};

export default App;
