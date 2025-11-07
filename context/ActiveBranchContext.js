import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ActiveBranchContext = createContext({
  activeBranchId: null,
  setActiveBranchId: () => {},
  clearActiveBranch: () => {}
});

export const ActiveBranchProvider = ({ children }) => {
  const [activeBranchId, setActiveBranchIdState] = useState(null);

  // Cargar desde localStorage (persistencia temporal entre navegación)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('activeBranchId');
      if (stored) setActiveBranchIdState(stored);
    } catch (_) {}
  }, []);

  const setActiveBranchId = useCallback((id) => {
    setActiveBranchIdState(id);
    try {
      if (id) window.localStorage.setItem('activeBranchId', id);
      else window.localStorage.removeItem('activeBranchId');
    } catch (_) {}
  }, []);

  const clearActiveBranch = useCallback(() => setActiveBranchId(null), [setActiveBranchId]);

  return (
    <ActiveBranchContext.Provider value={{ activeBranchId, setActiveBranchId, clearActiveBranch }}>
      {children}
    </ActiveBranchContext.Provider>
  );
};

export const useActiveBranch = () => useContext(ActiveBranchContext);
