(() => {
  "use strict";

  const state = {
    registrationId: "",
    testType: "",
    startedAt: null,
    completedAt: null,
    currentSpan: CONFIG.STARTING_SPAN,
    correctAtSpan: 0,
    errorsAtSpan: 0,
    trialAtSpan: 0,
    bestSoFar: 0,
    targetSequence: [],
    responseSequence: [],
    responseStartedAtMs: 0,
    trials: [],
    testLocked: false,
    sessionActive: false,
    duplicateCheckInProgress: false
  };

  const screens = {
    registration: document.getElementById("registrationScreen"),
    ready: document.getElementById("readyScreen"),
    test: document.getElementById("testScreen"),
    submitting: document.getElementById("submittingScreen"),
    results: document.getElementById("resultsScreen")
  };

  const elements = {
    registrationForm: document.getElementById("registrationForm"),
    registrationId: document.getElementById("registrationId"),
    testType: document.getElementById("testType"),
    registrationError: document.getElementById("registrationError"),
    continueButton: document.getElementById("continueButton"),
    continueSpinner: document.getElementById("continueSpinner"),

    readyRegistrationId: document.getElementById("readyRegistrationId"),
    readyTestType: document.getElementById("readyTestType"),
    beginTestButton: document.getElementById("beginTestButton"),
    backToRegistrationButton: document.getElementById("backToRegistrationButton"),

    stageBadge: document.getElementById("stageBadge"),
    progressText: document.getElementById("progressText"),
    presentationMessage: document.getElementById("presentationMessage"),
    digitDisplay: document.getElementById("digitDisplay"),

    responseArea: document.getElementById("responseArea"),
    selectedSequence: document.getElementById("selectedSequence"),
    digitPad: document.getElementById("digitPad"),
    clearButton: document.getElementById("clearButton"),
    submitSequenceButton: document.getElementById("submitSequenceButton"),
    feedbackArea: document.getElementById("feedbackArea"),

    finalScore: document.getElementById("finalScore"),
    totalTrials: document.getElementById("totalTrials"),
    correctTrials: document.getElementById("correctTrials"),
    incorrectTrials: document.getElementById("incorrectTrials"),
    submissionMessage: document.getElementById("submissionMessage"),
    returnMainButton: document.getElementById("returnMainButton"),

    footerAppName: document.getElementById("footerAppName"),
    footerVersion: document.getElementById("footerVersion")
  };

  const sleep = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));

  function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove("active"));
    screens[screenName].classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function normalizeRegistrationId(value) {
    return value.trim().replace(/\s+/g, " ").toUpperCase();
  }

  function validateRegistration() {
    const registrationId = normalizeRegistrationId(elements.registrationId.value);
    const testType = elements.testType.value;

    if (CONFIG.REQUIRE_REGISTRATION_ID && !registrationId) {
      return { valid: false, message: "Enter a registration ID." };
    }

    if (registrationId.length > 50) {
      return { valid: false, message: "Registration ID must be 50 characters or fewer." };
    }

    if (!CONFIG.ALLOWED_TEST_TYPES.includes(testType)) {
      return { valid: false, message: "Select Pretest or Post-test." };
    }

    return { valid: true, registrationId, testType };
  }

  function formatTestType(testType) {
    return testType === "pretest" ? "Pretest" : "Post-test";
  }

  function endpointConfigured() {
    return (
      typeof CONFIG.APPS_SCRIPT_URL === "string" &&
      CONFIG.APPS_SCRIPT_URL.startsWith("https://script.google.com/") &&
      CONFIG.APPS_SCRIPT_URL.endsWith("/exec")
    );
  }

  function setContinueLoading(isLoading) {
    state.duplicateCheckInProgress = isLoading;
    elements.continueButton.disabled = isLoading;
    elements.continueSpinner.classList.toggle("hidden", !isLoading);
  }

  function jsonpRequest(parameters, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (!endpointConfigured()) {
        reject(new Error("Google Apps Script URL is not configured."));
        return;
      }

      const callbackName = `egpJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("The server took too long to respond."));
      }, timeoutMs);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }

      window[callbackName] = data => {
        cleanup();
        resolve(data);
      };

      const url = new URL(CONFIG.APPS_SCRIPT_URL);
      Object.entries(parameters).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));

      script.src = url.toString();
      script.onerror = () => {
        cleanup();
        reject(new Error("Could not contact the study server."));
      };

      document.body.appendChild(script);
    });
  }

  async function checkDuplicate(registrationId, testType) {
    const result = await jsonpRequest({
      action: "checkDuplicate",
      registrationId,
      testType
    }, CONFIG.DUPLICATE_CHECK_TIMEOUT_MS);

    if (!result || result.success !== true) {
      throw new Error(result?.message || "Duplicate check failed.");
    }

    return result.duplicate === true;
  }

  function buildDigitPad() {
    elements.digitPad.innerHTML = "";
    [1,2,3,4,5,6,7,8,9,0].forEach(digit => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "digit-button";
      button.dataset.digit = String(digit);
      button.textContent = String(digit);
      button.setAttribute("aria-label", `Select digit ${digit}`);
      button.addEventListener("click", () => selectDigit(digit));
      elements.digitPad.appendChild(button);
    });
  }

  function resetTestState() {
    state.startedAt = null;
    state.completedAt = null;
    state.currentSpan = CONFIG.STARTING_SPAN;
    state.correctAtSpan = 0;
    state.errorsAtSpan = 0;
    state.trialAtSpan = 0;
    state.bestSoFar = 0;
    state.targetSequence = [];
    state.responseSequence = [];
    state.responseStartedAtMs = 0;
    state.trials = [];
    state.testLocked = false;
    state.sessionActive = false;
  }

  function createUniqueDigitSequence(length) {
    const available = [0,1,2,3,4,5,6,7,8,9];

    for (let index = available.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [available[index], available[randomIndex]] = [available[randomIndex], available[index]];
    }

    return available.slice(0, length);
  }

  function updateProgress() {
    elements.progressText.textContent =
      `Current Span: ${state.currentSpan} • Attempt: ${state.trialAtSpan + 1} / ${CONFIG.MAX_TRIALS_PER_SPAN}`;
  }

  function clearPresentation() {
    elements.presentationMessage.textContent = "";
    elements.digitDisplay.textContent = "";
  }

  function hideResponseArea() { elements.responseArea.classList.add("hidden"); }
  function showResponseArea() { elements.responseArea.classList.remove("hidden"); }

  function hideFeedback() {
    elements.feedbackArea.classList.add("hidden");
    elements.feedbackArea.classList.remove("correct", "incorrect");
    elements.feedbackArea.textContent = "";
  }

  function disableResponseControls(disabled) {
    elements.clearButton.disabled = disabled || state.responseSequence.length === 0;
    elements.submitSequenceButton.disabled = disabled || state.responseSequence.length === 0;

    elements.digitPad.querySelectorAll(".digit-button").forEach(button => {
      const digit = Number(button.dataset.digit);
      const selected = state.responseSequence.includes(digit);
      button.disabled = disabled || selected;
      button.classList.toggle("selected", selected);
    });
  }

  function renderSelectedSequence() {
    elements.selectedSequence.innerHTML = "";

    if (state.responseSequence.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "sequence-placeholder";
      placeholder.textContent = "Select digits below";
      elements.selectedSequence.appendChild(placeholder);
    } else {
      state.responseSequence.forEach(digit => {
        const item = document.createElement("span");
        item.className = "selected-digit";
        item.textContent = String(digit);
        elements.selectedSequence.appendChild(item);
      });
    }

    disableResponseControls(false);
  }

  function selectDigit(digit) {
    if (state.testLocked || state.responseSequence.includes(digit)) return;
    state.responseSequence.push(digit);
    renderSelectedSequence();
  }

  function clearLastDigit() {
    if (state.testLocked || state.responseSequence.length === 0) return;
    state.responseSequence.pop();
    renderSelectedSequence();
  }

  function arraysEqual(first, second) {
    return first.length === second.length &&
      first.every((value, index) => value === second[index]);
  }

  async function presentTrial() {
    state.testLocked = true;
    state.responseSequence = [];
    state.targetSequence = createUniqueDigitSequence(state.currentSpan);
    state.trialAtSpan += 1;

    hideFeedback();
    hideResponseArea();
    clearPresentation();
    updateProgress();

    elements.presentationMessage.textContent = "Memorize digits";
    await sleep(CONFIG.READY_MESSAGE_TIME_MS);

    elements.presentationMessage.textContent = "Get ready now!";
    await sleep(CONFIG.GET_READY_TIME_MS);

    elements.presentationMessage.textContent = "";

    for (const digit of state.targetSequence) {
      elements.digitDisplay.textContent = String(digit);
      await sleep(CONFIG.DIGIT_DISPLAY_TIME_MS);
      elements.digitDisplay.textContent = "";
    }

    renderSelectedSequence();
    showResponseArea();
    state.responseStartedAtMs = performance.now();
    state.testLocked = false;
    disableResponseControls(false);
  }

  function recordTrial(isCorrect, responseTimeMs) {
    state.trials.push({
      trialNumber: state.trials.length + 1,
      span: state.currentSpan,
      trialAtSpan: state.trialAtSpan,
      targetSequence: [...state.targetSequence],
      responseSequence: [...state.responseSequence],
      correct: isCorrect,
      correctAtSpan: state.correctAtSpan,
      errorsAtSpan: state.errorsAtSpan,
      responseTimeMs: Math.round(responseTimeMs),
      startedAt: new Date(Date.now() - Math.max(0, responseTimeMs)).toISOString(),
      completedAt: new Date().toISOString(),
      bestSoFarBeforeTrial: state.bestSoFar
    });
  }

  async function submitCurrentSequence() {
    if (state.testLocked || state.responseSequence.length === 0) return;

    state.testLocked = true;
    disableResponseControls(true);

    const responseTimeMs = performance.now() - state.responseStartedAtMs;
    const isCorrect = arraysEqual(state.responseSequence, state.targetSequence);

    if (isCorrect) state.correctAtSpan += 1;
    else state.errorsAtSpan += 1;

    recordTrial(isCorrect, responseTimeMs);

    hideResponseArea();
    clearPresentation();

    elements.feedbackArea.textContent = isCorrect ? "CORRECT" : "WRONG";
    elements.feedbackArea.classList.remove("hidden");
    elements.feedbackArea.classList.add(isCorrect ? "correct" : "incorrect");

    await sleep(CONFIG.FEEDBACK_TIME_MS);

    if (state.correctAtSpan >= CONFIG.CORRECT_TO_ADVANCE) {
      state.bestSoFar = state.currentSpan;
      state.currentSpan += 1;
      state.correctAtSpan = 0;
      state.errorsAtSpan = 0;
      state.trialAtSpan = 0;
    }

    if (
      state.errorsAtSpan >= CONFIG.ERRORS_TO_STOP ||
      state.currentSpan > CONFIG.MAXIMUM_SPAN ||
      state.trialAtSpan >= CONFIG.MAX_TRIALS_PER_SPAN
    ) {
      await finishTest();
      return;
    }

    await presentTrial();
  }

  function calculateSummary() {
    const correctTrials = state.trials.filter(trial => trial.correct).length;
    return {
      totalTrials: state.trials.length,
      correctTrials,
      incorrectTrials: state.trials.length - correctTrials
    };
  }

  function buildSubmissionPayload() {
    const summary = calculateSummary();
    const completedAt = state.completedAt || new Date();

    return {
      action: "submitAssessment",
      registrationId: state.registrationId,
      testType: state.testType,
      finalScore: state.bestSoFar,
      totalTrials: summary.totalTrials,
      correctTrials: summary.correctTrials,
      incorrectTrials: summary.incorrectTrials,
      startedAt: state.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationSeconds: Math.round((completedAt.getTime() - state.startedAt.getTime()) / 1000),
      userAgent: navigator.userAgent,
      appName: CONFIG.APP_NAME,
      appVersion: CONFIG.VERSION,
      testSettings: {
        startingSpan: CONFIG.STARTING_SPAN,
        maximumSpan: CONFIG.MAXIMUM_SPAN,
        correctToAdvance: CONFIG.CORRECT_TO_ADVANCE,
        errorsToStop: CONFIG.ERRORS_TO_STOP,
        maximumTrialsPerSpan: CONFIG.MAX_TRIALS_PER_SPAN,
        digitDisplayTimeMs: CONFIG.DIGIT_DISPLAY_TIME_MS,
        repeatedDigitsAllowed: false
      },
      trials: state.trials
    };
  }

  function savePendingSubmission(payload) {
    try {
      localStorage.setItem("egpDigitSpanPendingSubmission", JSON.stringify(payload));
    } catch (error) {
      console.warn("Unable to save pending submission locally.", error);
    }
  }

  function clearPendingSubmission() {
    try {
      localStorage.removeItem("egpDigitSpanPendingSubmission");
    } catch (error) {
      console.warn("Unable to clear pending submission.", error);
    }
  }

  async function sendResults(payload) {
    if (!endpointConfigured()) {
      throw new Error("Google Apps Script URL is not configured in config.js.");
    }

    let lastError = null;

    for (let attempt = 1; attempt <= CONFIG.SUBMISSION_RETRIES; attempt += 1) {
      try {
        await fetch(CONFIG.APPS_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          cache: "no-store",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });

        clearPendingSubmission();
        return true;
      } catch (error) {
        lastError = error;
        if (attempt < CONFIG.SUBMISSION_RETRIES) {
          await sleep(CONFIG.RETRY_DELAY_MS);
        }
      }
    }

    throw lastError || new Error("Results could not be submitted.");
  }

  function displayResults(submissionStatus, submissionError = "") {
    const summary = calculateSummary();

    elements.finalScore.textContent = String(state.bestSoFar);
    elements.totalTrials.textContent = String(summary.totalTrials);
    elements.correctTrials.textContent = String(summary.correctTrials);
    elements.incorrectTrials.textContent = String(summary.incorrectTrials);

    elements.submissionMessage.classList.remove("success", "warning");

    if (submissionStatus === "sent") {
      elements.submissionMessage.textContent = "The assessment data was sent to the study spreadsheet.";
      elements.submissionMessage.classList.add("success");
    } else {
      elements.submissionMessage.textContent =
        "The assessment is complete, but automatic submission could not be confirmed. " +
        "The data was saved in this browser for recovery." +
        (submissionError ? ` (${submissionError})` : "");
      elements.submissionMessage.classList.add("warning");
    }

    showScreen("results");
  }

  async function finishTest() {
    state.testLocked = true;
    state.completedAt = new Date();
    state.sessionActive = false;
    hideResponseArea();
    hideFeedback();
    clearPresentation();
    showScreen("submitting");

    const payload = buildSubmissionPayload();
    savePendingSubmission(payload);

    try {
      await sendResults(payload);
      displayResults("sent");
    } catch (error) {
      console.error("Submission failed:", error);
      displayResults("failed", error.message);
    }
  }

  async function beginTest() {
    resetTestState();
    state.startedAt = new Date();
    state.sessionActive = true;
    history.pushState({ egpTest: true }, "", window.location.href);

    elements.stageBadge.textContent = formatTestType(state.testType);
    showScreen("test");
    await presentTrial();
  }

  function returnToMainScreen() {
    state.sessionActive = false;
    resetTestState();
    state.registrationId = "";
    state.testType = "";

    elements.registrationForm.reset();
    elements.registrationError.textContent = "";
    elements.submissionMessage.textContent = "";
    showScreen("registration");
    elements.registrationId.focus();
  }

  function initializeLeaveProtection() {
    window.addEventListener("beforeunload", event => {
      if (!state.sessionActive) return;
      event.preventDefault();
      event.returnValue = "";
    });

    window.addEventListener("popstate", () => {
      if (!state.sessionActive) return;

      history.pushState({ egpTest: true }, "", window.location.href);
      window.alert(
        "The assessment is still in progress. Complete the test before leaving this page."
      );
    });
  }

  function initialize() {
    elements.footerAppName.textContent = CONFIG.APP_NAME;
    elements.footerVersion.textContent = `Version ${CONFIG.VERSION}`;

    buildDigitPad();
    initializeLeaveProtection();

    elements.registrationForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (state.duplicateCheckInProgress) return;

      elements.registrationError.textContent = "";
      const result = validateRegistration();

      if (!result.valid) {
        elements.registrationError.textContent = result.message;
        return;
      }

      setContinueLoading(true);

      try {
        const duplicate = await checkDuplicate(result.registrationId, result.testType);

        if (duplicate) {
          elements.registrationError.textContent =
            `${formatTestType(result.testType)} results already exist for this registration ID.`;
          return;
        }

        state.registrationId = result.registrationId;
        state.testType = result.testType;

        elements.readyRegistrationId.textContent = state.registrationId;
        elements.readyTestType.textContent = formatTestType(state.testType);
        showScreen("ready");
      } catch (error) {
        console.error(error);
        elements.registrationError.textContent =
          `Could not verify the registration ID: ${error.message}`;
      } finally {
        setContinueLoading(false);
      }
    });

    elements.beginTestButton.addEventListener("click", beginTest);
    elements.backToRegistrationButton.addEventListener("click", () => showScreen("registration"));
    elements.clearButton.addEventListener("click", clearLastDigit);
    elements.submitSequenceButton.addEventListener("click", submitCurrentSequence);
    elements.returnMainButton.addEventListener("click", returnToMainScreen);

    elements.registrationId.focus();
  }

  initialize();
})();
