import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Search, ExternalLink, Eye, ChevronRight } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  credibilityScore: number;
  status: 'verified' | 'questionable' | 'debunked';
  date: string;
  source: string;
  claims: Array<{
    id: string;
    text: string;
    status: 'verified' | 'questionable' | 'debunked';
    evidence: Array<{
      id: string;
      type: 'source' | 'fact-check' | 'expert-opinion';
      title: string;
      url: string;
      credibility: 'high' | 'medium' | 'low';
    }>;
  }>;
}

const mockArticles: Article[] = [
  {
    id: '1',
    title: 'Climate Change Impact on Arctic Ice Sheets',
    summary: 'Recent study shows accelerated melting of Arctic ice sheets due to rising global temperatures.',
    imageUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=200&fit=crop',
    credibilityScore: 92,
    status: 'verified',
    date: '2024-01-15',
    source: 'Nature Climate Change',
    claims: [
      {
        id: 'c1',
        text: 'Arctic ice sheets are melting at an accelerated rate',
        status: 'verified',
        evidence: [
          { id: 'e1', type: 'source', title: 'NASA Satellite Data', url: '#', credibility: 'high' },
          { id: 'e2', type: 'fact-check', title: 'IPCC Report Verification', url: '#', credibility: 'high' }
        ]
      }
    ]
  },
  {
    id: '2',
    title: 'New COVID-19 Variant Detected',
    summary: 'Health officials report discovery of new variant with increased transmissibility.',
    imageUrl: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=400&h=200&fit=crop',
    credibilityScore: 78,
    status: 'questionable',
    date: '2024-01-14',
    source: 'Health News Today',
    claims: [
      {
        id: 'c2',
        text: 'New variant is 50% more transmissible',
        status: 'questionable',
        evidence: [
          { id: 'e3', type: 'source', title: 'Preliminary Study', url: '#', credibility: 'medium' },
          { id: 'e4', type: 'expert-opinion', title: 'WHO Statement', url: '#', credibility: 'high' }
        ]
      }
    ]
  },
  {
    id: '3',
    title: 'Economic Crisis Predictions for 2024',
    summary: 'Controversial economist claims major recession inevitable by mid-2024.',
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop',
    credibilityScore: 34,
    status: 'debunked',
    date: '2024-01-13',
    source: 'Financial Rumors Blog',
    claims: [
      {
        id: 'c3',
        text: 'Global recession certain by mid-2024',
        status: 'debunked',
        evidence: [
          { id: 'e5', type: 'fact-check', title: 'Reuters Fact Check', url: '#', credibility: 'high' },
          { id: 'e6', type: 'expert-opinion', title: 'IMF Economic Outlook', url: '#', credibility: 'high' }
        ]
      }
    ]
  }
];

export function EvidenceExplorer() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);
  
  const filteredArticles = mockArticles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'questionable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'debunked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCredibilityColor = (credibility: string) => {
    switch (credibility) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl">Evidence Explorer</h1>
        <p className="text-muted-foreground">
          Explore analyzed articles and dive deep into their evidence networks
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((article) => (
          <Card key={article.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="aspect-video relative overflow-hidden rounded-t-lg">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <Badge className={getStatusColor(article.status)}>
                  {article.status}
                </Badge>
              </div>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg line-clamp-2">{article.title}</CardTitle>
              <CardDescription className="line-clamp-2">{article.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{article.source}</span>
                <span>{new Date(article.date).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">Credibility: </span>
                  <span className={`font-bold ${getCredibilityColor(
                    article.credibilityScore >= 70 ? 'high' : 
                    article.credibilityScore >= 40 ? 'medium' : 'low'
                  )}`}>
                    {article.credibilityScore}%
                  </span>
                </div>
                
                <Button 
                  onClick={() => setSelectedArticle(article)}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Explore
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evidence Tree Dialog */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedArticle?.title}</span>
              <Badge className={selectedArticle ? getStatusColor(selectedArticle.status) : ''}>
                {selectedArticle?.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Explore the evidence tree and supporting sources for this article
            </DialogDescription>
          </DialogHeader>
          
          {selectedArticle && (
            <div className="space-y-6">
              {/* Article Summary */}
              <div className="p-4 bg-secondary/20 rounded-lg">
                <p className="text-muted-foreground">{selectedArticle.summary}</p>
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span>Source: {selectedArticle.source}</span>
                  <span>Credibility: {selectedArticle.credibilityScore}%</span>
                </div>
              </div>

              {/* Evidence Tree */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Evidence Tree</h3>
                <div className="space-y-4">
                  {selectedArticle.claims.map((claim) => (
                    <div key={claim.id} className="border rounded-lg">
                      <div 
                        className="p-4 cursor-pointer hover:bg-secondary/10 flex items-center justify-between"
                        onClick={() => setSelectedClaim(
                          selectedClaim === claim.id ? null : claim.id
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded-full bg-primary" />
                          <span className="font-medium">{claim.text}</span>
                          <Badge className={getStatusColor(claim.status)} size="sm">
                            {claim.status}
                          </Badge>
                        </div>
                        <ChevronRight 
                          className={`w-4 h-4 transition-transform ${
                            selectedClaim === claim.id ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                      
                      {selectedClaim === claim.id && (
                        <div className="px-4 pb-4 border-t bg-secondary/5">
                          <div className="pt-4 space-y-3">
                            <h4 className="font-medium text-sm">Supporting Evidence:</h4>
                            {claim.evidence.map((evidence) => (
                              <div key={evidence.id} className="flex items-center justify-between p-3 bg-background rounded border">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    evidence.credibility === 'high' ? 'bg-green-500' :
                                    evidence.credibility === 'medium' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`} />
                                  <div>
                                    <p className="font-medium text-sm">{evidence.title}</p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {evidence.type.replace('-', ' ')} • {evidence.credibility} credibility
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={evidence.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}