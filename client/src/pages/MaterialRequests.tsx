import { useState } from "react";
import RequestTable from "@/components/Requests/RequestTable";
import RequestFormSimplified from "@/components/Requests/RequestFormSimplified";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth";
import { Plus, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";

export default function MaterialRequests() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [, setLocation] = useLocation();
  const user = authService.getUser();
  const { isMobile } = useIsMobile();
  
  const canCreateRequests = user && ['user', 'manager', 'admin', 'staff'].includes(user.role);
  const canUploadBOQ = user && ['manager', 'admin', 'staff'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Mobile-optimized Header */}
      <MobileCard className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <MobileHeading>Material Requests</MobileHeading>
            <MobileText>Manage and track material request workflows</MobileText>
          </div>
          <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
            {canCreateRequests && (
              <Button 
                onClick={() => setShowNewRequest(true)}
                className={`furnili-gradient hover:opacity-90 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 ${isMobile ? 'w-full' : ''}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Request
              </Button>
            )}
            {canUploadBOQ && (
              <Button 
                onClick={() => setLocation('/boq')}
                variant="outline"
                className={`border-amber-200 hover:bg-amber-50 text-amber-700 font-medium shadow-md hover:shadow-lg transition-all duration-200 ${isMobile ? 'w-full' : ''}`}
              >
                <FileText className="w-4 h-4 mr-2" />
                BOQ Upload
              </Button>
            )}
          </div>
        </div>
      </MobileCard>

      <RequestTable />
      
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent 
          className={`${isMobile ? 'max-w-[95vw] max-h-[90vh] m-2' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto mobile-scroll`} 
          aria-describedby="new-request-description"
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-foreground`}>
              Create New Material Request
            </DialogTitle>
            <p id="new-request-description" className="sr-only">
              Form to create a new material request with client details and product items
            </p>
          </DialogHeader>
          <RequestFormSimplified onClose={() => setShowNewRequest(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
