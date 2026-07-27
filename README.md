# EGP Digit Span Test

A GitHub Pages version of the PsyToolkit digit span task, prepared for
Euler's Golden Pie research data collection.

## What was preserved from the supplied PsyToolkit task

- Starts at a span of 2 digits
- Digits are sampled without replacement
- Each digit is displayed for 800 milliseconds
- Participants enter the sequence in the original order
- A selected digit cannot be selected again during the same response
- `Clear last` removes the most recently selected digit
- Two correct trials at a span are required to advance
- Two incorrect trials at a span stop the test
- A maximum of three trials can occur at a span
- The maximum measured span is 9
- Correct/incorrect feedback is displayed for 2 seconds
- The final score is the highest span passed

The original training/demo screens were removed. The interface, participant
registration, pretest/post-test choice, and Google Sheets submission were added.

## Files

```text
egp-digit-span-test/
├── index.html
├── style.css
├── script.js
├── config.js
├── Code.gs
├── README.md
└── assets/
```

## Setup order

### 1. Prepare the Google Sheet

Create two tabs named exactly:

- `Summary`
- `TrialData`

### 2. Add the Apps Script

Open the spreadsheet and go to:

`Extensions → Apps Script`

Replace the contents of `Code.gs` with the supplied `Code.gs` file.

Deploy it as a web app:

- Execute as: **Me**
- Who has access: **Anyone**

Copy the production URL ending in `/exec`.

### 3. Configure the website

Open `config.js` and replace:

```javascript
APPS_SCRIPT_URL: "PASTE_YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE",
```

with your real `/exec` URL.

### 4. Upload to GitHub

Upload all website files to the root of the repository.

### 5. Enable GitHub Pages

Go to:

`Repository Settings → Pages`

Choose:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/root`

Save and wait for the website URL to appear.

## Data structure

The `Summary` sheet receives one row per completed assessment.

The `TrialData` sheet receives one row for every trial, including:

- Registration ID
- Pretest or post-test
- Span length
- Target sequence
- Participant response
- Correct or incorrect
- Response time
- Correct/error counters at the span

## Research notes

- Use anonymous registration IDs instead of participant names.
- Keep the participant identity key in a separate protected file.
- Use the same device type and testing conditions for pretest and post-test.
- Do not let participants refresh or leave the page during an assessment.
- Pilot the system before collecting real study data.
- A maximum score of 9 may produce a ceiling effect after EGP training.

## Attribution

The task logic was recreated from the PsyToolkit digit span implementation
supplied for this project. Review PsyToolkit's applicable attribution and usage
terms before public redistribution or publication.
