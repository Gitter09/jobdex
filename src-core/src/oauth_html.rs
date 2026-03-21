pub fn get_success_html(service: &str) -> String {
    format!(
        r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Successful</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --primary: #10b981;
            --primary-foreground: #ffffff;
            --background: #000000;
            --foreground: #ffffff;
            --card: rgba(255, 255, 255, 0.05);
            --card-foreground: #ffffff;
            --muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.1);
        }}

        body {{
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: var(--background);
            color: var(--foreground);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
        }}

        .card {{
            background: var(--card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 1.5rem;
            padding: 3.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            max-width: 420px;
            width: 90%;
            transform: translateY(20px);
            opacity: 0;
            animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }}

        @keyframes slideUp {{
            to {{
                transform: translateY(0);
                opacity: 1;
            }}
        }}

        .icon-container {{
            width: 90px;
            height: 90px;
            background-color: rgba(16, 185, 129, 0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }}

        @keyframes scaleIn {{
            from {{ transform: scale(0); }}
            to {{ transform: scale(1); }}
        }}

        .icon {{
            width: 48px;
            height: 48px;
            color: var(--primary);
        }}

        h1 {{
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
            letter-spacing: -0.025em;
            color: #ffffff;
        }}

        p {{
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 2.5rem;
            font-size: 1rem;
        }}

        .btn {{
            background-color: var(--primary);
            color: var(--primary-foreground);
            font-weight: 600;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: none;
            width: 100%;
            font-size: 1rem;
        }}

        .btn:hover {{
            filter: brightness(1.1);
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
        }}

        .service-badge {{
            display: inline-block;
            background-color: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            padding: 0.35rem 1rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: 1.25rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }}

        .fallback {{
            font-size: 0.8rem;
            color: rgba(148, 163, 184, 0.6);
            margin-top: 1rem;
            margin-bottom: 0;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-container">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <div class="service-badge">{service} Connected</div>
        <h1>You're connected.</h1>
        <p>Head back to OutreachOS — your account is good to go.</p>
        <button class="btn" onclick="window.close()">Close this tab</button>
        <p class="fallback">If this doesn't close, you can close the tab manually.</p>
    </div>
</body>
</html>
"#,
        service = service
    )
}

pub fn get_error_html(error: &str) -> String {
    format!(
        r#"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Failed</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {{
            --error: #ef4444;
            --error-foreground: #ffffff;
            --background: #000000;
            --foreground: #ffffff;
            --card: rgba(255, 255, 255, 0.05);
            --card-foreground: #ffffff;
            --muted: #94a3b8;
            --border: rgba(255, 255, 255, 0.1);
        }}

        body {{
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: var(--background);
            color: var(--foreground);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            overflow: hidden;
        }}

        .card {{
            background: var(--card);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 1.5rem;
            padding: 3.5rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            text-align: center;
            max-width: 420px;
            width: 90%;
            transform: translateY(20px);
            opacity: 0;
            animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }}

        @keyframes slideUp {{
            to {{
                transform: translateY(0);
                opacity: 1;
            }}
        }}

        .icon-container {{
            width: 90px;
            height: 90px;
            background-color: rgba(239, 68, 68, 0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 2rem;
            animation: scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
        }}

        @keyframes scaleIn {{
            from {{ transform: scale(0); }}
            to {{ transform: scale(1); }}
        }}

        .icon {{
            width: 48px;
            height: 48px;
            color: var(--error);
        }}

        h1 {{
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
            letter-spacing: -0.025em;
            color: #ffffff;
        }}

        p {{
            color: var(--muted);
            line-height: 1.6;
            margin-bottom: 2.5rem;
            font-size: 1rem;
        }}

        .btn {{
            background-color: rgba(255, 255, 255, 0.1);
            color: #ffffff;
            font-weight: 600;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            text-decoration: none;
            display: inline-block;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: 1px solid rgba(255, 255, 255, 0.1);
            width: 100%;
            font-size: 1rem;
        }}

        .btn:hover {{
            background-color: rgba(255, 255, 255, 0.15);
            transform: translateY(-2px);
        }}

        .error-badge {{
            display: inline-block;
            background-color: rgba(239, 68, 68, 0.1);
            color: var(--error);
            padding: 0.35rem 1rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: 1.25rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid rgba(239, 68, 68, 0.2);
        }}

        .fallback {{
            font-size: 0.8rem;
            color: rgba(148, 163, 184, 0.6);
            margin-top: 1rem;
            margin-bottom: 0;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-container">
            <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </div>
        <div class="error-badge">Connection failed</div>
        <h1>That didn't work.</h1>
        <p>{error}<br><br>Close this tab and try connecting again from OutreachOS.</p>
        <button class="btn" onclick="window.close()">Close this tab</button>
        <p class="fallback">If this doesn't close, you can close the tab manually.</p>
    </div>
</body>
</html>
"#,
        error = error
    )
}
