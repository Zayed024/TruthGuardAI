import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '../ui/sidebar';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, AlertTriangle, CheckCircle, TrendingUp, Activity } from 'lucide-react';

const mockAnalyticsData = {
  analysesPerDay: [
    { date: '2024-01-15', analyses: 1240 },
    { date: '2024-01-16', analyses: 1380 },
    { date: '2024-01-17', analyses: 1520 },
    { date: '2024-01-18', analyses: 1290 },
    { date: '2024-01-19', analyses: 1650 },
    { date: '2024-01-20', analyses: 1780 },
    { date: '2024-01-21', analyses: 1450 }
  ],
  analysisTypeBreakdown: [
    { name: 'URL Analysis', value: 45, count: 2250 },
    { name: 'Text Analysis', value: 35, count: 1750 },
    { name: 'Image Analysis', value: 20, count: 1000 }
  ],
  credibilityDistribution: [
    { range: '0-20%', count: 145, color: '#dc3545' },
    { range: '21-40%', count: 267, color: '#fd7e14' },
    { range: '41-60%', count: 423, color: '#ffc107' },
    { range: '61-80%', count: 672, color: '#20c997' },
    { range: '81-100%', count: 1293, color: '#28a745' }
  ]
};

const COLORS = ['#1e40af', '#dc3545', '#28a745', '#ffc107'];

interface AdminDashboardProps {
  onLogout: () => void;
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState('analytics');

  const menuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'watchlist', label: 'Watchlist Queue', icon: AlertTriangle },
    { id: 'users', label: 'User Management', icon: Users }
  ];

  const renderAnalytics = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-6">Platform Analytics</h2>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Analyses</p>
                  <p className="text-3xl font-bold">12,847</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-3xl font-bold">3,247</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600">+8%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Flagged Content</p>
                  <p className="text-3xl font-bold">1,429</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-red-600">+5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Accuracy Rate</p>
                  <p className="text-3xl font-bold">94.2%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <span className="text-green-600">+2%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Daily Analysis Volume</CardTitle>
              <CardDescription>Number of analyses performed per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockAnalyticsData.analysesPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="analyses" stroke="#1e40af" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analysis Type Distribution</CardTitle>
              <CardDescription>Breakdown by content type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockAnalyticsData.analysisTypeBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockAnalyticsData.analysisTypeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Credibility Score Distribution</CardTitle>
            <CardDescription>Distribution of content credibility scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockAnalyticsData.credibilityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e40af" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderWatchlistQueue = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Community Watchlist Queue</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Submissions</CardTitle>
          <CardDescription>URLs submitted by the community for verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { url: 'https://suspicious-news-site.com/fake-story', user: 'user123@email.com', date: '2024-01-21' },
              { url: 'https://clickbait-central.net/misleading-headline', user: 'concerned_citizen@email.com', date: '2024-01-21' },
              { url: 'https://conspiracy-hub.org/unverified-claims', user: 'fact_checker@email.com', date: '2024-01-20' },
              { url: 'https://medical-misinformation.com/dangerous-advice', user: 'health_professional@email.com', date: '2024-01-20' },
              { url: 'https://political-propaganda.net/biased-report', user: 'voter2024@email.com', date: '2024-01-19' }
            ].map((submission, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/20">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{submission.url}</p>
                  <p className="text-sm text-muted-foreground">
                    Submitted by {submission.user} on {new Date(submission.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">
                    Approve
                  </button>
                  <button className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">User Management</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
          <CardDescription>Manage platform users and their access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search users..."
              className="w-full p-2 border rounded-lg"
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Sign Up Date</th>
                  <th className="text-left p-3">Analyses</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { email: 'john.doe@email.com', signUpDate: '2024-01-15', analyses: 23, status: 'Active' },
                  { email: 'researcher@university.edu', signUpDate: '2024-01-10', analyses: 156, status: 'Active' },
                  { email: 'journalist@news.com', signUpDate: '2024-01-08', analyses: 89, status: 'Active' },
                  { email: 'suspicious@email.com', signUpDate: '2024-01-20', analyses: 1, status: 'Suspended' },
                  { email: 'factchecker@org.net', signUpDate: '2024-01-05', analyses: 267, status: 'Active' }
                ].map((user, index) => (
                  <tr key={index} className="border-b hover:bg-secondary/20">
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">{new Date(user.signUpDate).toLocaleDateString()}</td>
                    <td className="p-3">{user.analyses}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button className="text-primary hover:underline text-sm mr-2">
                        View Details
                      </button>
                      {user.status === 'Active' ? (
                        <button className="text-red-600 hover:underline text-sm">
                          Suspend
                        </button>
                      ) : (
                        <button className="text-green-600 hover:underline text-sm">
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics':
        return renderAnalytics();
      case 'watchlist':
        return renderWatchlistQueue();
      case 'users':
        return renderUserManagement();
      default:
        return renderAnalytics();
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-lg font-semibold px-4 py-3">
                TruthGuard Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          onClick={() => setActiveSection(item.id)}
                          isActive={activeSection === item.id}
                          className="w-full justify-start"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <div className="mt-auto p-4">
              <button
                onClick={onLogout}
                className="w-full p-2 text-left text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-x-hidden">
          <div className="p-6">
            <div className="flex items-center mb-6">
              <SidebarTrigger className="md:hidden mr-4" />
              <div className="flex items-center justify-between w-full">
                <div>
                  <h1 className="text-3xl font-semibold">Admin Dashboard</h1>
                  <p className="text-muted-foreground">Manage and monitor the TruthGuard AI platform</p>
                </div>
              </div>
            </div>
            
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}