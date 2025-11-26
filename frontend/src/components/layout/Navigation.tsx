import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  Home,
  Package,
  GitBranch,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  ListChecks,
  Boxes,
} from 'lucide-react';

interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[];
  children?: MenuItem[];
}

interface NavigationProps {
  onSidebarToggle?: (isOpen: boolean) => void;
}

export default function Navigation({ onSidebarToggle }: NavigationProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      name: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      path: '/dashboard',
    },
    {
      name: 'Batches',
      icon: <Package className="h-5 w-5" />,
      path: '/batches',
      roles: ['operator', 'admin'],
      children: [
        { name: 'WIP Board', icon: <Boxes className="h-4 w-4" />, path: '/batches/wip' },
        { name: 'Kanban Board', icon: <ListChecks className="h-4 w-4" />, path: '/batches/kanban' },
        { name: 'All Batches', icon: <Package className="h-4 w-4" />, path: '/batches' },
      ],
    },
    {
      name: 'Flows',
      icon: <GitBranch className="h-5 w-5" />,
      path: '/flows',
      roles: ['admin'],
    },
    {
      name: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      path: '/analytics',
      roles: ['analyst', 'admin'],
    },
    {
      name: 'Users',
      icon: <User className="h-5 w-5" />,
      path: '/admin/users',
      roles: ['admin'],
    },
    {
      name: 'Settings',
      icon: <Settings className="h-5 w-5" />,
      path: '/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    if (onSidebarToggle) {
      onSidebarToggle(newState);
    }
  };

  const toggleMenu = (menuName: string) => {
    if (expandedMenus.includes(menuName)) {
      setExpandedMenus(expandedMenus.filter((m) => m !== menuName));
    } else {
      setExpandedMenus([...expandedMenus, menuName]);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const hasAccess = (item: MenuItem) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role || '');
  };

  const filteredMenuItems = menuItems.filter(hasAccess);

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const active = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.includes(item.name);

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleMenu(item.name)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-100'
            } ${isChild ? 'pl-12' : ''}`}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              {isSidebarOpen && <span>{item.name}</span>}
            </div>
            {isSidebarOpen && (
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isExpanded ? 'transform rotate-180' : ''
                }`}
              />
            )}
          </button>
          {isSidebarOpen && isExpanded && (
            <div className="ml-2 mt-1 space-y-1">
              {item.children?.filter(hasAccess).map((child) => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-700 hover:bg-gray-100'
        } ${isChild ? 'pl-10' : ''}`}
      >
        {item.icon}
        {isSidebarOpen && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Toggle - Only visible on mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-6 left-6 z-50 p-3 bg-white rounded-lg shadow-lg lg:hidden"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700" />
        )}
      </button>

      {/* Desktop Sidebar - Clean Style */}
      <aside
        className={`fixed top-0 left-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-20 hidden lg:flex lg:flex-col ${
          isSidebarOpen ? 'w-72' : 'w-20'
        }`}
      >
        {/* Sidebar Header with branding and toggle */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <div className="flex-1 flex items-center gap-3">
                <img src="/metcon-logo.svg" alt="MetCon Logo" className="h-8" />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    MetCon Flows
                  </h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Precious Metals
                  </p>
                </div>
              </div>
              <button
                onClick={toggleSidebar}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            </>
          ) : (
            <button
              onClick={toggleSidebar}
              className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5 text-gray-600 mx-auto" />
            </button>
          )}
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
          {filteredMenuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* User Info and Logout at bottom */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            {isSidebarOpen && (
              <div className="text-sm overflow-hidden">
                <p className="font-medium text-gray-900 truncate">
                  {user?.username}
                </p>
                <p className="text-gray-500 capitalize text-xs truncate">
                  {user?.role}
                </p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium ${
              !isSidebarOpen ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu - Clean Style */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-white border-r border-gray-200 z-50 lg:hidden flex flex-col">
            {/* Mobile Sidebar Header */}
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-xl font-semibold text-gray-900">
                MetCon Flows
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Precious Metals
              </p>
            </div>

            <nav className="p-4 space-y-1 overflow-y-auto flex-1">
              {filteredMenuItems.map((item) => renderMenuItem(item))}
            </nav>

            {/* User Info and Logout at bottom */}
            <div className="p-4 border-t border-gray-200 space-y-3">
              {/* User Info */}
              <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="text-sm overflow-hidden">
                  <p className="font-medium text-gray-900 truncate">
                    {user?.username}
                  </p>
                  <p className="text-gray-500 capitalize text-xs truncate">
                    {user?.role}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

