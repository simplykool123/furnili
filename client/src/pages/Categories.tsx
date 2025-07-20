import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Package, Tag, Users, Settings } from "lucide-react";
import { CategoryForm } from "@/components/Categories/CategoryForm";
import { CategoryTable } from "@/components/Categories/CategoryTable";
import type { Category } from "@shared/schema";

export default function Categories() {
  const [isCreating, setIsCreating] = useState(false);

  const {
    data: categories = [],
    isLoading,
    error,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const totalCategories = categories.length;
  const activeCategories = categories.filter(cat => cat.isActive).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Category Management</h1>
        <p className="text-muted-foreground">
          Organize your products by creating and managing categories
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <Tag className="h-4 w-4 text-blue-600" />
            <h3 className="ml-2 font-semibold">Total Categories</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              All categories in system
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <Package className="h-4 w-4 text-green-600" />
            <h3 className="ml-2 font-semibold">Active Categories</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">
              Currently available for use
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <Settings className="h-4 w-4 text-orange-600" />
            <h3 className="ml-2 font-semibold">Inactive Categories</h3>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold">{totalCategories - activeCategories}</div>
            <p className="text-xs text-muted-foreground">
              Disabled categories
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage product categories and their properties
          </p>
        </div>
        
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <CategoryForm onSuccess={() => setIsCreating(false)} />
        </Dialog>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-md bg-destructive/15 border border-destructive/20 p-4">
          <p className="text-sm text-destructive">
            Failed to load categories. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Category Table */}
      <CategoryTable 
        categories={categories}
        isLoading={isLoading}
      />
    </div>
  );
}