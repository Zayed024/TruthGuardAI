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
import { Upload, Link, FileText, AlertTriangle, CheckCircle, XCircle, ExternalLink, Youtube } from 'lucide-react';
import { useAnalysisHistory } from '../../utils/auth/analysis-hooks';
import { toast } from 'sonner';

interface AnalysisResult {
  initial_analysis: {
    credibility_score: number;
    explanation: string;
  };
  source_analysis: {
    political_bias: string;
    factuality_rating: string;
  };
  fact_checks: Array<{
    claim: string;
    status: string;
    publisher?: string;
    rating?: string;
    url?: string;
  }>;
  visual_context?: Array<{
    keyframe_base64: string;
    context: string;
  }>;
  reverse_image_search_url?: string;
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
    setResult(null); // Clear previous results

    // The base URL for your FastAPI backend
    const API_BASE_URL = 'http://127.0.0.1:8000';
    let endpoint = '';
    let body = {};

    try {
      if (activeTab === 'youtube') {
        endpoint = `${API_BASE_URL}/v2/analyze_video`;
        body = { url: analysisInput };
      } else if (activeTab === 'url' || activeTab === 'text') {
        endpoint = `${API_BASE_URL}/v2/analyze`;
        body = {
          // For URL analysis, we need to get the text first.
          // In a real app, you'd scrape this. For now, we'll send the URL as text.
          text: analysisInput,
          url: activeTab === 'url' ? analysisInput : 'http://example.com' // Use a placeholder for text analysis
        };
      } else if (activeTab === 'image' && uploadedFile) {
        // Use the new upload endpoint for direct image analysis
        endpoint = `${API_BASE_URL}/v2/upload_and_analyze_image`;

        // Create FormData to send the file
        const formData = new FormData();
        formData.append('file', uploadedFile);

        // Use FormData instead of JSON for file upload
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Image analysis failed.');
        }

        const data: AnalysisResult = await response.json();
        setResult(data);

        // Save the analysis to history
        await saveAnalysis({
          type: 'image',
          title: `Image Analysis: ${uploadedFile.name}`,
          content: `Uploaded image: ${uploadedFile.name}`,
          credibilityScore: data.initial_analysis.credibility_score,
          status: data.initial_analysis.credibility_score > 70 ? 'verified' : data.initial_analysis.credibility_score > 40 ? 'questionable' : 'debunked',
          date: new Date().toISOString().split('T')[0],
          timeSpent: 'N/A'
        });
        toast.success('Image analysis complete and saved to history.');

      } else {
        throw new Error("Invalid analysis type or missing input.");
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Analysis failed in the backend.');
      }

      const data: AnalysisResult = await response.json();
      setResult(data);

      // Save the real analysis to history
      await saveAnalysis({
        type: activeTab as 'url' | 'text' | 'image' | 'youtube',
        title: `Analysis: ${analysisInput.substring(0, 50)}...`,
        content: analysisInput,
        credibilityScore: data.initial_analysis.credibility_score,
        status: data.initial_analysis.credibility_score > 70 ? 'verified' : data.initial_analysis.credibility_score > 40 ? 'questionable' : 'debunked',
        date: new Date().toISOString().split('T')[0],
        timeSpent: 'N/A'
      });
      toast.success('Analysis complete and saved to history.');

    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
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
          Analyze URLs, text content, YouTube videos, or images to verify their credibility and authenticity
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
            <TabsList className="flex w-full h-10">
              <TabsTrigger value="url" className="flex items-center gap-2 px-4 py-2 text-sm">
                <Link className="w-4 h-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="text" className="flex items-center gap-2 px-4 py-2 text-sm">
                <FileText className="w-4 h-4" />
                Text
              </TabsTrigger>
              <TabsTrigger value="youtube" className="flex items-center gap-2 px-4 py-2 text-sm">
                <Youtube className="w-4 h-4" />
                Video
              </TabsTrigger>
              <TabsTrigger value="image" className="flex items-center gap-2 px-4 py-2 text-sm">
                <Upload className="w-4 h-4" />
                Image
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

            <TabsContent value="youtube" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="youtube-input">Enter YouTube video URL</Label>
                <Input
                  id="youtube-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={analysisInput}
                  onChange={(e) => setAnalysisInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAnalysis}
                disabled={!analysisInput || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze YouTube Video'}
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
                {/* Dynamically determine status from score */}
                {getStatusBadge(
                  result.initial_analysis.credibility_score > 70 ? 'verified' :
                  result.initial_analysis.credibility_score > 40 ? 'questionable' : 'debunked'
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Credibility Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Credibility Score</span>
                  <span className={`text-2xl font-bold ${getScoreColor(result.initial_analysis.credibility_score)}`}>
                    {result.initial_analysis.credibility_score}%
                  </span>
                </div>
                <Progress value={result.initial_analysis.credibility_score} className="h-3" />
              </div>

              <Separator />

              {/* Summary */}
              <div>
                <h4 className="font-semibold mb-2">Summary</h4>
                <p className="text-muted-foreground">{result.initial_analysis.explanation}</p>
              </div>

              <Separator />

              {/* Source Analysis */}
              <div>
                <h4 className="font-semibold mb-3">Source Analysis</h4>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">
                    Bias: {result.source_analysis.political_bias}
                  </Badge>
                  <Badge variant="outline">
                    Factuality: {result.source_analysis.factuality_rating}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Visual Context for Videos */}
              {result.visual_context && result.visual_context.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Visual Context (Keyframes)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.visual_context.map((frame, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <img
                          src={`data:image/jpeg;base64,${frame.keyframe_base64}`}
                          alt={`Keyframe ${index + 1}`}
                          className="rounded-md mb-2"
                        />
                        <p className="text-xs text-muted-foreground">{frame.context}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Fact Checks */}
              {result.fact_checks && result.fact_checks.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Fact Check Results</h4>
                  <div className="space-y-3">
                    {result.fact_checks.map((check, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{check.claim}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Status: {check.status}
                              {check.publisher && ` - ${check.publisher}`}
                            </p>
                          </div>
                          {check.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={check.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}