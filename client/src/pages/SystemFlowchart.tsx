import FurniliLayout from "@/components/Layout/FurniliLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

export default function SystemFlowchart() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/furnili-system-flowchart.svg';
    link.download = 'furnili-system-architecture-flowchart.svg';
    link.click();
  };

  return (
    <FurniliLayout title="Workflow" subtitle="Complete workflow and module integration diagram">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Workflow</h1>
            <p className="text-gray-600 mt-1">Complete workflow and module integration diagram</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => setIsFullscreen(!isFullscreen)}
              variant="outline"
              size="sm"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="mr-2 h-4 w-4" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Fullscreen
                </>
              )}
            </Button>
            <Button onClick={handleDownload} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download SVG
            </Button>
          </div>
        </div>

        <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
          <CardHeader className={isFullscreen ? "pb-2" : ""}>
            <CardTitle className="text-lg">Furnili Management System</CardTitle>
            {!isFullscreen && (
              <p className="text-sm text-gray-600">
                Interactive system architecture showing all modules, workflows, and integrations
              </p>
            )}
          </CardHeader>
          <CardContent className={isFullscreen ? "h-full overflow-auto p-2" : "p-2"}>
            <div className={`w-full ${isFullscreen ? "h-full" : "h-[800px]"} overflow-auto border rounded-lg bg-gray-50`}>
              <img 
                src="/furnili-system-flowchart.svg" 
                alt="Furnili System Architecture Flowchart"
                className="w-full h-auto min-w-[1400px]"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </CardContent>
        </Card>

        {!isFullscreen && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">📊 Dashboard & Analytics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time KPIs and statistics</li>
                  <li>• Role-specific dashboard views</li>
                  <li>• Activity timeline & notifications</li>
                  <li>• Mobile-responsive design</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">📋 Material Request Workflow</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 4-stage approval process</li>
                  <li>• BOQ processing with OCR</li>
                  <li>• Role-based action buttons</li>
                  <li>• Stock validation & alerts</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">💰 Quote Management</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Professional PDF generation</li>
                  <li>• WhatsApp sharing integration</li>
                  <li>• Automated calculations</li>
                  <li>• Status tracking & management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">🔐 Authentication & Security</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• JWT-based authentication</li>
                  <li>• 4-role access control system</li>
                  <li>• Protected routes & components</li>
                  <li>• Session management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">📦 Product & Inventory</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Real-time stock tracking</li>
                  <li>• SKU & category management</li>
                  <li>• Low stock alerts</li>
                  <li>• Movement audit trails</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⚙️ Technical Stack</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• React + TypeScript frontend</li>
                  <li>• Express.js + Drizzle backend</li>
                  <li>• Supabase PostgreSQL database</li>
                  <li>• Mobile-first responsive design</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </FurniliLayout>
  );
}