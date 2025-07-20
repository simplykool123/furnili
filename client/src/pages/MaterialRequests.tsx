import { useState } from "react";
import Layout from "@/components/Layout/Layout";
import RequestTable from "@/components/Requests/RequestTable";
import RequestForm from "@/components/Requests/RequestForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService } from "@/lib/auth";

export default function MaterialRequests() {
  const [showNewRequest, setShowNewRequest] = useState(false);
  const user = authService.getUser();
  
  const canCreateRequests = user && ['user', 'manager', 'admin'].includes(user.role);

  return (
    <Layout 
      title="Material Requests" 
      subtitle="Manage and track all material request workflows"
      showAddButton={canCreateRequests}
      onAddClick={() => setShowNewRequest(true)}
    >
      <RequestTable />
      
      <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Material Request</DialogTitle>
          </DialogHeader>
          <RequestForm onClose={() => setShowNewRequest(false)} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
