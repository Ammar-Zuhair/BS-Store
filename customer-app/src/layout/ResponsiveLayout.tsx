import React, { createContext, useContext } from 'react';

export function calculateLayout(width: number, height: number) {
  return {
    width, height, contentWidth: Math.min(width, 1120),
    compact: height < 500,
    landscape: width > height,
    navHeight: height < 500 ? 52 : 64,
  };
}
export const Layout = createContext(calculateLayout(390, 844));
export const useResponsiveLayout = () => useContext(Layout);
