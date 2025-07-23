import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "./MobileOptimizer";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MobileFormSectionProps {
  title?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

export function MobileFormSection({ 
  title, 
  children, 
  collapsible = false, 
  defaultExpanded = true, 
  className 
}: MobileFormSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { isMobile } = useIsMobile();
  
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div className="flex items-center justify-between">
          <h3 className={cn(
            "font-medium text-foreground",
            isMobile ? "text-lg" : "text-xl"
          )}>
            {title}
          </h3>
          {collapsible && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      )}
      
      {(!collapsible || expanded) && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

interface MobileFormFieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  description?: string;
  className?: string;
}

export function MobileFormField({ 
  label, 
  children, 
  error, 
  required = false, 
  description, 
  className 
}: MobileFormFieldProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <div className={cn("space-y-2", className)}>
      <label className={cn(
        "block font-medium text-foreground",
        isMobile ? "text-sm" : "text-base"
      )}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      
      {children}
      
      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

interface MobileFormGridProps {
  children: ReactNode;
  columns?: number;
  className?: string;
}

export function MobileFormGrid({ 
  children, 
  columns = 2, 
  className 
}: MobileFormGridProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <div className={cn(
      "grid gap-4",
      isMobile ? "grid-cols-1" : `grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`,
      className
    )}>
      {children}
    </div>
  );
}

interface MobileFormActionsProps {
  children: ReactNode;
  alignment?: 'left' | 'center' | 'right';
  className?: string;
}

export function MobileFormActions({ 
  children, 
  alignment = 'right', 
  className 
}: MobileFormActionsProps) {
  const { isMobile } = useIsMobile();
  
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };
  
  return (
    <div className={cn(
      "flex gap-3",
      isMobile ? "flex-col" : `flex-row ${alignmentClasses[alignment]}`,
      "pt-6 border-t border-border",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MobileSelectProps {
  options: MobileSelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MobileSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Select an option", 
  className,
  disabled = false
}: MobileSelectProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full border border-input bg-background rounded-md px-3 transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
        "text-foreground",
        isMobile ? "h-12 text-base" : "h-10 text-sm",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map(option => (
        <option 
          key={option.value} 
          value={option.value} 
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface MobileTextAreaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function MobileTextArea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 4, 
  className,
  disabled = false,
  required = false
}: MobileTextAreaProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={isMobile ? Math.min(rows + 1, 6) : rows}
      disabled={disabled}
      required={required}
      className={cn(
        "w-full border border-input bg-background rounded-md px-3 py-2 transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
        "placeholder:text-muted-foreground resize-vertical",
        isMobile ? "text-base" : "text-sm",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  );
}

interface MobileCheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function MobileCheckbox({ 
  checked, 
  onChange, 
  label, 
  description, 
  className,
  disabled = false
}: MobileCheckboxProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <label className={cn(
      "flex items-start space-x-3 cursor-pointer",
      disabled && "opacity-50 cursor-not-allowed",
      className
    )}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className={cn(
          "rounded border-input text-primary focus:ring-primary focus:ring-2 focus:ring-offset-2",
          isMobile ? "w-5 h-5 mt-0.5" : "w-4 h-4 mt-1"
        )}
      />
      <div className="flex-1">
        <span className={cn(
          "font-medium text-foreground",
          isMobile ? "text-base" : "text-sm"
        )}>
          {label}
        </span>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
    </label>
  );
}

interface MobileFormProps {
  children: ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  className?: string;
}

export default function MobileForm({ children, onSubmit, className }: MobileFormProps) {
  const { isMobile } = useIsMobile();
  
  return (
    <form 
      onSubmit={onSubmit}
      className={cn(
        "space-y-6",
        isMobile && "mobile-form",
        className
      )}
    >
      {children}
    </form>
  );
}