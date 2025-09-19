import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Shield, Search, Users, TrendingUp, CheckCircle, AlertTriangle, Eye } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export function LandingPage({ onGetStarted, onLearnMore }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <div className="flex justify-center">
              <Shield className="h-20 w-20 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl max-w-4xl mx-auto">
              Combat Misinformation with <span className="text-primary">AI-Powered Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              TruthGuard AI is your digital content context engine, analyzing articles, videos, and images 
              to verify authenticity and combat the spread of misinformation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={onGetStarted} className="px-8 py-3">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" onClick={onLearnMore} className="px-8 py-3">
              Learn More
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>94.2% Accuracy Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>3,200+ Active Users</span>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <span>12,000+ Content Analyzed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold mb-4">Powerful Features for Truth Verification</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our comprehensive suite of AI-powered tools helps you analyze, verify, and understand 
            digital content like never before.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader>
              <Search className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Multi-Format Analysis</CardTitle>
              <CardDescription>
                Analyze URLs, text content, and images with our advanced AI algorithms 
                for comprehensive content verification.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader>
              <Eye className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Evidence Explorer</CardTitle>
              <CardDescription>
                Dive deep into interactive evidence networks and explore the connections 
                between claims, sources, and fact-checks.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader>
              <TrendingUp className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Real-Time Trends</CardTitle>
              <CardDescription>
                Monitor misinformation patterns across regions with live dashboards 
                and interactive visualization tools.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Credibility Scoring</CardTitle>
              <CardDescription>
                Get instant credibility scores based on source reliability, 
                fact-checker verdicts, and cross-reference verification.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader>
              <AlertTriangle className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Smart Alerts</CardTitle>
              <CardDescription>
                Receive notifications about trending misinformation topics 
                and potential threats in your areas of interest.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors">
            <CardHeader>
              <Users className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Community Watchlist</CardTitle>
              <CardDescription>
                Contribute to our collective intelligence by submitting suspicious 
                content for community verification.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-secondary/20 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4">How TruthGuard AI Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our three-step verification process ensures accurate and reliable content analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold">Submit Content</h3>
              <p className="text-muted-foreground">
                Upload URLs, paste text, or submit images through our intuitive interface.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our AI algorithms analyze sources, cross-reference facts, and evaluate credibility.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold">Get Results</h3>
              <p className="text-muted-foreground">
                Receive detailed reports with credibility scores, source analysis, and evidence trails.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-primary/5 rounded-2xl p-8 md:p-12">
          <h2 className="text-3xl font-semibold mb-4">Ready to Fight Misinformation?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of researchers, journalists, and fact-checkers who trust TruthGuard AI 
            to verify digital content and combat the spread of misinformation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={onGetStarted} className="px-8 py-3">
              Start Analyzing Content
            </Button>
            <Button size="lg" variant="outline" onClick={onLearnMore} className="px-8 py-3">
              View Demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}