import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useLocation } from 'wouter';
import Sidebar from '@/components/layout/sidebar';

export default function LaunchGrowthPlanTest() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 lg:pl-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/launch')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Product Launch
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Launch Growth Plan</h1>
                  <p className="text-gray-600">Reflect on your launch and plan strategic growth</p>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Growth Plan - Test Version</CardTitle>
            </CardHeader>
            <CardContent>
              <p>This is a test version of the Launch Growth Plan page. The routing is working correctly!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}