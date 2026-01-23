import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getInitials(firstName: string, lastName: string): string {
    const first = firstName ? firstName[0] : "";
    const last = lastName ? lastName[0] : "";
    return (first + last).toUpperCase() || "?";
}

export function getColorHex(color: string | undefined): string {
    if (!color) return "transparent";
    if (color.startsWith("#")) return color;

    // Legacy Tailwind class mapping
    const mapping: Record<string, string> = {
        "bg-blue-100 text-blue-800": "#3b82f6",
        "bg-yellow-100 text-yellow-800": "#eab308",
        "bg-purple-100 text-purple-800": "#a855f7",
        "bg-green-100 text-green-800": "#22c55e",
        "bg-red-100 text-red-800": "#ef4444",
        "bg-gray-100 text-gray-800": "#64748b",
        "bg-slate-100 text-slate-800": "#64748b",
        "bg-slate-200 text-slate-900": "#475569",
    };

    return mapping[color] || "#94a3b8"; // Fallback to slate-400
}
