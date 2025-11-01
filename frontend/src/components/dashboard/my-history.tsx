import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Eye, Calendar, Link, FileText, Image, Filter } from 'lucide-react';
import { useAnalysisHistory } from '../../utils/auth/analysis-hooks';
import { apiService } from '../../utils/api';
import { toast } from 'sonner';

interface AnalysisHistory {
  id?: string;
  type?: 'url' | 'text' | 'image' | 'youtube';
  title?: string;
  content?: string;
  credibilityScore?: number;
  status?: 'verified' | 'questionable' | 'debunked';
  date?: string;
  timeSpent?: string;
  createdAt?: any; // could be a string or Firebase Timestamp
}

export function MyHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [history, setHistory] = useState<AnalysisHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getAnalysisHistory } = useAnalysisHistory();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const analyses = await getAnalysisHistory();
      setHistory(analyses);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load analysis history');
      // Fallback to empty array
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'url': return <Link className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'questionable': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'debunked': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredHistory = history
    .filter(item => {
      const titleSafe = (item.title || '').toLowerCase();
      const contentSafe = (item.content || '').toLowerCase();
      const termSafe = (searchTerm || '').toLowerCase();
      const matchesSearch = titleSafe.includes(termSafe) || contentSafe.includes(termSafe);
      const matchesType = typeFilter === 'all' || item.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          const dateA = new Date(a.createdAt || a.date || '');
          const dateB = new Date(b.createdAt || b.date || '');
          return dateB.getTime() - dateA.getTime();
        case 'score':
          return (b.credibilityScore || 0) - (a.credibilityScore || 0);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

  const handleViewFullReport = async (item: AnalysisHistory) => {
    try {
      // Re-run the analysis to get full details
      let response;
      if (item.type === 'youtube') {
        response = await apiService.analyzeVideo(item.content || '');
      } else if (item.type === 'url' || item.type === 'text') {
        response = await apiService.analyzeText(item.content || '', item.type === 'url' ? item.content : undefined);
      } else if (item.type === 'image') {
        // For images, we can't re-analyze without the file, so show a message
        toast.info('Full image analysis requires re-uploading the image file');
        return;
      } else {
        throw new Error("Unknown analysis type");
      }

      if (response.error) {
        throw new Error(response.error);
      }

      // Store the full result in localStorage for the modal to access
      const fullResult = response.data;
      localStorage.setItem('fullAnalysisResult', JSON.stringify(fullResult));

      // Navigate to analysis hub with the result
      window.location.href = '/dashboard/analysis-hub?view=full';

    } catch (error) {
      console.error('Failed to load full report:', error);
      toast.error('Failed to load full analysis report');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl">My Analysis History</h1>
        <p className="text-muted-foreground">
          Review your past content analyses and access detailed reports
        </p>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search analyses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="url">URL Analysis</SelectItem>
                <SelectItem value="text">Text Analysis</SelectItem>
                <SelectItem value="image">Image Analysis</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="questionable">Questionable</SelectItem>
                <SelectItem value="debunked">Debunked</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="score">Sort by Score</SelectItem>
                <SelectItem value="title">Sort by Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{history.length}</div>
            <div className="text-sm text-muted-foreground">Total Analyses</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {history.filter(item => item.status === 'verified').length}
            </div>
            <div className="text-sm text-muted-foreground">Verified</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {history.filter(item => item.status === 'questionable').length}
            </div>
            <div className="text-sm text-muted-foreground">Questionable</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {history.filter(item => item.status === 'debunked').length}
            </div>
            <div className="text-sm text-muted-foreground">Debunked</div>
          </CardContent>
        </Card>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Loading your analysis history...</span>
              </div>
            </CardContent>
          </Card>
        ) : filteredHistory.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {history.length === 0 
                  ? "You haven't performed any analyses yet. Start by analyzing some content!"
                  : "No analyses found matching your criteria."
                }
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredHistory.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        {getTypeIcon(item.type || 'url')}
                        <span className="text-sm capitalize">{item.type} Analysis</span>
                      </div>
                      <Badge className={getStatusColor(item.status || '')}>
                        {item.status || 'unknown'}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {item.content}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        {
                          (() => {
                            const created = item.createdAt && typeof item.createdAt.toDate === 'function'
                              ? item.createdAt.toDate()
                              : (item.createdAt || item.date || '');
                            const dateObj = created ? new Date(created) : null;
                            return <span>{dateObj ? dateObj.toLocaleDateString() : 'Unknown'}</span>;
                          })()
                        }
                      </div>
                      <span>•</span>
                      <span>Analysis time: {item.timeSpent || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 ml-6">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Credibility Score</div>
                      <div className={`text-2xl font-bold ${getScoreColor(item.credibilityScore ?? 0)}`}>
                        {(item.credibilityScore ?? 0)}%
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleViewFullReport(item)}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredHistory.length > 0 && (
        <div className="text-center">
          <Button variant="outline">
            Load More Results
          </Button>
        </div>
      )}
    </div>
  );
}