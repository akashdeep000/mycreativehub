import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Calendar, Clock, TrendingUp, Lightbulb, Mail } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-400 rounded-2xl flex items-center justify-center shadow-lg">
              <Palette className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-serif font-bold text-gray-800 mb-4">
            Your Creative Business Toolkit
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            The complete digital workspace that transforms how creative entrepreneurs 
            plan, organize, and scale their business. Beautiful tools that actually 
            work the way you think.
          </p>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg font-serif">Content Planning</CardTitle>
              <CardDescription>
                Monthly calendars, batch planning, and content workflows
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-lg font-serif">Time Blocking</CardTitle>
              <CardDescription>
                Daily planners, focus sessions, and productivity trackers
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg font-serif">Finance Tracker</CardTitle>
              <CardDescription>
                Revenue goals, expense tracking, and profit analysis
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg font-serif">Inspiration Hub</CardTitle>
              <CardDescription>
                Mood boards, color palettes, and creative references
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-indigo-600" />
              </div>
              <CardTitle className="text-lg font-serif">Email Systems</CardTitle>
              <CardDescription>
                Templates, sequences, and automation workflows
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-pink-100 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-pink-600" />
              </div>
              <CardTitle className="text-lg font-serif">Affiliate Marketing</CardTitle>
              <CardDescription>
                Partner programs, commission tracking, and strategies
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto border-pink-100 bg-gradient-to-r from-pink-50 to-purple-50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-4">
                Ready to transform your creative business?
              </h2>
              <p className="text-gray-600 mb-6">
                Join thousands of creative entrepreneurs who've streamlined their workflow 
                and boosted their productivity with our toolkit.
              </p>
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8 py-3 rounded-full"
                onClick={() => window.location.href = '/api/login'}
              >
                Start Your Journey
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
