import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsProvider } from "./components/providers/settings-provider";
import { ThemeProvider } from "./components/providers/theme-provider";
import { ClerkProvider } from "@clerk/clerk-react";

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <SettingsProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </SettingsProvider>
    </ClerkProvider>
  </React.StrictMode>,
);
