import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MobileTableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => ReactNode;
  className?: string;
  priority?: 'high' | 'medium' | 'low'; // For responsive display
}

interface MobileTableAction {
  label: string;
  icon?: any;
  onClick: () => void;
  destructive?: boolean;
}

interface MobileTableProps {
  data: any[];
  columns: MobileTableColumn[];
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  className?: string;
  cardClassName?: string;
  itemActions?: (row: any) => MobileTableAction[];
}

export default function MobileTable({
  data,
  columns,
  onRowClick,
  emptyMessage = "No data available",
  className,
  cardClassName,
  itemActions
}: MobileTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card className={cn("w-full", cardClassName)}>
        <CardContent className="p-6 text-center text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  // Determine which columns to show based on priority and screen space
  const primaryColumns = columns.filter(col => col.priority === 'high' || !col.priority);
  const secondaryColumns = columns.filter(col => col.priority === 'medium');
  const tertiaryColumns = columns.filter(col => col.priority === 'low');

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((row, index) => (
        <Card 
          key={row.id || index}
          className={cn(
            "transition-all duration-200 hover:shadow-md border border-border/50",
            onRowClick && "cursor-pointer hover:bg-muted/30 active:bg-muted/50",
            cardClassName
          )}
          onClick={() => onRowClick?.(row)}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Primary Information - Always Visible */}
              <div className="space-y-2">
                {primaryColumns.map((column) => {
                  const value = row[column.key];
                  return (
                    <div key={column.key} className="flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-muted-foreground min-w-0 flex-shrink-0">
                        {column.label}:
                      </span>
                      <div className="text-sm text-foreground font-medium text-right min-w-0 flex-1">
                        {column.render ? column.render(value, row) : String(value || '-')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Secondary Information - Collapsible */}
              {secondaryColumns.length > 0 && (
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer list-none flex items-center gap-1 hover:text-foreground transition-colors">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    More details
                  </summary>
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                    {secondaryColumns.map((column) => {
                      const value = row[column.key];
                      return (
                        <div key={column.key} className="flex items-start justify-between gap-3">
                          <span className="text-xs text-muted-foreground min-w-0 flex-shrink-0">
                            {column.label}:
                          </span>
                          <div className="text-xs text-foreground text-right min-w-0 flex-1">
                            {column.render ? column.render(value, row) : String(value || '-')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              {/* Tertiary Information - Hidden by default, can be shown in expanded view */}
              {tertiaryColumns.length > 0 && (
                <details className="group">
                  <summary className="text-xs text-muted-foreground cursor-pointer list-none flex items-center gap-1 hover:text-foreground transition-colors">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    Additional info
                  </summary>
                  <div className="mt-2 pt-2 border-t border-border/50 space-y-2">
                    {tertiaryColumns.map((column) => {
                      const value = row[column.key];
                      return (
                        <div key={column.key} className="flex items-start justify-between gap-3">
                          <span className="text-xs text-muted-foreground min-w-0 flex-shrink-0">
                            {column.label}:
                          </span>
                          <div className="text-xs text-foreground text-right min-w-0 flex-1">
                            {column.render ? column.render(value, row) : String(value || '-')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              {/* Actions */}
              {itemActions && (
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    {itemActions(row).map((action, actionIndex) => {
                      const IconComponent = action.icon;
                      return (
                        <Button
                          key={actionIndex}
                          variant={action.destructive ? "destructive" : "ghost"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                          }}
                          className="h-8 px-3 text-xs"
                        >
                          {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Status Badge Component for consistent mobile styling
export function MobileStatusBadge({ 
  status, 
  variant 
}: { 
  status: string; 
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' 
}) {
  return (
    <Badge 
      variant={variant || 'default'} 
      className="text-xs px-2 py-1 font-medium"
    >
      {status}
    </Badge>
  );
}

// Action Buttons Component for mobile tables
export function MobileTableActions({ 
  actions 
}: { 
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive';
    size?: 'sm' | 'xs';
    icon?: ReactNode;
  }> 
}) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-end">
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || 'outline'}
          size={action.size || 'xs'}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
          className="text-xs h-7 px-2"
        >
          {action.icon && <span className="mr-1">{action.icon}</span>}
          {action.label}
        </Button>
      ))}
    </div>
  );
}