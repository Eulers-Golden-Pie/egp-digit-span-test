/*
 * EGP Digit Span Test configuration
 *
 * Keep your working Google Apps Script production URL below.
 */
const CONFIG = Object.freeze({
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx6tdVdVTAXQTtKSre9uPnFAWBBRrSx5EYb6Ua0WBOHu92TWDD1Bi-i3q6xv42G6UVz/exec",

  APP_NAME: "EGP Digit Span Test",
  VERSION: "2.0.0",

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

  DUPLICATE_CHECK_TIMEOUT_MS: 10000,
  SUBMISSION_RETRIES: 3,
  RETRY_DELAY_MS: 1500
});
