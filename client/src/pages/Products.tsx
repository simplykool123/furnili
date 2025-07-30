import { useState, useEffect } from "react";
import ProductTable from "@/components/Products/ProductTable";
import ProductForm from "@/components/Products/ProductForm";
import BulkImportModal from "@/components/Products/BulkImportModal";
import BulkExportModal from "@/components/Products/BulkExportModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { authService } from "@/lib/auth";
import MobileProductTable from "@/components/Mobile/MobileProductTable";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const user = authService.getUser();
  const { isMobile } = useIsMobile();
  
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
      <div className="flex flex-wrap gap-3 mb-8">
        <BulkExportModal />
        {canManageProducts && (
          <BulkImportModal onSuccess={() => {
            // Refresh the table
            window.location.reload();
          }} />
        )}
        {canManageProducts && (
          <Button 
            onClick={() => setShowAddProduct(true)} 
            className="furnili-gradient hover:opacity-90 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Product
          </Button>
        )}
      </div>

      {isMobile ? (
        <MobileProductTable 
          onEdit={(product) => {
            setEditingProduct(product);
            setShowAddProduct(true);
          }}
          onDelete={(product) => {
            // Handle delete - could add confirmation dialog
            console.log("Delete product:", product);
          }}
          onView={(product) => {
            // Handle view details
            console.log("View product:", product);
          }}
        />
      ) : (
        <ProductTable />
      )}
      
      <Dialog open={showAddProduct} onOpenChange={(open) => {
        setShowAddProduct(open);
        if (!open) setEditingProduct(null);
      }}>
        <DialogContent className={`${isMobile ? 'max-w-[95vw] h-[95vh] p-0' : 'max-w-3xl'} overflow-hidden`} aria-describedby="product-form-description">
          <div className={`${isMobile ? 'h-full flex flex-col' : ''}`}>
            <DialogHeader className={`space-y-3 ${isMobile ? 'p-4 pb-2 border-b' : ''}`}>
              <DialogTitle className="text-xl font-semibold text-foreground">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
              <p id="product-form-description" className="text-sm text-muted-foreground">
                {editingProduct ? 'Update product information and inventory details' : 'Add a new product to the inventory system with complete specifications'}
            </p>
          </DialogHeader>
          <div className={`${isMobile ? 'flex-1 overflow-hidden' : ''}`}>
            <ProductForm 
              product={editingProduct} 
              onClose={() => {
                setShowAddProduct(false);
                setEditingProduct(null);
              }}
              isMobile={isMobile}
            />
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
