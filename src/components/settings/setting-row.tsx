import { cn } from "@/lib/utils";
import { ReactNode, Children, Fragment } from "react";

interface SettingRowProps {
    label: string;
    description?: string;
    children?: ReactNode;
    className?: string;
}

export function SettingRow({ label, description, children, className }: SettingRowProps) {
    return (
        <div className={cn("flex items-center justify-between gap-4 px-4 py-3.5", className)}>
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                {description && (
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
                )}
            </div>
            {children && <div className="shrink-0">{children}</div>}
        </div>
    );
}

interface SettingSectionProps {
    title?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function SettingSection({ title, action, children, className }: SettingSectionProps) {
    const childArray = Children.toArray(children);
    return (
        <div className={className}>
            {(title || action) && (
                <div className="flex items-center justify-between mb-2 px-1">
                    {title && (
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {title}
                        </p>
                    )}
                    {action}
                </div>
            )}
            <div className="border rounded-lg bg-card/30 overflow-hidden">
                {childArray.map((child, index) => (
                    <Fragment key={index}>
                        {index > 0 && <div className="h-px bg-border/50 mx-4" />}
                        {child}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
