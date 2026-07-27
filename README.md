# EGP Digit Span Test — Version 2

This package adds:

- Dark theme
- Refresh/close warning during an active assessment
- Browser back-button protection during an active assessment
- Duplicate Registration ID + test-type prevention
- Password-protected dashboard
- Pretest/post-test comparison table
- Dashboard CSV download
- Return to Main Screen button

## Files

```text
index.html
style.css
script.js
config.js
dashboard.html
dashboard.css
dashboard.js
Code.gs
README.md
assets/
```

## Upgrade steps

### 1. Preserve your working Apps Script URL

In `config.js`, replace the placeholder with the same working `/exec` URL.

### 2. Replace Apps Script code

Replace your current Apps Script `Code.gs` with the new `Code.gs`.

Then deploy a **new version**:

`Deploy → Manage deployments → Edit → New version → Deploy`

Keep the same production `/exec` URL.

### 3. Configure the dashboard password

In Apps Script:

1. Open **Project Settings**
2. Scroll to **Script Properties**
3. Add a property:
   - Property: `DASHBOARD_KEY`
   - Value: choose a private password
4. Save

Do not place this key in GitHub or `config.js`.

### 4. Upload the website files

Replace the existing repository files with the files in this package.

The dashboard will be available at:

```text
https://YOUR-GITHUB-PAGES-SITE/dashboard.html
```

## Important browser limitation

Websites cannot completely disable browser refresh, closing, or navigation. This version:

- triggers the browser's standard leave-page warning on refresh/close
- intercepts the browser Back button during an active assessment
- warns the participant and returns them to the test

This is the strongest normal browser protection available without kiosk software.

## Duplicate behavior

The system blocks a duplicate only when both values match:

- Registration ID
- Assessment stage

Therefore one participant may have:

- one pretest
- one post-test

but not two pretests or two post-tests.

The Apps Script performs a server-side duplicate check again during submission to reduce accidental duplicate records.
