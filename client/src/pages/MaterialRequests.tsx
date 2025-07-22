import { useState } from "react";
import RequestTable from "@/components/Requests/RequestTable";
import RequestFormSimplified from "@/components/Requests/RequestFormSimplified";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authService } from "@/lib/auth";
import { Plus } from "lucide-react";

export default function MaterialRequests() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const user = authService.getUser();
  
  const canCreateRequests = user && ['user', 'manager', 'admin', 'staff'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Material Requests</h2>
          <p className="text-sm text-muted-foreground">Manage and track material request workflows</p>
        </div>
        {canCreateRequests && (
          <Button onClick={() => setShowNewRequest(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      <RequestTable />
      
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="new-request-description">
          <DialogHeader>
            <DialogTitle>Create New Material Request</DialogTitle>
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
