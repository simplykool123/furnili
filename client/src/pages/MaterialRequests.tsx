import { useState } from "react";
import RequestTable from "@/components/Requests/RequestTable";
import RequestForm from "@/components/Requests/RequestForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService } from "@/lib/auth";

export default function MaterialRequests() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const user = authService.getUser();
  
  const canCreateRequests = user && ['user', 'manager', 'admin'].includes(user.role);

  return (
    <>
      <RequestTable />
      
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="new-request-description">
          <DialogHeader>
            <DialogTitle>Create New Material Request</DialogTitle>
            <p id="new-request-description" className="sr-only">
              Form to create a new material request with client details and product items
            </p>
          </DialogHeader>
          <RequestForm onClose={() => setShowNewRequest(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
