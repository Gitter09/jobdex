import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-6 text-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold tracking-tight">Something went wrong</h1>
                    <p className="mb-8 max-w-md text-muted-foreground">
                        The application encountered an unexpected error. We've logged the details, and you can try refreshing the page.
                    </p>
                    <div className="rounded-lg bg-muted p-4 mb-8 text-left text-sm font-mono max-w-2xl overflow-auto border border-border">
                        <div className="text-destructive font-semibold mb-1">{this.state.error?.name}</div>
                        <div className="text-secondary-foreground">{this.state.error?.message}</div>
                    </div>
                    <Button onClick={this.handleReset} variant="outline" className="gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Refresh Application
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
