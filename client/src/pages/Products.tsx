import { useState } from "react";
import Layout from "@/components/Layout/Layout";
import ProductTable from "@/components/Products/ProductTable";
import ProductForm from "@/components/Products/ProductForm";
import BulkImportModal from "@/components/Products/BulkImportModal";
import BulkExportModal from "@/components/Products/BulkExportModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { authService } from "@/lib/auth";

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const user = authService.getUser();
  
  const canManageProducts = user && ['admin', 'manager'].includes(user.role);

  return (
    <Layout 
      title="Product Management" 
      subtitle="Manage your inventory products and stock levels"
      showAddButton={canManageProducts}
      onAddClick={() => setShowAddProduct(true)}
    >
      {/* Bulk Operations */}
      <div className="flex gap-2 mb-6">
        <BulkExportModal />
        {canManageProducts && (
          <BulkImportModal onSuccess={() => {
            // Refresh the table
            window.location.reload();
          }} />
        )}
      </div>

      <ProductTable />
      
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent className="max-w-2xl" aria-describedby="add-product-description">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <p id="add-product-description" className="sr-only">
              Form to add a new product to the inventory system
            </p>
          </DialogHeader>
          <ProductForm onClose={() => setShowAddProduct(false)} />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
