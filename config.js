/*
 * EGP Digit Span Test configuration
 *
 * IMPORTANT:
 * Replace PASTE_YOUR_GOOGLE_APPS_SCRIPT_EXEC_URL_HERE with the production
 * Google Apps Script URL ending in /exec.
 */
const CONFIG = Object.freeze({
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwVcKJEjYBhiinX3QiSY3mS3LDydTzdemQQ8v42I6pI4Mn-pf8bANLGZwZ74ukKCeDw/exec",

  APP_NAME: "EGP Digit Span Test",
  VERSION: "1.0.0",

  // Original PsyToolkit task settings
  STARTING_SPAN: 2,
  MAXIMUM_SPAN: 9,
  CORRECT_TO_ADVANCE: 2,
  ERRORS_TO_STOP: 2,
  MAX_TRIALS_PER_SPAN: 3,

  READY_MESSAGE_TIME_MS: 1000,
  GET_READY_TIME_MS: 800,
  DIGIT_DISPLAY_TIME_MS: 800,
  FEEDBACK_TIME_MS: 2000,

  REQUIRE_REGISTRATION_ID: true,
  ALLOWED_TEST_TYPES: ["pretest", "posttest"],

  // Submission retry behavior
  SUBMISSION_RETRIES: 3,
  RETRY_DELAY_MS: 1500
});
