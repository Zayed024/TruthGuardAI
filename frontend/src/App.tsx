import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './utils/auth/auth-context';
import { Navigation } from './components/layout/navigation';
import { Footer } from './components/layout/footer';
import { LandingPage } from './components/home/landing-page';
import { UserSignup } from './components/auth/user-signup';
import { UserLogin } from './components/auth/user-login';
import { AdminLogin } from './components/auth/admin-login';
import { AdminSetup } from './components/auth/admin-setup';
import { AnalysisHub } from './components/dashboard/analysis-hub';
import { EvidenceExplorer } from './components/dashboard/evidence-explorer';
import { TrendsDashboard } from './components/dashboard/trends-dashboard';
import { MyHistory } from './components/dashboard/my-history';
import { AdminDashboard } from './components/admin/admin-dashboard';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { projectId } from './utils/supabase/info';

type Page = 
  | 'home' 
  | 'signup' 
  | 'login' 
  | 'admin-login'
  | 'admin-setup'
  | 'analysis' 
  | 'explorer' 
  | 'trends' 
  | 'history' 
  | 'admin'
  | 'about'
  | 'how-it-works'
  | 'privacy';

function AppContent() {
  const { user, loading, signUp, signIn, signInWithGoogle, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password);
      setCurrentPage('analysis');
      toast.success('Successfully logged in!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleSignup = async (email: string, password: string, name?: string) => {
    try {
      await signUp(email, password, name);
      setCurrentPage('analysis');
      toast.success('Account created successfully!');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'Account creation failed');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      setCurrentPage('analysis');
      toast.success('Successfully signed in with Google!');
      toast.info('To enable Google login, please configure OAuth in Supabase dashboard. Visit: https://supabase.com/docs/guides/auth/social-login/auth-google');
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error(error instanceof Error ? error.message : 'Google authentication failed');
    }
  };

  const handleAdminLogin = async (email: string, password: string) => {
    try {
      const signInResult = await signIn(email, password);
      
      // Check admin status immediately after login
      if (signInResult && signInResult.session?.access_token) {
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-cd4019c8/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${signInResult.session.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            if (userData.user?.isAdmin) {
              setCurrentPage('admin');
              toast.success('Admin access granted');
            } else {
              toast.error('Admin access denied - insufficient permissions');
              await signOut();
            }
          } else {
            toast.error('Failed to verify admin permissions');
            await signOut();
          }
        } catch (profileError) {
          console.error('Failed to check admin status:', profileError);
          toast.error('Failed to verify admin permissions');
          await signOut();
        }
      }
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error(error instanceof Error ? error.message : 'Admin login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setCurrentPage('home');
      toast.success('Successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  const handleNavigate = (page: string) => {
    // Handle navigation based on authentication status
    const protectedPages = ['analysis', 'explorer', 'trends', 'history'];
    const adminPages = ['admin'];
    
    if (protectedPages.includes(page) && !user) {
      setCurrentPage('login');
      toast.error('Please log in to access this feature');
      return;
    }
    
    if (adminPages.includes(page) && (!user || !user.isAdmin)) {
      setCurrentPage('admin-login');
      return;
    }
    
    setCurrentPage(page as Page);
  };

  const handleGetStarted = () => {
    if (user) {
      setCurrentPage('analysis');
    } else {
      setCurrentPage('signup');
    }
  };

  const handleLearnMore = () => {
    setCurrentPage('how-it-works');
  };

  const handleForgotPassword = () => {
    toast.info('Password reset functionality would be implemented here');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <LandingPage onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />;
      
      case 'signup':
        return (
          <UserSignup
            onSignup={(email, password) => handleSignup(email, password)}
            onGoogleSignup={handleGoogleAuth}
            onSwitchToLogin={() => setCurrentPage('login')}
          />
        );
      
      case 'login':
        return (
          <UserLogin
            onLogin={handleLogin}
            onGoogleLogin={handleGoogleAuth}
            onSwitchToSignup={() => setCurrentPage('signup')}
            onForgotPassword={handleForgotPassword}
          />
        );
      
      case 'admin-login':
        return (
          <AdminLogin
            onAdminLogin={handleAdminLogin}
            onBack={() => setCurrentPage('home')}
            onAdminSetup={() => setCurrentPage('admin-setup')}
          />
        );
      
      case 'admin-setup':
        return (
          <AdminSetup
            onBack={() => setCurrentPage('admin-login')}
            onAdminCreated={() => setCurrentPage('admin-login')}
          />
        );
      
      case 'analysis':
        return <AnalysisHub />;
      
      case 'explorer':
        return <EvidenceExplorer />;
      
      case 'trends':
        return <TrendsDashboard />;
      
      case 'history':
        return <MyHistory />;
      
      case 'admin':
        return <AdminDashboard onLogout={handleLogout} />;
      
      case 'about':
      case 'how-it-works':
      case 'privacy':
        return (
          <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-semibold capitalize">
                {currentPage.replace('-', ' ')} Page
              </h1>
              <p className="text-muted-foreground">
                This page would contain detailed information about {currentPage.replace('-', ' ')}.
              </p>
              <button
                onClick={() => setCurrentPage('home')}
                className="text-primary hover:underline"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        );
      
      default:
        return <LandingPage onGetStarted={handleGetStarted} onLearnMore={handleLearnMore} />;
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show navigation and footer for admin dashboard and auth pages
  const hideNavAndFooter = ['admin', 'signup', 'login', 'admin-login', 'admin-setup'].includes(currentPage);

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavAndFooter && (
        <Navigation
          isLoggedIn={!!user}
          isAdmin={user?.isAdmin || false}
          currentUser={user || undefined}
          onLogin={() => setCurrentPage('login')}
          onSignup={() => setCurrentPage('signup')}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
      )}
      
      <main className="flex-1">
        {renderCurrentPage()}
      </main>
      
      {!hideNavAndFooter && (
        <Footer onNavigate={handleNavigate} />
      )}
      
      <Toaster position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}