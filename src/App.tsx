import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "@/components/layout/app-layout";
import { LockScreen } from "@/components/layout/lock-screen";
import { DashboardPage } from "@/pages/DashboardPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { ContactDetailPage } from "@/pages/ContactDetailPage";
import { EmailsPage } from "@/pages/EmailsPage";
import { NotesPage } from "@/pages/NotesPage";
import { TasksPage } from "@/pages/TasksPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import "./index.css";

function App() {
  const [isLocked, setIsLocked] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLock = async () => {
      try {
        const hasPin = await invoke<boolean>("has_lock_pin");
        setIsLocked(hasPin);
      } catch (err) {
        console.error("Security system error:", err);
        setIsLocked(false);
      }
    };
    checkLock();
  }, []);

  if (isLocked === null) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <ErrorBoundary>
        <LockScreen onUnlock={() => setIsLocked(false)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SignedOut>
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4 text-center">
          <div className="mb-8 max-w-md">
            <h1 className="text-4xl font-bold tracking-tight mb-4">OutreachOS</h1>
            <p className="text-muted-foreground text-lg mb-8">
              The privacy-first relationship manager for modern outreach.
              Please sign in to access your local database.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <SignInButton mode="modal">
                <Button size="lg" className="px-8 font-semibold">Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="lg" variant="outline" className="px-8 font-semibold">Sign Up</Button>
              </SignUpButton>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-12 opacity-50">
            Open Core v0.2.0 • Local-First Data Storage
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <Router>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contact/:id" element={<ContactDetailPage />} />
              <Route path="/emails" element={<EmailsPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/:tab" element={<SettingsPage />} />
            </Route>
          </Routes>
          <Toaster />
        </Router>
      </SignedIn>
    </ErrorBoundary>
  );
}

export default App;
