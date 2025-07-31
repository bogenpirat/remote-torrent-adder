import './globals.css';
import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="h-full font-sans">{children}</div>;
}
