import { ReactNode, useState } from 'react';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onSidebarToggle={setIsSidebarOpen} />
      
      {/* Main content area - offset by sidebar */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          isSidebarOpen ? 'lg:pl-72' : 'lg:pl-20'
        }`}
      >
        {/* Check if child is a full-screen component (FlowBuilder, KanbanBoard) */}
        {typeof (children as any)?.type === 'function' && 
         ((children as any).type.name === 'FlowBuilder' || (children as any).type.name === 'KanbanBoard') ? (
          children
        ) : (
          <div className="p-6 sm:p-8 lg:p-12 max-w-7xl mx-auto">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}

