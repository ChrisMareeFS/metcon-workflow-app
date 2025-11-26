import { ReactNode, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navigation from './Navigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  
  // Routes that should be full screen (no padding)
  const fullScreenRoutes = ['/flows/builder/', '/batches/kanban'];
  const isFullScreen = fullScreenRoutes.some(route => location.pathname.startsWith(route));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onSidebarToggle={setIsSidebarOpen} />
      
      {/* Main content area - offset by sidebar */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          isSidebarOpen ? 'lg:pl-72' : 'lg:pl-20'
        }`}
      >
        {/* Full screen routes skip padding container */}
        {isFullScreen ? (
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

