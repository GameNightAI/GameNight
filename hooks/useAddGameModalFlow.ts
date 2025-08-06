import { useState, useCallback } from 'react';

export type ModalStep = 'select' | 'image' | 'results';

interface ModalState {
  step: ModalStep;
  imageData?: {
    uri: string;
    name: string;
    type: string;
  } | null;
  analysisResults?: {
    result: string;
    boardGames: any[];
  } | null;
}

interface ModalActions {
  next: () => void;
  back: () => void;
  setImageData: (data: ModalState['imageData']) => void;
  setAnalysisResults: (results: ModalState['analysisResults']) => void;
  reset: () => void;
}

export function useAddGameModalFlow() {
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    step: 'select',
    imageData: null,
    analysisResults: null,
  });

  const openAddGameModal = useCallback(() => {
    setModalState({
      step: 'select',
      imageData: null,
      analysisResults: null,
    });
    setIsAddGameModalOpen(true);
  }, []);

  const closeAddGameModal = useCallback(() => {
    setIsAddGameModalOpen(false);
    setModalState({
      step: 'select',
      imageData: null,
      analysisResults: null,
    });
  }, []);

  const modalActions: ModalActions = {
    next: useCallback(() => {
      setModalState(prev => {
        switch (prev.step) {
          case 'select':
            return { ...prev, step: 'image' };
          case 'image':
            return { ...prev, step: 'results' };
          case 'results':
            return prev; // Stay on results
          default:
            return prev;
        }
      });
    }, []),

    back: useCallback(() => {
      setModalState(prev => {
        switch (prev.step) {
          case 'select':
            return prev; // Stay on select
          case 'image':
            return { ...prev, step: 'select' };
          case 'results':
            return { ...prev, step: 'image' };
          default:
            return prev;
        }
      });
    }, []),

    setImageData: useCallback((data: ModalState['imageData']) => {
      setModalState(prev => ({ ...prev, imageData: data }));
    }, []),

    setAnalysisResults: useCallback((results: ModalState['analysisResults']) => {
      setModalState(prev => ({ ...prev, analysisResults: results }));
    }, []),

    reset: useCallback(() => {
      setModalState({
        step: 'select',
        imageData: null,
        analysisResults: null,
      });
    }, []),
  };

  return {
    isAddGameModalOpen,
    openAddGameModal,
    closeAddGameModal,
    modalState,
    modalActions,
  };
}
