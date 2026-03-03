import { toast } from "sonner";

export interface AppError {
    code: "DATABASE" | "NETWORK" | "IO" | "SERIALIZATION" | "VALIDATION" | "INTERNAL";
    message: string;
}

export const useErrors = () => {
    const handleError = (error: unknown, fallbackMessage?: string) => {
        console.error("App Error:", error);

        // If it's a structured AppError from Rust
        if (typeof error === "object" && error !== null && "code" in error && "message" in error) {
            const appErr = error as AppError;
            toast.error(`${appErr.code}: ${appErr.message}`, {
                description: appErr.code === "DATABASE" ? "There was an issue accessing the local database." : undefined,
            });
            return;
        }

        // If it's a string (old format)
        if (typeof error === "string") {
            toast.error(error);
            return;
        }

        // Default fallback
        toast.error(fallbackMessage || "An unexpected error occurred");
    };

    return { handleError };
};
