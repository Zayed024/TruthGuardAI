import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MisinformationHotspot {
  state: string;
  intensity: 'high' | 'medium' | 'low';
  incidents: number;
  topTopic: string;
}

const mockTrendingTopics = [
  { text: 'vaccine', size: 45, category: 'health' },
  { text: 'election', size: 38, category: 'politics' },
  { text: 'climate', size: 32, category: 'science' },
  { text: 'economy', size: 28, category: 'finance' },
  { text: 'conspiracy', size: 25, category: 'general' },
  { text: 'celebrity', size: 22, category: 'entertainment' },
  { text: 'technology', size: 20, category: 'tech' },
  { text: 'government', size: 18, category: 'politics' },
  { text: 'research', size: 15, category: 'science' },
  { text: 'social media', size: 12, category: 'tech' }
];

const mockLowCredibilitySources = [
  { name: 'FakeNewsDaily.com', incidents: 145, trend: 'up' },
  { name: 'ConspiracyHub.net', incidents: 128, trend: 'down' },
  { name: 'ClickbaitNews.org', incidents: 112, trend: 'up' },
  { name: 'UnverifiedReports.com', incidents: 89, trend: 'stable' },
  { name: 'BiasedTruth.info', incidents: 76, trend: 'up' }
];

const mockHotspots: MisinformationHotspot[] = [
  { state: 'Maharashtra', intensity: 'high', incidents: 234, topTopic: 'Political Misinformation' },
  { state: 'Uttar Pradesh', intensity: 'high', incidents: 198, topTopic: 'Health Misinformation' },
  { state: 'Gujarat', intensity: 'medium', incidents: 156, topTopic: 'Economic Claims' },
  { state: 'Tamil Nadu', intensity: 'medium', incidents: 143, topTopic: 'Celebrity Rumors' },
  { state: 'Karnataka', intensity: 'medium', incidents: 132, topTopic: 'Technology Scams' },
  { state: 'West Bengal', intensity: 'low', incidents: 98, topTopic: 'Social Issues' },
  { state: 'Rajasthan', intensity: 'low', incidents: 87, topTopic: 'Cultural Claims' },
  { state: 'Kerala', intensity: 'low', incidents: 76, topTopic: 'Environmental Issues' }
];

export function TrendsDashboard() {
  const [timeRange, setTimeRange] = useState('7days');
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '→';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl">Misinformation Trends</h1>
          <p className="text-muted-foreground">
            Real-time insights into misinformation patterns across India
          </p>
        </div>
        
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24hours">Last 24 Hours</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Interactive Map */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Misinformation Hotspots - India</CardTitle>
              <CardDescription>
                Click on states to view detailed information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative bg-secondary/10 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
                {/* Simplified India Map Representation */}
                <div className="text-center space-y-4">
                  <div className="text-6xl">🇮🇳</div>
                  <p className="text-muted-foreground">Interactive Map of India</p>
                  <p className="text-sm text-muted-foreground">
                    Showing misinformation intensity by region
                  </p>
                </div>
                
                {/* Hotspot Legend */}
                <div className="absolute bottom-4 left-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-sm">High Activity</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Medium Activity</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm">Low Activity</span>
                  </div>
                </div>
              </div>
              
              {/* State Statistics */}
              <div className="mt-6 space-y-2 max-h-40 overflow-y-auto">
                {mockHotspots.map((hotspot) => (
                  <div
                    key={hotspot.state}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-secondary/20 ${
                      selectedState === hotspot.state ? 'bg-secondary/30' : ''
                    }`}
                    onClick={() => setSelectedState(
                      selectedState === hotspot.state ? null : hotspot.state
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getIntensityColor(hotspot.intensity) }}
                      />
                      <span className="font-medium">{hotspot.state}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{hotspot.incidents} incidents</div>
                      <div className="text-xs text-muted-foreground">{hotspot.topTopic}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trending Topics Word Cloud */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trending Misinformation Topics</CardTitle>
              <CardDescription>Most discussed misleading topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 justify-center">
                {mockTrendingTopics.map((topic, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className={`text-sm cursor-pointer hover:bg-secondary/20`}
                    style={{ 
                      fontSize: `${Math.max(0.7, topic.size / 50)}rem`,
                      padding: '4px 8px'
                    }}
                  >
                    {topic.text}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
              <CardDescription>Current {timeRange} overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">1,247</div>
                <div className="text-sm text-red-700">Flagged Articles</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">3,891</div>
                <div className="text-sm text-yellow-700">Under Review</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">12,456</div>
                <div className="text-sm text-green-700">Verified Accurate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Low Credibility Sources Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Trending Low-Credibility Sources</CardTitle>
          <CardDescription>
            Sources with the highest misinformation incidents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockLowCredibilitySources}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidents" fill="#dc3545" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Trend Indicators */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {mockLowCredibilitySources.map((source, index) => (
              <div key={index} className="text-center p-2 border rounded">
                <div className="font-medium text-sm truncate" title={source.name}>
                  {source.name}
                </div>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <span className="text-xs">{source.incidents}</span>
                  <span>{getTrendIcon(source.trend)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}