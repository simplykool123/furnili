import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "./MobileOptimizer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileTableColumn {
  key: string;
  label: string;
  width?: string;
  render?: (value: any, row: any) => ReactNode;
  mobileHide?: boolean; // Hide column on mobile
  mobilePrimary?: boolean; // Show as primary info on mobile
}

interface MobileTableProps {
  data: any[];
  columns: MobileTableColumn[];
  className?: string;
  onRowClick?: (row: any) => void;
  actions?: Array<{
    label: string;
    onClick: (row: any) => void;
    icon?: ReactNode;
    variant?: 'default' | 'destructive';
  }>;
}

// Mobile card view for table rows
function MobileTableCard({ 
  row, 
  columns, 
  onRowClick, 
  actions 
}: {
  row: any;
  columns: MobileTableColumn[];
  onRowClick?: (row: any) => void;
  actions?: MobileTableProps['actions'];
}) {
  const [expanded, setExpanded] = useState(false);
  
  const primaryColumns = columns.filter(col => col.mobilePrimary);
  const secondaryColumns = columns.filter(col => !col.mobilePrimary && !col.mobileHide);
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-sm">
      {/* Primary Information */}
      <div className="flex items-start justify-between">
        <div 
          className="flex-1 space-y-1 cursor-pointer"
          onClick={() => onRowClick?.(row)}
        >
          {primaryColumns.map(column => (
            <div key={column.key}>
              {column.key === primaryColumns[0].key ? (
                <h3 className="font-medium text-foreground text-base">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </h3>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {actions.map((action, index) => (
                  <DropdownMenuItem 
                    key={index}
                    onClick={() => action.onClick(row)}
                    className={action.variant === 'destructive' ? 'text-destructive' : ''}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {secondaryColumns.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>
      
      {/* Secondary Information (Expandable) */}
      {expanded && secondaryColumns.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2">
          {secondaryColumns.map(column => (
            <div key={column.key} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground font-medium">
                {column.label}:
              </span>
              <div className="text-sm text-foreground">
                {column.render ? column.render(row[column.key], row) : row[column.key]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Desktop table view
function DesktopTable({ 
  data, 
  columns, 
  className, 
  onRowClick, 
  actions 
}: MobileTableProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns.map(column => (
              <th
                key={column.key}
                className="text-left py-3 px-4 font-medium text-foreground"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
            {actions && actions.length > 0 && (
              <th className="text-right py-3 px-4 font-medium text-foreground w-20">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={cn(
                "border-b border-border hover:bg-muted/50 transition-colors",
                onRowClick && "cursor-pointer"
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map(column => (
                <td key={column.key} className="py-3 px-4 text-sm">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
              {actions && actions.length > 0 && (
                <td className="py-3 px-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, actionIndex) => (
                        <DropdownMenuItem 
                          key={actionIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                          }}
                          className={action.variant === 'destructive' ? 'text-destructive' : ''}
                        >
                          {action.icon && <span className="mr-2">{action.icon}</span>}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Main mobile table component
export default function MobileTable(props: MobileTableProps) {
  const { isMobile } = useIsMobile();
  const { data, columns, className } = props;
  
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No data available</p>
      </div>
    );
  }
  
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className)}>
        {data.map((row, index) => (
          <MobileTableCard
            key={index}
            row={row}
            columns={columns}
            onRowClick={props.onRowClick}
            actions={props.actions}
          />
        ))}
      </div>
    );
  }
  
  return <DesktopTable {...props} />;
}

// Hook for mobile table configuration
export function useMobileTableColumns<T>(
  baseColumns: Array<{
    key: keyof T;
    label: string;
    width?: string;
    render?: (value: any, row: T) => ReactNode;
  }>,
  mobileConfig?: {
    primaryColumns?: (keyof T)[];
    hideColumns?: (keyof T)[];
  }
): MobileTableColumn[] {
  return baseColumns.map(column => ({
    ...column,
    key: column.key as string,
    mobilePrimary: mobileConfig?.primaryColumns?.includes(column.key) || false,
    mobileHide: mobileConfig?.hideColumns?.includes(column.key) || false,
  }));
}