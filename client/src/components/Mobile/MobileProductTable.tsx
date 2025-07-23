import { useState } from "react";
import { Edit, Trash2, Eye, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileTable, { useMobileTableColumns } from "./MobileTable";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";

interface Product {
  id: number;
  name: string;
  category: string;
  brand?: string;
  size?: string;
  thickness?: string;
  sku?: string;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MobileProductTableProps {
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onView?: (product: Product) => void;
}

export default function MobileProductTable({ onEdit, onDelete, onView }: MobileProductTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/products');
    },
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/categories');
    },
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Configure mobile table columns
  const columns = useMobileTableColumns<Product>(
    [
      {
        key: 'name',
        label: 'Product Name',
        render: (value, row) => (
          <div className="flex items-center space-x-3">
            {row.imageUrl ? (
              <img 
                src={row.imageUrl} 
                alt={row.name}
                className="w-10 h-10 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="font-medium text-foreground">{value}</div>
              {row.sku && (
                <div className="text-xs text-muted-foreground">SKU: {row.sku}</div>
              )}
            </div>
          </div>
        )
      },
      {
        key: 'category',
        label: 'Category',
        render: (value) => (
          <Badge variant="secondary" className="text-xs">
            {value}
          </Badge>
        )
      },
      {
        key: 'currentStock',
        label: 'Stock',
        render: (value, row) => (
          <div className="text-right">
            <div className={`font-medium ${value <= row.minStock ? 'text-destructive' : 'text-foreground'}`}>
              {value}
            </div>
            <div className="text-xs text-muted-foreground">
              Min: {row.minStock} {row.unit}
            </div>
          </div>
        )
      },
      {
        key: 'pricePerUnit',
        label: 'Price',
        render: (value, row) => (
          <div className="text-right">
            <div className="font-medium text-foreground">₹{value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">per {row.unit}</div>
          </div>
        )
      },
      {
        key: 'brand',
        label: 'Brand',
        render: (value) => value || '-'
      },
      {
        key: 'size',
        label: 'Size',
        render: (value, row) => {
          if (value && row.thickness) {
            return `${value} × ${row.thickness}`;
          }
          return value || row.thickness || '-';
        }
      },
      {
        key: 'isActive',
        label: 'Status',
        render: (value) => (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "Active" : "Inactive"}
          </Badge>
        )
      }
    ],
    {
      primaryColumns: ['name', 'currentStock'],
      hideColumns: ['brand', 'size', 'isActive']
    }
  );

  // Table actions
  const actions = [
    {
      label: 'View Details',
      onClick: onView || (() => {}),
      icon: <Eye className="w-4 h-4" />
    },
    {
      label: 'Edit Product',
      onClick: onEdit || (() => {}),
      icon: <Edit className="w-4 h-4" />
    },
    {
      label: 'Delete Product',
      onClick: onDelete || (() => {}),
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'destructive' as const
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-muted animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile Filters */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 px-4 border border-input bg-background rounded-lg text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-12 px-4 border border-input bg-background rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
          >
            <option value="">All Categories</option>
            {categories.map((category: any) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filteredProducts.length} of {products.length} products
        </div>
        {(searchTerm || categoryFilter) && (
          <button
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("");
            }}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Mobile Table */}
      <MobileTable
        data={filteredProducts}
        columns={columns}
        actions={actions}
        className="animate-fade-in"
      />

      {filteredProducts.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No products found</h3>
          <div className="text-muted-foreground">
            {searchTerm || categoryFilter 
              ? "Try adjusting your search filters"
              : "Start by adding your first product"
            }
          </div>
        </div>
      )}
    </div>
  );
}