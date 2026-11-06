"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { ProductImageModal, ZoomImagePayload } from "../components/ProductImageModal";

interface ProductZoomContextType {
  openZoom: (payload: ZoomImagePayload) => void;
  closeZoom: () => void;
  activeImage: ZoomImagePayload | null;
}

const ProductZoomContext = createContext<ProductZoomContextType | undefined>(undefined);

export const ProductZoomProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeImage, setActiveImage] = useState<ZoomImagePayload | null>(null);

  const openZoom = useCallback((payload: ZoomImagePayload) => {
    setActiveImage(payload);
  }, []);

  const closeZoom = useCallback(() => {
    setActiveImage(null);
  }, []);

  return (
    <ProductZoomContext.Provider value={{ openZoom, closeZoom, activeImage }}>
      {children}
      {activeImage && (
        <ProductImageModal
          payload={activeImage}
          onClose={closeZoom}
        />
      )}
    </ProductZoomContext.Provider>
  );
};

export const useProductZoom = (): ProductZoomContextType => {
  const context = useContext(ProductZoomContext);
  if (!context) {
    throw new Error("useProductZoom must be used within a ProductZoomProvider");
  }
  return context;
};

export type { ZoomImagePayload };
