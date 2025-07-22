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
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center">
            <Tag className="h-4 w-4 text-blue-600" />
            <h3 className="ml-2 font-medium text-sm">Total Categories</h3>
          </div>
          <div className="mt-1">
            <div className="text-xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">All categories</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center">
            <Package className="h-4 w-4 text-green-600" />
            <h3 className="ml-2 font-medium text-sm">Active Categories</h3>
          </div>
          <div className="mt-1">
            <div className="text-xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center">
            <Settings className="h-4 w-4 text-orange-600" />
            <h3 className="ml-2 font-medium text-sm">Inactive Categories</h3>
          </div>
          <div className="mt-1">
            <div className="text-xl font-bold">{totalCategories - activeCategories}</div>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Categories List</h2>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button size="sm">
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