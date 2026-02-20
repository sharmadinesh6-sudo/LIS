import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats } from '@/lib/api';
import { Users, TestTube, AlertCircle, Clock, CheckCircle, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div>Loading...</div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div data-testid="dashboard-page">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            Dashboard
          </h1>
          <p className="text-slate-600 mt-2">NABL Compliant Laboratory Information System</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Patients</CardTitle>
              <Users className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {stats?.total_patients || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Samples Today</CardTitle>
              <TestTube className="h-5 w-5 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                {stats?.total_samples_today || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending Results</CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600" style={{ fontFamily: 'Manrope' }}>
                {stats?.pending_results || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Critical Values</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600" style={{ fontFamily: 'Manrope' }}>
                {stats?.critical_results || 0}
              </div>
              <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">TAT Breaches</CardTitle>
              <Clock className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600" style={{ fontFamily: 'Manrope' }}>
                {stats?.tat_breaches || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">System Status</CardTitle>
              <Activity className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">All Systems Operational</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sample Status Overview */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Sample Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats?.samples_by_status && Object.entries(stats.samples_by_status).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                    {count}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 capitalize">{status.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
}