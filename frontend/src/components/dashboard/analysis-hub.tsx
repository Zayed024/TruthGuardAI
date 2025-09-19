import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Upload, Link, FileText, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAnalysisHistory } from '../../utils/auth/analysis-hooks';
import { toast } from 'sonner@2.0.3';

interface AnalysisResult {
  credibilityScore: number;
  status: 'verified' | 'questionable' | 'debunked';
  summary: string;
  sources: Array<{
    name: string;
    credibility: 'high' | 'medium' | 'low';
    url: string;
  }>;
  factChecks: Array<{
    claim: string;
    verdict: 'true' | 'false' | 'mixed';
    source: string;
  }>;
}

export function AnalysisHub() {
  const [activeTab, setActiveTab] = useState('url');
  const [analysisInput, setAnalysisInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { saveAnalysis } = useAnalysisHistory();

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate title based on content
      let title = '';
      let content = '';
      
      if (activeTab === 'url') {
        title = `URL Analysis: ${new URL(analysisInput).hostname}`;
        content = analysisInput;
      } else if (activeTab === 'text') {
        title = `Text Analysis: ${analysisInput.substring(0, 50)}...`;
        content = analysisInput;
      } else {
        title = `Image Analysis: ${uploadedFile?.name || 'Uploaded Image'}`;
        content = uploadedFile?.name || 'uploaded_image.jpg';
      }
      
      // Mock result based on input
      const mockResult: AnalysisResult = {
        credibilityScore: activeTab === 'url' && analysisInput.includes('fake') ? 25 : 
                         activeTab === 'text' && analysisInput.toLowerCase().includes('conspiracy') ? 15 : 85,
        status: activeTab === 'url' && analysisInput.includes('fake') ? 'debunked' :
                activeTab === 'text' && analysisInput.toLowerCase().includes('conspiracy') ? 'debunked' : 'verified',
        summary: activeTab === 'url' && analysisInput.includes('fake') 
          ? 'This content has been flagged by multiple fact-checking organizations as containing false information.'
          : activeTab === 'text' && analysisInput.toLowerCase().includes('conspiracy')
          ? 'This text contains unsubstantiated conspiracy theories that have been debunked by credible sources.'
          : 'Content appears to be from credible sources with supporting evidence.',
        sources: [
          { name: 'Reuters', credibility: 'high', url: 'https://reuters.com' },
          { name: 'Associated Press', credibility: 'high', url: 'https://apnews.com' },
          { name: 'BBC News', credibility: 'high', url: 'https://bbc.com' }
        ],
        factChecks: [
          { claim: 'Primary claim in content', verdict: 'true', source: 'Snopes' },
          { claim: 'Supporting statistic mentioned', verdict: 'true', source: 'PolitiFact' }
        ]
      };
      
      setResult(mockResult);
      
      // Save analysis to user's history
      try {
        await saveAnalysis({
          type: activeTab as 'url' | 'text' | 'image',
          title,
          content,
          credibilityScore: mockResult.credibilityScore,
          status: mockResult.status,
          date: new Date().toISOString().split('T')[0],
          timeSpent: '3 minutes'
        });
        
        toast.success('Analysis saved to your history');
      } catch (error) {
        console.error('Failed to save analysis:', error);
        // Don't show error to user as the analysis still works
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>;
      case 'questionable':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Questionable
        </Badge>;
      case 'debunked':
        return <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Debunked
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl">Analysis Hub</h1>
        <p className="text-muted-foreground">
          Analyze URLs, text content, or images to verify their credibility and authenticity
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Content Analysis</CardTitle>
          <CardDescription>
            Select the type of content you want to analyze
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <Link className="w-4 h-4" />
                Analyze URL
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Analyze Text
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="url-input">Enter URL to analyze</Label>
                <Input
                  id="url-input"
                  placeholder="https://example.com/article"
                  value={analysisInput}
                  onChange={(e) => setAnalysisInput(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAnalysis}
                disabled={!analysisInput || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze URL'}
              </Button>
            </TabsContent>

            <TabsContent value="text" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="text-input">Paste text content to analyze</Label>
                <Textarea
                  id="text-input"
                  placeholder="Paste the text content you want to verify..."
                  rows={5}
                  value={analysisInput}
                  onChange={(e) => setAnalysisInput(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleAnalysis}
                disabled={!analysisInput || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Text'}
              </Button>
            </TabsContent>

            <TabsContent value="image" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="image-input">Upload image to analyze</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    id="image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="image-input" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {uploadedFile ? uploadedFile.name : 'Click to upload an image'}
                    </p>
                  </label>
                </div>
              </div>
              <Button 
                onClick={handleAnalysis}
                disabled={!uploadedFile || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold">Analyzing Content...</h3>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
              <Progress value={33} className="w-full" />
              <div className="text-xs text-center text-muted-foreground">
                Checking sources and cross-referencing databases...
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !isAnalyzing && (
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Analysis Results</span>
                {getStatusBadge(result.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Credibility Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Credibility Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(result.credibilityScore)}`}>
                    {result.credibilityScore}%
                  </span>
                </div>
                <Progress value={result.credibilityScore} className="h-3" />
              </div>

              <Separator />

              {/* Summary */}
              <div>
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-muted-foreground">{result.summary}</p>
              </div>

              <Separator />

              {/* Sources */}
              <div>
                <h4 className="font-semibold mb-3">Source Analysis</h4>
                <div className="grid gap-3">
                  {result.sources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                      <div>
                        <span className="font-medium">{source.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 ${
                            source.credibility === 'high' ? 'border-green-200 text-green-700' :
                            source.credibility === 'medium' ? 'border-yellow-200 text-yellow-700' :
                            'border-red-200 text-red-700'
                          }`}
                        >
                          {source.credibility} credibility
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={source.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Fact Checks */}
              <div>
                <h4 className="font-semibold mb-3">Fact Check Results</h4>
                <div className="space-y-3">
                  {result.factChecks.map((check, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{check.claim}</p>
                          <p className="text-xs text-muted-foreground mt-1">Source: {check.source}</p>
                        </div>
                        <Badge 
                          className={`ml-2 ${
                            check.verdict === 'true' ? 'bg-green-100 text-green-800' :
                            check.verdict === 'mixed' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          {check.verdict}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}