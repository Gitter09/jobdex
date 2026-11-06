import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Shield, Upload, UserPlus, Compass, ArrowRight, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { Contact, ModelStatus, RelationshipModelConfig } from "@/types/crm";

// ── Types ────────────────────────────────────────────────────────────
type Screen = 1 | 2 | 3 | 4;
type OnboardingAction = "import" | "add_contact" | "explore";

interface OnboardingFlowProps {
    onComplete: (action: OnboardingAction) => void;
}

interface IntentPreset {
    key: string;
    title: string;
    subtitle: string;
    intent: string;
}

const INTENT_PRESETS: IntentPreset[] = [
    {
        key: "stay_in_touch",
        title: "Stay in touch",
        subtitle: "Keep the people you value close.",
        intent: "Keep in regular contact with people I value.",
    },
    {
        key: "reconnect",
        title: "Reconnect",
        subtitle: "Reach back out to people you've lost touch with.",
        intent: "Reach back out to people I haven't talked to in a while.",
    },
    {
        key: "collaborators",
        title: "Find collaborators",
        subtitle: "Stay close to people you could work with.",
        intent: "Stay close to people I could build or work with.",
    },
    {
        key: "career",
        title: "Career move",
        subtitle: "Keep the people who matter to your career warm.",
        intent: "Keep the people who matter to my career warm.",
    },
];

// ── Typewriter text data ─────────────────────────────────────────────
// Each segment is a line. The typewriter types through them sequentially.
// A "\n" between segments creates a visible line break with a brief typing pause.
const TYPEWRITER_LINES = [
    { text: "hey.", style: "bold" as const },
    { text: "this is your private relationship agent.", style: "normal" as const },
    { text: "", style: "break" as const }, // blank line pause
    { text: "remember what matters.", style: "normal" as const },
    { text: "follow through naturally.", style: "normal" as const },
    { text: "", style: "break" as const },
    { text: "(stored locally. AI sharing is optional and needs your consent.)", style: "dim" as const },
];

// Flatten into a single string with \n markers for the typewriter engine
const FULL_TEXT = TYPEWRITER_LINES.map((l) => l.text).join("\n");

// ── Component ────────────────────────────────────────────────────────
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
    const [screen, setScreen] = useState<Screen>(1);
    const [exiting, setExiting] = useState(false);

    // Screen 1 — SVG + Typewriter state
    const [svgDone, setSvgDone] = useState(false);
    const [typedIndex, setTypedIndex] = useState(0);
    const [typewriterDone, setTypewriterDone] = useState(false);
    const svgPathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState(0);

    // Relationship scope state
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoaded, setContactsLoaded] = useState(false);
    const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [preset, setPreset] = useState<string | null>(null);
    const [savingConsent, setSavingConsent] = useState(false);
    const [consentError, setConsentError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const people = await invoke<Contact[]>("get_contacts");
                if (!cancelled) setContacts(people);
            } catch {
                // Browser preview or locked database — the picker stays hidden.
            }
            try {
                const status = await invoke<ModelStatus>("get_relationship_model_status");
                if (!cancelled) setModelStatus(status);
            } catch {
                // No agent status available; consent is set later in settings.
            }
            if (!cancelled) setContactsLoaded(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Reduced motion detection
    const prefersReducedMotion = useRef(
        typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    // ── SVG path length measurement ──────────────────────────────────
    useEffect(() => {
        if (svgPathRef.current) {
            const len = svgPathRef.current.getTotalLength();
            setPathLength(len);
        }
    }, []);

    // ── SVG draw completion → start typewriter ───────────────────────
    useEffect(() => {
        if (screen !== 1) return;
        if (prefersReducedMotion.current) {
            setSvgDone(true);
            return;
        }
        const timer = setTimeout(() => setSvgDone(true), 2550); // 250ms delay + 2.0s draw + 0.3s fill
        return () => clearTimeout(timer);
    }, [screen]);

    // ── Typewriter engine ────────────────────────────────────────────
    useEffect(() => {
        if (screen !== 1 || !svgDone) return;
        if (prefersReducedMotion.current) {
            setTypedIndex(FULL_TEXT.length);
            setTypewriterDone(true);
            return;
        }
        if (typedIndex >= FULL_TEXT.length) {
            setTypewriterDone(true);
            return;
        }

        const currentChar = FULL_TEXT[typedIndex];
        const nextChar = FULL_TEXT[typedIndex + 1];
        // Slower for the dim parenthetical line, pause at line breaks
        const isInParenthetical = typedIndex > FULL_TEXT.lastIndexOf("(");
        let delay = isInParenthetical ? 45 : 35;
        if (currentChar === "\n" && nextChar === "\n") delay = 400; // blank line pause
        else if (currentChar === "\n") delay = 150; // line break pause

        const timer = setTimeout(() => setTypedIndex((i) => i + 1), delay);
        return () => clearTimeout(timer);
    }, [screen, svgDone, typedIndex]);

    // ── Navigation ───────────────────────────────────────────────────
    const goBack = useCallback(() => {
        if (screen > 1) setScreen((s) => (s - 1) as Screen);
    }, [screen]);

    /**
     * Persists the contact selection as disclosure consent through the validated
     * native command, preserving the rest of the provider configuration.
     */
    const commitConsent = useCallback(async (): Promise<boolean> => {
        if (!modelStatus) return true;
        const unchanged =
            selectedIds.length === modelStatus.allowedContactIds.length &&
            selectedIds.every((id) => modelStatus.allowedContactIds.includes(id));
        if (unchanged) return true;

        setSavingConsent(true);
        setConsentError(null);
        try {
            const config: RelationshipModelConfig = {
                baseUrl: modelStatus.baseUrl,
                model: modelStatus.model,
                enabled: modelStatus.enabled,
                dailyRequestLimit: modelStatus.dailyRequestLimit,
                allowedContactIds: selectedIds,
            };
            await invoke("configure_relationship_model", { config, apiKey: null });
            setModelStatus({ ...modelStatus, allowedContactIds: selectedIds });
            return true;
        } catch (error) {
            setConsentError(
                typeof error === "string"
                    ? error
                    : "Couldn't save your contact selection. You can set it later in Settings → Relationship agent."
            );
            return false;
        } finally {
            setSavingConsent(false);
        }
    }, [modelStatus, selectedIds]);

    const handleContinue = useCallback(async () => {
        if (screen >= 4) return;
        if (screen === 3 && !(await commitConsent())) return;
        setScreen((s) => (s + 1) as Screen);
    }, [screen, commitConsent]);

    const handleFinish = useCallback(
        (action: OnboardingAction) => {
            if (prefersReducedMotion.current) {
                onComplete(action);
                return;
            }
            setExiting(true);
            setTimeout(() => onComplete(action), 600);
        },
        [onComplete]
    );

    const skip = useCallback(() => handleFinish("explore"), [handleFinish]);

    // ── Keyboard ─────────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture when typing in inputs
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === "ArrowRight" || e.key === "Enter") {
                if (screen < 4) {
                    e.preventDefault();
                    handleContinue();
                }
            } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
                e.preventDefault();
                goBack();
            } else if (e.key === "Escape") {
                e.preventDefault();
                skip();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [screen, handleContinue, goBack, skip]);

    // ── Render helpers ───────────────────────────────────────────────
    const renderTypedText = () => {
        const visible = FULL_TEXT.slice(0, typedIndex);
        const lines = visible.split("\n");

        return (
            <div className="space-y-1">
                {lines.map((line, i) => {
                    const meta = TYPEWRITER_LINES[i];
                    if (!meta) return null;
                    if (meta.style === "break") return <div key={i} className="h-3" />;

                    return (
                        <p
                            key={i}
                            className={cn(
                                meta.style === "bold" && "text-2xl sm:text-3xl font-bold text-[#fafafa]",
                                meta.style === "normal" && "text-lg sm:text-xl text-[#a3a3a3]",
                                meta.style === "dim" && "text-sm italic text-[#737373]"
                            )}
                        >
                            {line}
                            {/* Show cursor at the end of the last visible line */}
                            {i === lines.length - 1 && !typewriterDone && (
                                <span className="ob-cursor text-[#fafafa] ml-0.5 font-light">|</span>
                            )}
                        </p>
                    );
                })}
            </div>
        );
    };

    // ── Screens ──────────────────────────────────────────────────────
    const renderScreen1 = () => (
        <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="max-w-lg w-full space-y-1">
                {/* SVG "hey" — handwritten path draw */}
                <div className="mb-2">
                    <svg
                        viewBox="0 0 865 782"
                        className="h-[100px] sm:h-[120px] w-auto"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            ref={svgPathRef}
                            d="M12.3105 403.708C82.9673 348.518 109.311 317.708 146.811 263.708C178.061 218.708 199.573 172.854 191.311 105.207C175.311 -25.7925 65.3105 0.707504 65.3105 140.707V386.708M65.3105 511.208V386.708M65.3105 386.708C94.8105 317.208 133.294 290.012 158.811 288.208C208.311 284.708 234.311 322.708 234.311 350.208L232.811 409.208C229.811 473.708 229.778 506.265 333.311 481.708C402.492 465.298 459.069 401.572 471.311 373.208C506.42 291.86 424.729 239.286 377.311 294.708C367.817 305.804 347.641 345.635 356.811 398.208C364.311 441.208 377.311 465.708 407.811 479.208C460.811 502.667 527.8 491.742 561.311 457.708C593.311 425.208 615.811 389.708 615.811 344.208V270.208C613.272 344.145 615.811 405.708 624.311 437.208C673.811 563.207 772.311 502.208 795.811 391.208V285.208V653.208C792.811 802.708 647.311 789.208 667.311 660.708C693.946 584.344 799.803 503.081 856.311 479.208"
                            stroke="#fafafa"
                            strokeWidth="40"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fillOpacity="0"
                            style={
                                pathLength > 0
                                    ? {
                                          strokeDasharray: pathLength,
                                          strokeDashoffset: pathLength,
                                          animation: prefersReducedMotion.current
                                              ? "none"
                                              : `ob-svg-draw 2.0s ease-in-out 250ms forwards`,
                                      }
                                    : undefined
                            }
                        />
                    </svg>
                </div>

                {/* Typewriter text — starts after SVG draw completes */}
                <div
                    className={cn(
                        "transition-opacity duration-300",
                        svgDone ? "opacity-100" : "opacity-0"
                    )}
                >
                    {renderTypedText()}
                </div>
            </div>
        </div>
    );

    const renderScreen2 = () => (
        <div className="flex flex-col items-center justify-start [@media(min-height:760px)]:justify-center h-full px-6 overflow-y-auto py-6">
            <div className="max-w-xl w-full text-center space-y-6">
                <h2
                    className="ob-stagger text-2xl sm:text-3xl font-bold text-[#fafafa]"
                    style={{ animationDelay: "0ms" }}
                >
                    what do you want to keep up with?
                </h2>
                <p
                    className="ob-stagger text-sm text-[#a3a3a3] leading-relaxed"
                    style={{ animationDelay: "150ms" }}
                >
                    Pick a starting point. These are presets, not separate products — you describe the real
                    workflow and approve it before anything runs.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {INTENT_PRESETS.map((option, i) => (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => setPreset(option.key)}
                            aria-pressed={preset === option.key}
                            className={cn(
                                "ob-stagger ob-action-card text-left p-4 rounded-xl border transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#555] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]",
                                preset === option.key
                                    ? "border-[#fafafa]/60 bg-[#1a1a1a]"
                                    : "border-[#2a2a2a] bg-[#141414] hover:border-[#3a3a3a]"
                            )}
                            style={{ animationDelay: `${250 + i * 100}ms` }}
                        >
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-[#fafafa]">{option.title}</span>
                                {preset === option.key && <Check className="h-4 w-4 shrink-0 text-[#fafafa]" />}
                            </span>
                            <span className="mt-1 block text-xs text-[#888] leading-relaxed">
                                {option.subtitle}
                            </span>
                        </button>
                    ))}
                </div>

                {preset && (
                    <p className="rounded-lg border border-[#2a2a2a] bg-[#111] p-3 text-left text-xs text-[#a3a3a3] leading-relaxed">
                        Intent preview: “{INTENT_PRESETS.find((option) => option.key === preset)?.intent}”
                    </p>
                )}

                <p className="text-xs text-[#666] leading-relaxed">
                    Nothing runs yet. No reminders, no drafts — your first workflow is created and activated
                    later, after you review it.
                </p>
            </div>
        </div>
    );

    const renderScreen3 = () => {
        const pickerReady = contactsLoaded && contacts.length > 0 && modelStatus !== null;

        return (
            <div className="flex flex-col items-center justify-start [@media(min-height:760px)]:justify-center h-full px-6 overflow-y-auto py-6">
                <div className="w-full max-w-xl space-y-5">
                    <div className="text-center space-y-2">
                        <h2 className="ob-stagger text-2xl sm:text-3xl font-bold text-[#fafafa]">
                            who do you want to keep up with?
                        </h2>
                        <p className="ob-stagger text-sm text-[#a3a3a3]" style={{ animationDelay: "150ms" }}>
                            Optional. Anyone you leave unchecked stays fully usable by hand.
                        </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                        <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                            <p className="flex items-center gap-1.5 font-medium text-[#fafafa]">
                                <Shield className="h-3.5 w-3.5 shrink-0" />
                                Syncing email
                            </p>
                            <p className="mt-1 text-xs text-[#888] leading-relaxed">
                                Messages from a mail account you connect are stored on this machine first.
                            </p>
                        </div>
                        <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-3">
                            <p className="flex items-center gap-1.5 font-medium text-[#fafafa]">
                                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                AI disclosure
                            </p>
                            <p className="mt-1 text-xs text-[#888] leading-relaxed">
                                Only people you select can be sent to a provider you configure yourself.
                            </p>
                        </div>
                    </div>

                    <p className="text-center text-xs text-[#777]">
                        These are two separate decisions, and neither is required to use JobDex.
                    </p>

                    {pickerReady ? (
                        <>
                            <div className="max-h-44 overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] divide-y divide-[#1f1f1f]">
                                {contacts.map((contact) => {
                                    const id = `onboarding-consent-${contact.id}`;
                                    return (
                                        <label
                                            key={contact.id}
                                            htmlFor={id}
                                            className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-[#161616]"
                                        >
                                            <Checkbox
                                                id={id}
                                                checked={selectedIds.includes(contact.id)}
                                                onCheckedChange={() =>
                                                    setSelectedIds((current) =>
                                                        current.includes(contact.id)
                                                            ? current.filter((value) => value !== contact.id)
                                                            : [...current, contact.id]
                                                    )
                                                }
                                                className="mt-0.5 border-[#555] data-[state=checked]:bg-[#fafafa] data-[state=checked]:text-[#0a0a0a]"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm text-[#e5e5e5] break-words">
                                                    {`${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() ||
                                                        contact.email ||
                                                        "Unnamed contact"}
                                                </span>
                                                {contact.email && (
                                                    <span className="block text-xs text-[#777] break-all">
                                                        {contact.email}
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-[#666] leading-relaxed">
                                Checking someone lets the agent use their synced plain-text conversations if you
                                connect a provider later. Attachments, contact files, access tokens and messages
                                from other people are never included. You can change this anytime in Settings →
                                Relationship agent, and revoking it invalidates drafts derived from that person.
                            </p>
                            <p className="text-xs text-[#a3a3a3]">
                                {selectedIds.length === 0
                                    ? "No one selected — nothing is shared with any provider."
                                    : `${selectedIds.length} selected for the agent.`}
                            </p>
                        </>
                    ) : (
                        <p className="rounded-lg border border-[#2a2a2a] bg-[#111] p-4 text-sm text-[#a3a3a3] leading-relaxed">
                            {contactsLoaded && contacts.length === 0
                                ? "No contacts yet. You can add people after setup — nothing is shared either way."
                                : "Contact selection opens once your database is unlocked. Until then, nothing is shared with any provider."}
                        </p>
                    )}

                    {consentError && (
                        <p role="alert" className="text-xs text-red-400 break-words">
                            {consentError}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const renderScreen4 = () => (
        <div className="flex flex-col items-center justify-start [@media(min-height:760px)]:justify-center h-full px-6 overflow-y-auto py-6">
            <div className="max-w-2xl w-full text-center space-y-6">
                <div className="space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1a1a1a] border border-[#333]">
                        <Sparkles className="h-5 w-5 text-[#fafafa]" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-[#fafafa]">ai is optional.</h2>
                    <p className="mx-auto max-w-lg text-sm text-[#a3a3a3] leading-relaxed">
                        JobDex is free. Memory suggestions and draft writing need your own OpenAI-compatible
                        provider, connected later in Settings → Relationship agent. Inference is billed by that
                        provider, directly to you, and the connection must pass a test before anything uses it.
                    </p>
                    <p className="text-xs text-[#777] leading-relaxed">
                        Nothing is active yet. Every agent-written email still needs your approval, and the first
                        workflow starts only after you create and review it.
                    </p>
                </div>

                <h3 className="text-sm font-semibold text-[#fafafa]">where do you want to start?</h3>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {[
                        {
                            action: "add_contact" as OnboardingAction,
                            icon: UserPlus,
                            title: "Add your first contact",
                            subtitle: "Start with the person you've been meaning to reach out to.",
                            delay: 150,
                        },
                        {
                            action: "import" as OnboardingAction,
                            icon: Upload,
                            title: "Import a LinkedIn CSV",
                            subtitle: "Bring in people you already know.",
                            delay: 300,
                        },
                        {
                            action: "explore" as OnboardingAction,
                            icon: Compass,
                            title: "Skip AI setup for now",
                            subtitle: "Look around. Set up the agent anytime in Settings.",
                            delay: 450,
                        },
                    ].map((card) => (
                        <button
                            key={card.action}
                            onClick={() => handleFinish(card.action)}
                            className={cn(
                                "ob-stagger ob-action-card",
                                "w-full sm:w-[200px] p-6 rounded-xl text-left",
                                "bg-[#141414] border border-[#2a2a2a]",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#555] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                            )}
                            style={{ animationDelay: `${card.delay}ms` }}
                            aria-label={`${card.title}: ${card.subtitle}`}
                        >
                            <card.icon className="h-7 w-7 text-[#fafafa] mb-4" />
                            <h3 className="text-sm font-semibold text-[#fafafa] mb-1.5">
                                {card.title}
                            </h3>
                            <p className="text-xs text-[#888] leading-relaxed">{card.subtitle}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Main render ──────────────────────────────────────────────────
    const isMac =
        typeof navigator !== "undefined" && navigator.platform.toUpperCase().includes("MAC");

    return (
        <div
            className={cn(
                "fixed inset-0 z-[60] flex flex-col select-none",
                exiting && "ob-dissolve-out"
            )}
            style={{
                background:
                    screen === 4 ? "rgba(10, 10, 10, 0.88)" : "#0a0a0a",
                backdropFilter: screen === 4 ? "blur(8px)" : undefined,
                color: "#fafafa",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Welcome to JobDex"
        >
            {/* Skip button — screens 1-3 */}
            {screen < 4 && (
                <button
                    onClick={skip}
                    className="absolute top-6 right-6 text-sm text-[#555] hover:text-[#999] transition-colors z-10"
                >
                    skip
                </button>
            )}

            {/* Screen content */}
            <div className="flex-1 relative" aria-live="polite">
                {screen === 1 && renderScreen1()}
                {screen === 2 && renderScreen2()}
                {screen === 3 && renderScreen3()}
                {screen === 4 && renderScreen4()}
            </div>

            {/* Bottom bar — dots + continue + keyboard hint */}
            <div className="pb-8 flex flex-col items-center gap-3">
                {screen < 4 && (
                    <Button
                        onClick={handleContinue}
                        disabled={savingConsent}
                        className="bg-[#fafafa] text-[#0a0a0a] hover:bg-[#d4d4d4]"
                    >
                        {savingConsent ? "Saving…" : "continue"}
                    </Button>
                )}

                {/* Progress dots */}
                <div className="flex items-center gap-2">
                    {([1, 2, 3, 4] as Screen[]).map((s) => (
                        <div
                            key={s}
                            className={cn(
                                "rounded-full transition-all duration-300",
                                s === screen
                                    ? "w-6 h-2 bg-[#fafafa]"
                                    : "w-2 h-2 bg-[#333]"
                            )}
                        />
                    ))}
                </div>

                {/* Keyboard hint — screens 1-3 */}
                {screen < 4 && (
                    <p className="text-[10px] text-[#444] uppercase tracking-widest">
                        press{" "}
                        <kbd className="font-mono text-[#666]">enter</kbd> or{" "}
                        <kbd className="font-mono text-[#666]">{isMac ? "→" : "→"}</kbd>
                    </p>
                )}
            </div>
        </div>
    );
}
