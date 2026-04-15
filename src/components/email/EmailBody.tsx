import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import DOMPurify from "dompurify";
import { EmailMessage, EmailAttachment } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { ImageOff, Paperclip, File, FileText, Image } from "lucide-react";

const REMOTE_IMG_PATTERN = /src\s*=\s*["']\s*https?:\/\//i;

function withBlockedImages(html: string): string {
    return html.replace(
        /(src\s*=\s*["'])(https?:\/\/[^"']*)/gi,
        'data-blocked-src="$2" src=""'
    );
}

function attachmentIcon(contentType: string) {
    if (contentType.startsWith("image/")) return <Image className="h-3.5 w-3.5" />;
    if (contentType === "application/pdf" || contentType.includes("text")) return <FileText className="h-3.5 w-3.5" />;
    return <File className="h-3.5 w-3.5" />;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface EmailBodyProps {
    email: EmailMessage;
    className?: string;
}

export function EmailBody({ email, className }: EmailBodyProps) {
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        invoke<EmailAttachment[]>("get_attachments_for_message", { messageId: email.id })
            .then(setAttachments)
            .catch((err) => console.error("Failed to load attachments:", err));
    }, [email.id]);

    const handleOpenAttachment = async (filePath: string) => {
        await invoke("open_attachment", { filePath }).catch(() => {});
    };

    const bodySection = (() => {
        if (!email.html_body) {
            return (
                <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-3 rounded-md border border-muted/20 leading-relaxed overflow-auto whitespace-pre-wrap">
                    {email.body || "(No Body Content)"}
                </div>
            );
        }

        const sanitized = DOMPurify.sanitize(email.html_body, {
            WHOLE_DOCUMENT: true,
            FORCE_BODY: true,
        });
        const hasRemoteImages = REMOTE_IMG_PATTERN.test(sanitized);
        const displayHtml = imagesLoaded ? sanitized : withBlockedImages(sanitized);

        return (
            <>
                {hasRemoteImages && !imagesLoaded && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 border rounded-md px-3 py-1.5">
                        <span className="flex items-center gap-1.5">
                            <ImageOff className="h-3 w-3" />
                            Images blocked
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-xs px-2"
                            onClick={() => setImagesLoaded(true)}
                        >
                            Load images
                        </Button>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    srcDoc={displayHtml}
                    sandbox="allow-same-origin allow-popups"
                    className="w-full rounded-md border-0 bg-white"
                    style={{ minHeight: 120 }}
                    onLoad={() => {
                        const iframe = iframeRef.current;
                        if (!iframe?.contentDocument) return;
                        const h = iframe.contentDocument.documentElement.scrollHeight;
                        iframe.style.height = `${Math.min(h + 20, 600)}px`;
                    }}
                />
            </>
        );
    })();

    return (
        <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
            {bodySection}
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground w-full">
                        <Paperclip className="h-3 w-3" />
                        {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                    </span>
                    {attachments.map((a) => (
                        <button
                            key={a.id}
                            onClick={() => handleOpenAttachment(a.filePath)}
                            className="flex items-center gap-1.5 text-xs bg-muted/40 hover:bg-muted/70 border rounded-md px-2.5 py-1.5 transition-colors cursor-pointer"
                            title={`Open ${a.filename} (${formatBytes(a.fileSize)})`}
                        >
                            {attachmentIcon(a.contentType)}
                            <span className="max-w-[160px] truncate">{a.filename}</span>
                            <span className="text-muted-foreground shrink-0">{formatBytes(a.fileSize)}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
