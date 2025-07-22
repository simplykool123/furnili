import { useState, useEffect } from "react";
import ProductTable from "@/components/Products/ProductTable";
import ProductForm from "@/components/Products/ProductForm";
import BulkImportModal from "@/components/Products/BulkImportModal";
import BulkExportModal from "@/components/Products/BulkExportModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { authService } from "@/lib/auth";

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const user = authService.getUser();
  
  const canManageProducts = user && ['admin', 'manager'].includes(user.role);

  // Listen for the add product event from Layout
  useEffect(() => {
    const handleOpenAddProduct = () => {
      if (canManageProducts) {
        setShowAddProduct(true);
      }
    };

    const handleOpenEditProduct = (event: any) => {
      if (canManageProducts) {
        setEditingProduct(event.detail);
        setShowAddProduct(true);
      }
    };

    window.addEventListener('openAddProductModal', handleOpenAddProduct);
    window.addEventListener('openEditProductModal', handleOpenEditProduct);
    return () => {
      window.removeEventListener('openAddProductModal', handleOpenAddProduct);
      window.removeEventListener('openEditProductModal', handleOpenEditProduct);
    };
  }, [canManageProducts]);

  return (
    <>
      {/* Bulk Operations */}
      <div className="flex gap-2 mb-6">
        <BulkExportModal />
        {canManageProducts && (
          <BulkImportModal onSuccess={() => {
            // Refresh the table
            window.location.reload();
          }} />
        )}
        {canManageProducts && (
          <Button onClick={() => setShowAddProduct(true)} className="h-9">
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        )}
      </div>

      <ProductTable />
      
      <Dialog open={showAddProduct} onOpenChange={(open) => {
        setShowAddProduct(open);
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent className="max-w-2xl" aria-describedby="product-form-description">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <p id="product-form-description" className="sr-only">
              {editingProduct ? 'Form to edit existing product' : 'Form to add a new product to the inventory system'}
            </p>
          </DialogHeader>
          <ProductForm 
            product={editingProduct}
            onClose={() => {
              setShowAddProduct(false);
              setEditingProduct(null);
            }} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
