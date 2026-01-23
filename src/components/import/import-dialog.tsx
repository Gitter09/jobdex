import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, Loader2, CheckCircle } from "lucide-react";

interface ImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImportComplete?: () => void;
}

interface ImportPreview {
    headers: string[];
    sample_rows: string[][];
    total_rows: number;
}

interface ColumnMapping {
    first_name: number | null;
    last_name: number | null;
    email: number | null;
    linkedin_url: number | null;
    company: number | null;
}

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
    const [filePath, setFilePath] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<number | null>(null);

    const [mapping, setMapping] = useState<ColumnMapping>({
        first_name: null,
        last_name: null,
        email: null,
        linkedin_url: null,
        company: null,
    });

    const handleSelectFile = async () => {
        const selected = await openFileDialog({
            multiple: false,
            filters: [
                { name: "Spreadsheets", extensions: ["csv", "xlsx", "xls"] },
            ],
        });

        if (selected && typeof selected === "string") {
            setFilePath(selected);
            setLoading(true);
            setImportResult(null);

            try {
                const result = await invoke<ImportPreview>("import_preview", { filePath: selected });
                setPreview(result);

                // Auto-detect column mappings
                const autoMapping = { ...mapping };
                result.headers.forEach((header, index) => {
                    const lower = header.toLowerCase();
                    if (lower.includes("first") && lower.includes("name")) {
                        autoMapping.first_name = index;
                    } else if (lower.includes("last") && lower.includes("name")) {
                        autoMapping.last_name = index;
                    } else if (lower === "name" || lower === "full name") {
                        autoMapping.first_name = index; // Use as first name if no split
                    } else if (lower.includes("email") || lower.includes("e-mail")) {
                        autoMapping.email = index;
                    } else if (lower.includes("linkedin")) {
                        autoMapping.linkedin_url = index;
                    } else if (lower.includes("company") || lower.includes("organization")) {
                        autoMapping.company = index;
                    }
                });
                setMapping(autoMapping);
            } catch (err) {
                alert(`Failed to preview file: ${err}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleImport = async () => {
        if (!filePath) return;

        setImporting(true);
        try {
            const count = await invoke<number>("import_contacts", {
                filePath,
                mapping,
            });
            setImportResult(count);
            onImportComplete?.();
        } catch (err) {
            alert(`Import failed: ${err}`);
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFilePath(null);
        setPreview(null);
        setMapping({
            first_name: null,
            last_name: null,
            email: null,
            linkedin_url: null,
            company: null,
        });
        setImportResult(null);
        onOpenChange(false);
    };

    const updateMapping = (field: keyof ColumnMapping, value: string) => {
        setMapping(prev => ({
            ...prev,
            [field]: value === "none" ? null : parseInt(value, 10),
        }));
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5" />
                        Import Contacts
                    </DialogTitle>
                    <DialogDescription>
                        Import contacts from a CSV or Excel file
                    </DialogDescription>
                </DialogHeader>

                {importResult !== null ? (
                    /* Success State */
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <CheckCircle className="h-16 w-16 text-green-500" />
                        <h3 className="text-xl font-semibold">Import Complete!</h3>
                        <p className="text-muted-foreground">
                            Successfully imported <strong>{importResult}</strong> contacts.
                        </p>
                        <Button onClick={handleClose}>Done</Button>
                    </div>
                ) : !preview ? (
                    /* File Selection State */
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="p-6 rounded-full bg-muted">
                            <Upload className="h-12 w-12 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-center">
                            Select a CSV, XLSX, or XLS file to import
                        </p>
                        <Button onClick={handleSelectFile} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                "Choose File"
                            )}
                        </Button>
                    </div>
                ) : (
                    /* Mapping State */
                    <div className="space-y-6">
                        <div className="text-sm text-muted-foreground">
                            File: <code className="bg-muted px-1 rounded">{filePath?.split("/").pop()}</code>
                            {" • "}{preview.total_rows} rows detected
                        </div>

                        {/* Column Mapping */}
                        <div className="space-y-4">
                            <h4 className="font-medium">Map Columns</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {(["first_name", "last_name", "email", "linkedin_url", "company"] as const).map(field => (
                                    <div key={field} className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">
                                            {field.replace("_", " ")}
                                        </Label>
                                        <Select
                                            value={mapping[field]?.toString() ?? "none"}
                                            onValueChange={(v) => updateMapping(field, v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">— Not mapped —</SelectItem>
                                                {preview.headers.map((header, idx) => (
                                                    <SelectItem key={idx} value={idx.toString()}>
                                                        {header}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="space-y-2">
                            <h4 className="font-medium">Preview (first 5 rows)</h4>
                            <div className="border rounded-md overflow-auto max-h-[200px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {preview.headers.map((header, idx) => (
                                                <TableHead key={idx} className="whitespace-nowrap">
                                                    {header}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.sample_rows.map((row, rowIdx) => (
                                            <TableRow key={rowIdx}>
                                                {row.map((cell, cellIdx) => (
                                                    <TableCell key={cellIdx} className="truncate max-w-[150px]">
                                                        {cell}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                )}

                {preview && importResult === null && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setPreview(null); setFilePath(null); }}>
                            Back
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={importing || (mapping.first_name === null && mapping.last_name === null)}
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                `Import ${preview.total_rows} Contacts`
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
