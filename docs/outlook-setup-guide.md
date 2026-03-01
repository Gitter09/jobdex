# Outlook / Microsoft 365 Connection Guide

Connect your Outlook or Microsoft 365 email account to OutreachOS to send, schedule, and track emails directly from the CRM.

---

## Prerequisites

- A Microsoft account (personal, work, or school)
- Access to the [Azure Portal](https://portal.azure.com)

---

## Step 1: Register an App in Azure

1. Go to [Azure App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2. Click **+ New registration**.
3. Fill in:
   - **Name**: `OutreachOS`
   - **Supported account types**: Select **Accounts in any organizational directory and personal Microsoft accounts**
   - **Redirect URI**: Choose **Web**, enter `http://localhost:8420`
4. Click **Register**.

## Step 2: Get Your Client ID & Secret

### Client ID
After registration, you'll land on the app's **Overview** page. Copy the **Application (client) ID**.

### Client Secret
1. In the left sidebar, click **Certificates & secrets**.
2. Under **Client secrets**, click **+ New client secret**.
3. Add a description (e.g., `OutreachOS`) and choose an expiry (recommended: 24 months).
4. Click **Add**.
5. **Immediately copy the secret Value** — it will only be shown once.

## Step 3: Configure API Permissions

1. In the left sidebar, click **API permissions**.
2. Click **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**.
3. Add the following permissions:
   - `Mail.Read`
   - `Mail.Send`
   - `User.Read`
   - `offline_access`
4. Click **Add permissions**.

> [!NOTE]
> If your organization requires admin consent, click **Grant admin consent for [Org]**. For personal accounts, consent is granted during the first login.

## Step 4: Create the Credentials File

1. Create (or navigate to) the OutreachOS config directory:

   ```bash
   mkdir -p ~/.outreachos
   ```

2. Create a file named `ms_credentials.json` inside it:

   ```bash
   nano ~/.outreachos/ms_credentials.json
   ```

3. Paste the following, replacing the placeholder values with your own:

   ```json
   {
     "installed": {
       "client_id": "YOUR_APPLICATION_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET_VALUE"
     }
   }
   ```

4. Save the file.

## Step 5: Connect in OutreachOS

1. Open OutreachOS.
2. Go to **Settings** (gear icon) → **Email Integration**.
3. Click **Connect Outlook**.
4. Your browser will open Microsoft's login page — sign in and grant the requested permissions.
5. After authorization, you'll see a **"✓ Outlook Connected!"** confirmation page. You can close the browser tab.
6. Back in OutreachOS, your Outlook account will appear under **Connected Accounts**.

---

## Troubleshooting

| Symptom | Solution |
|---|---|
| `ms_credentials.json not found` | Ensure the file exists at `~/.outreachos/ms_credentials.json` |
| `Invalid ms_credentials.json format` | Verify the JSON structure matches the template above (note the `installed` wrapper) |
| `Token exchange failed` | Double-check your Client Secret (it's the **Value**, not the Secret ID) |
| Browser doesn't open | Manually open the URL printed in the terminal log |
| `AADSTS700016` error | Ensure **Redirect URI** in Azure is exactly `http://localhost:8420` |
| Permission denied errors | Verify API permissions are granted in Azure and admin consent is provided if required |

---

## Security Notes

- Credentials are stored locally in `~/.outreachos/` — they never leave your machine.
- OAuth tokens are stored in the local SQLite database.
- OutreachOS uses PKCE (Proof Key for Code Exchange) for an additional layer of security during the OAuth flow.
- The local callback server (`localhost:8420`) only runs briefly during the connection process.
