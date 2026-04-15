export interface ChangelogEntry {
    label: string;
    detail: string;
}

export interface Release {
    version: string;
    date: string;
    entries: ChangelogEntry[];
}

export const CHANGELOG: Release[] = [
    {
        version: "0.2.1",
        date: "April 15, 2026",
        entries: [
            {
                label: "Under-the-hood fixes",
                detail: "Resolved several backend compilation issues to ensure smooth synchronization and performance.",
            },
        ],
    },
    {
        version: "0.2.0",
        date: "April 14, 2026",
        entries: [
            {
                label: "Fully functional email inbox",
                detail: "A dedicated Emails page with full email reading, formatting, sending, scheduling, and timestamp sync.",
            },
            {
                label: "Keyboard shortcuts",
                detail: "Cmd+N for new contact, Cmd+Shift+C to compose, Cmd+1–5 to jump between pages, Cmd+/ to see all shortcuts. Global Command Palette (⌘K) is now available everywhere.",
            },
            {
                label: "Pipeline settings",
                detail: "Drag to reorder stages, rename them, change their colour, or delete ones you don't need.",
            },
            {
                label: "Tag filtering",
                detail: "Filter your contacts list by one or more tags. Useful once you've got a few dozen people in here.",
            },
            {
                label: "Restore from backup",
                detail: "If you exported your data before, you can now bring it back. Contacts, statuses, and tags are merged — nothing gets overwritten.",
            },
            {
                label: "Improved data imports",
                detail: "CSV imports now automatically map the 'Company Website' column when adding contacts.",
            },
            {
                label: "Outlook connection fixes",
                detail: "Fixed major token parsing and server connectivity issues with Microsoft Outlook accounts.",
            },
            {
                label: "Update checker",
                detail: "JobDex now checks for new versions on launch and shows a banner if there's something newer available.",
            },
            {
                label: "Lots of fixes",
                detail: "Kanban +New now pre-selects the right stage. Error messages are much more helpful. Toast spam is gone.",
            },
        ],
    },
    {
        version: "0.1.3",
        date: "March 21, 2026",
        entries: [
            {
                label: "Activity timeline",
                detail: "Status changes and sent emails now show up automatically on each contact's timeline.",
            },
            {
                label: "Email signatures",
                detail: "Create signatures once in Settings and pick them when you compose.",
            },
            {
                label: "Scheduled emails",
                detail: "See all your queued sends in one place. Cancel any of them before they go out.",
            },
            {
                label: "Attached files",
                detail: "Attach a resume, cover letter, or any file directly to a contact.",
            },
            {
                label: "Schedule date picker",
                detail: "Replaced the clunky browser date input with a proper calendar + time picker.",
            },
            {
                label: "Bulk status update",
                detail: "Select multiple contacts and move them through your pipeline in one go.",
            },
            {
                label: "Variable chips in subject",
                detail: "{{first_name}} and {{company}} now insert at the cursor in the subject line too.",
            },
            {
                label: "Delete activity entries",
                detail: "Hover over any timeline event to remove it. Duplicate entries are gone.",
            },
        ],
    },
];

// The most recent release — used by the About tab and the What's New modal (M12)
export const LATEST_RELEASE = CHANGELOG[0];
