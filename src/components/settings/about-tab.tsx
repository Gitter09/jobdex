import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { Separator } from "@/components/ui/separator";
import { Github, Linkedin, ExternalLink } from "lucide-react";
import { LATEST_RELEASE } from "@/changelog";

export function AboutTab() {
    const [version, setVersion] = useState<string>("...");

    useEffect(() => {
        getVersion().then(setVersion).catch(() => setVersion("0.2.0"));
    }, []);

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-medium">About</h3>
                <p className="text-sm text-muted-foreground">A private relationship CRM and who built it.</p>
            </div>

            <Separator />

            <div className="grid grid-cols-[2fr_3fr] gap-12 items-start">
                {/* Left: identity */}
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className="flex items-baseline gap-3">
                            <span className="text-2xl font-bold tracking-tight">JobDex</span>
                            <span className="text-sm text-muted-foreground font-mono">v{version}</span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            JobDex is a personal relationship CRM with a private relationship agent. It helps you
                            remember what matters about the people you work with, and follow through naturally — reconnecting
                            with a former colleague, keeping up with a mentor, staying close to collaborators or clients.
                            A job search is just one of the ways people use it.
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            It started as a spreadsheet for tracking a job search that kept breaking. Everything else was
                            either complex enterprise software or a very "salesy" SaaS, so this became a local-first app
                            instead: free, no account, and private by default.
                        </p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                            Your contacts and notes live on this machine in an encrypted database. Nothing leaves it
                            unless you explicitly choose which people may be sent to a model provider you configure
                            yourself — and every agent-written email waits for your approval before it is sent. The
                            manual tools work with no AI provider at all.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            - Harshit Singh
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => invoke("open_external_url", { url: "https://github.com/Gitter09/jobdex" })}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                            <ExternalLink className="h-3 w-3 opacity-50" />
                        </button>
                        <button
                            onClick={() => invoke("open_external_url", { url: "https://linkedin.com/in/harshit-singh-bits" })}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Linkedin className="h-4 w-4" />
                            LinkedIn
                            <ExternalLink className="h-3 w-3 opacity-50" />
                        </button>
                    </div>
                </div>

                {/* Right: changelog */}
                <div className="pl-8 border-l border-border space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold">What's new in v{LATEST_RELEASE.version}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">The things that got built before the announcement.</p>
                    </div>
                    <ul className="space-y-3">
                        {LATEST_RELEASE.entries.map((item) => (
                            <li key={item.label} className="flex gap-3 text-sm">
                                <span className="font-medium shrink-0 w-40">{item.label}</span>
                                <span className="text-muted-foreground leading-relaxed">{item.detail}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground">
                Built with Tauri · Rust · React
            </p>
        </div>
    );
}
