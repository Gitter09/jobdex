import assert from "node:assert/strict";
import { test } from "node:test";
import { createBrowserState } from "../src/dev/browser/fixtures.ts";
import { dispatchBrowserCommand } from "../src/dev/browser/store.ts";

const now = new Date("2030-06-01T12:00:00.000Z");

test("manual reminders work without model consent or an email account", () => {
    const state = createBrowserState(now);
    state.emailAccounts = [];
    const reminder = dispatchBrowserCommand(state, "create_relationship_reminder", {
        contactId: state.contacts[0].id, title: "Remember the launch", description: "Ask how it went",
        dueAt: "2030-06-03T12:00:00.000Z",
    }, now);
    assert.equal(reminder.status, "needs_review");
    assert.deepEqual(state.actions.find((action) => action.id === reminder.id).payload, {
        title: "Remember the launch", description: "Ask how it went",
    });
});

test("ambiguous delivery cannot be snoozed back into a sendable state", () => {
    const state = createBrowserState(now);
    const action = state.actions.find((item) => item.status === "delivery_unknown");
    assert.throws(() => dispatchBrowserCommand(state, "review_relationship_action", {
        id: action.id, expectedRevision: action.revision, decision: "snooze",
        snoozedUntil: "2030-06-03T12:00:00.000Z",
    }, now), /no longer reviewable/);
    assert.equal(action.status, "delivery_unknown");
});

test("sending, AI calls and key storage are explicitly unavailable", () => {
    const state = createBrowserState(now);
    const before = JSON.stringify(state);
    for (const command of ["send_relationship_action", "email_send", "test_relationship_model", "refresh_relationship_memory"]) {
        assert.throws(() => dispatchBrowserCommand(state, command, {}, now), /native app/);
    }
    assert.throws(() => dispatchBrowserCommand(state, "configure_relationship_model", {
        config: { baseUrl: "https://provider.example.invalid/v1", model: "test", enabled: true, dailyRequestLimit: 20, allowedContactIds: [] },
        apiKey: "never-persist-this-test-key",
    }, now), /native app/);
    assert.equal(JSON.stringify(state), before);
});

test("stale workflow writes fail without replacing newer edits", () => {
    const state = createBrowserState(now);
    const workflow = state.workflows[0];
    assert.throws(() => dispatchBrowserCommand(state, "save_relationship_workflow", {
        ...workflow, title: "Must not overwrite", expectedRevision: workflow.revision + 1,
    }, now), /RELATIONSHIP_REVISION_CONFLICT/);
    assert.notEqual(workflow.title, "Must not overwrite");
});
