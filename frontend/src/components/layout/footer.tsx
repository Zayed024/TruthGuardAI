import { Shield, Twitter, Linkedin, Github } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-white border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and tagline */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold text-foreground">TruthGuard AI</span>
            </div>
            <p className="text-muted-foreground max-w-md">
              Advanced AI-powered platform for combating misinformation and verifying digital content authenticity.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Learn More</h3>
            <div className="space-y-2">
              <button 
                onClick={() => onNavigate('about')}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                About Us
              </button>
              <button 
                onClick={() => onNavigate('how-it-works')}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                How It Works
              </button>
              <button 
                onClick={() => onNavigate('privacy')}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </button>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2024 TruthGuard AI. All rights reserved.
          </p>
          <button 
            onClick={() => onNavigate('admin-login')}
            className="text-xs text-muted-foreground hover:text-primary transition-colors mt-4 sm:mt-0"
          >
            Admin Portal
          </button>
        </div>
      </div>
    </footer>
  );
}