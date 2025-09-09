import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { 
  MessageCircle, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Smartphone,
  Zap
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface WhatsAppStatus {
  connected: boolean;
  qrCode?: string;
  phoneNumber?: string;
  lastConnected?: string;
}

export default function WhatsAppSettings() {
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Check WhatsApp connection status
  const checkStatus = async () => {
    try {
      const response = await apiRequest("/api/whatsapp/status");
      setStatus(response);
    } catch (error) {
      console.error("Failed to check WhatsApp status:", error);
    }
  };

  // Generate new QR code for linking
  const generateQRCode = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("/api/whatsapp/generate-qr", {
        method: "POST"
      });
      
      setStatus(prev => ({
        ...prev,
        qrCode: response.qrCode,
        connected: false
      }));
      
      toast({
        title: "QR Code Generated",
        description: "Scan the QR code with your WhatsApp to connect the bot"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Disconnect WhatsApp
  const disconnect = async () => {
    setLoading(true);
    try {
      await apiRequest("/api/whatsapp/disconnect", {
        method: "POST"
      });
      
      setStatus({ connected: false });
      
      toast({
        title: "Disconnected",
        description: "WhatsApp bot has been disconnected"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    
    // Check status every 5 seconds if not connected
    const interval = setInterval(() => {
      if (!status.connected) {
        checkStatus();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status.connected]);

  return (
    <ResponsiveLayout title="WhatsApp Settings">
      <div className="space-y-6">
        
        {/* Connection Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              WhatsApp Bot Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {status.connected ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-600">Connected</p>
                      {status.phoneNumber && (
                        <p className="text-sm text-gray-600">Phone: {status.phoneNumber}</p>
                      )}
                      {status.lastConnected && (
                        <p className="text-xs text-gray-500">
                          Last connected: {new Date(status.lastConnected).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-medium text-red-500">Not Connected</p>
                      <p className="text-sm text-gray-600">WhatsApp bot is not linked</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex gap-2">
                {status.connected ? (
                  <Button 
                    onClick={disconnect} 
                    disabled={loading}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Disconnect
                  </Button>
                ) : (
                  <Button 
                    onClick={generateQRCode} 
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Connect WhatsApp
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Display */}
        {status.qrCode && !status.connected && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-600" />
                Scan QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="bg-white p-6 rounded-lg border inline-block mb-4">
                <img 
                  src={`data:image/png;base64,${status.qrCode}`} 
                  alt="WhatsApp QR Code" 
                  className="w-64 h-64"
                />
              </div>
              
              <div className="space-y-2">
                <p className="font-medium text-gray-800">Follow these steps:</p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="flex items-center gap-2 justify-center">
                    <Smartphone className="w-4 h-4" />
                    1. Open WhatsApp on your phone
                  </p>
                  <p className="flex items-center gap-2 justify-center">
                    <QrCode className="w-4 h-4" />
                    2. Go to Settings → Linked Devices
                  </p>
                  <p className="flex items-center gap-2 justify-center">
                    <Zap className="w-4 h-4" />
                    3. Tap "Link a Device" and scan this QR code
                  </p>
                </div>
              </div>
              
              <Badge variant="outline" className="mt-4">
                QR code will expire in 45 seconds
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* How it Works */}
        <Card>
          <CardHeader>
            <CardTitle>How WhatsApp Bot Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-xs">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Bot Activation</p>
                  <p>The bot only responds when you explicitly use sharing features - it won't interfere with your regular WhatsApp messages.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-xs">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Secure Connection</p>
                  <p>Your WhatsApp is linked securely. You can disconnect anytime from this page.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-xs">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">Easy Re-linking</p>
                  <p>If connection is lost, simply come back to this page and generate a new QR code.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </ResponsiveLayout>
  );
}