import { useState } from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Shield, Menu, X } from 'lucide-react';

interface NavigationProps {
  isLoggedIn: boolean;
  isAdmin: boolean;
  currentUser?: {
    email: string;
    name?: string;
  };
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Navigation({ 
  isLoggedIn, 
  isAdmin, 
  currentUser, 
  onLogin, 
  onSignup, 
  onLogout, 
  onNavigate, 
  currentPage 
}: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = isLoggedIn
    ? [
        { id: 'analysis', label: 'Analysis Hub' },
        { id: 'explorer', label: 'Evidence Explorer' },
        { id: 'trends', label: 'Trends Dashboard' },
      ]
    : [];

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onNavigate('home')}>
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-xl font-semibold text-foreground">TruthGuard AI</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 rounded-md transition-colors ${
                  currentPage === item.id
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side - Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoggedIn ? (
              <>
                <Button variant="ghost" onClick={onLogin}>
                  Log In
                </Button>
                <Button onClick={onSignup}>
                  Sign Up
                </Button>
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(currentUser?.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuItem onClick={() => onNavigate('history')}>
                    My History
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => onNavigate('admin')}>
                      Admin Portal
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={onLogout}>
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`block px-3 py-2 rounded-md w-full text-left ${
                  currentPage === item.id
                    ? 'text-primary bg-primary/10'
                    : 'text-foreground hover:text-primary hover:bg-primary/5'
                }`}
              >
                {item.label}
              </button>
            ))}
            
            {!isLoggedIn ? (
              <>
                <Button variant="ghost" className="w-full justify-start" onClick={onLogin}>
                  Log In
                </Button>
                <Button className="w-full justify-start" onClick={onSignup}>
                  Sign Up
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    onNavigate('history');
                    setIsMobileMenuOpen(false);
                  }}
                  className="block px-3 py-2 rounded-md w-full text-left text-foreground hover:text-primary hover:bg-primary/5"
                >
                  My History
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setIsMobileMenuOpen(false);
                    }}
                    className="block px-3 py-2 rounded-md w-full text-left text-foreground hover:text-primary hover:bg-primary/5"
                  >
                    Admin Portal
                  </button>
                )}
                <button
                  onClick={onLogout}
                  className="block px-3 py-2 rounded-md w-full text-left text-foreground hover:text-primary hover:bg-primary/5"
                >
                  Log Out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}