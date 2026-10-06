import {
  TOPICS,
  buildPool,
  createQuizQuestions,
  percent,
  summarizeSession,
  validateQuestionBank
} from "./quiz.js";
import {
  getOverallAccuracy,
  getStrongestTopic,
  getTopicSummaries,
  getWeakestTopic,
  loadStats,
  recordSession,
  resetStats as clearStats
} from "./stats.js";

const PASSING_SCORE = 0.7;

const state = {
  questions: [],
  stats: loadStats(),
  quiz: null,
  reviewMode: false
};

const els = {
  themeToggle: document.querySelector("#themeToggle"),
  summaryMetrics: document.querySelector("#summaryMetrics"),
  statsDetails: document.querySelector("#statsDetails"),
  topicFilters: document.querySelector("#topicFilters"),
  practiceForm: document.querySelector("#practiceForm"),
  formMessage: document.querySelector("#formMessage"),
  rangeControls: document.querySelector("#rangeControls"),
  customCount: document.querySelector("#customCount"),
  resetStats: document.querySelector("#resetStats"),
  homeView: document.querySelector("#homeView"),
  quizView: document.querySelector("#quizView"),
  resultsView: document.querySelector("#resultsView"),
  questionCounter: document.querySelector("#questionCounter"),
  currentScore: document.querySelector("#currentScore"),
  questionText: document.querySelector("#questionText"),
  questionTopic: document.querySelector("#questionTopic"),
  questionDifficulty: document.querySelector("#questionDifficulty"),
  progressFill: document.querySelector("#progressFill"),
  choiceList: document.querySelector("#choiceList"),
  feedbackPanel: document.querySelector("#feedbackPanel"),
  submitAnswer: document.querySelector("#submitAnswer"),
  quitQuiz: document.querySelector("#quitQuiz"),
  resultHero: document.querySelector("#resultHero"),
  topicResults: document.querySelector("#topicResults"),
  reviewIncorrect: document.querySelector("#reviewIncorrect"),
  newPractice: document.querySelector("#newPractice"),
  returnHome: document.querySelector("#returnHome")
};

init();

async function init() {
  applySavedTheme();
  wireEvents();
  renderTopicFilters();
  try {
    const response = await fetch("data/questions.json");
    const rawQuestions = await response.json();
    state.questions = validateQuestionBank(rawQuestions);
    renderHome();
  } catch (error) {
    console.error("Could not load data/questions.json.", error);
    els.formMessage.textContent = "Could not load the question bank. Use Live Server or another local server.";
  }
}

function wireEvents() {
  els.themeToggle.addEventListener("click", toggleTheme);
  els.practiceForm.addEventListener("submit", handlePracticeSubmit);
  els.submitAnswer.addEventListener("click", handleMainQuizButton);
  els.quitQuiz.addEventListener("click", () => showView("home"));
  els.newPractice.addEventListener("click", () => showView("home"));
  els.returnHome.addEventListener("click", () => showView("home"));
  els.reviewIncorrect.addEventListener("click", startCurrentIncorrectReview);
  els.resetStats.addEventListener("click", () => {
    if (confirm("Reset all saved practice statistics?")) {
      state.stats = clearStats();
      renderHome();
    }
  });
  document.querySelectorAll('input[name="poolType"]').forEach((input) => {
    input.addEventListener("change", () => {
      els.rangeControls.classList.toggle("hidden", input.value !== "range" || !input.checked);
    });
  });
  els.rangeControls.classList.add("hidden");
}

function renderTopicFilters() {
  els.topicFilters.innerHTML = TOPICS.map(
    (topic) => `<label><input type="checkbox" name="topic" value="${escapeHtml(topic)}" /> ${topic}</label>`
  ).join("");
}

function renderHome() {
  const accuracy = getOverallAccuracy(state.stats);
  const weakest = getWeakestTopic(state.stats);
  const strongest = getStrongestTopic(state.stats);
  els.summaryMetrics.innerHTML = [
    metric("Question Bank", state.questions.length),
    metric("Sessions", state.stats.sessions),
    metric("Overall Accuracy", accuracy === null ? "No data" : percent(accuracy)),
    metric("Weakest Topic", weakest ? weakest.topic : "No data")
  ].join("");

  const summaries = getTopicSummaries(state.stats);
  els.statsDetails.innerHTML = [
    stat("Questions Answered", state.stats.totalAnswered),
    stat("Total Correct", state.stats.totalCorrect),
    stat("Previously Missed", state.stats.missedQuestionIds.length),
    stat("Later Mastered", state.stats.masteredQuestionIds.length),
    stat("Strongest Topic", strongest ? `${strongest.topic} (${percent(strongest.accuracy)})` : "No data"),
    stat("Weakest Topic", weakest ? `${weakest.topic} (${percent(weakest.accuracy)})` : "No data"),
    ...summaries.map((item) => stat(item.topic, `${item.correct} / ${item.answered} (${percent(item.accuracy)})`))
  ].join("");
}

function handlePracticeSubmit(event) {
  event.preventDefault();
  els.formMessage.textContent = "";
  const settings = getPracticeSettings();
  const pool = buildPool(state.questions, settings, state.stats);
  const count = Math.min(settings.count, pool.length);

  if (!pool.length) {
    els.formMessage.textContent = "No questions match that setup yet.";
    return;
  }

  if (settings.count > pool.length) {
    els.formMessage.textContent = `Only ${pool.length} questions match this pool, so the exam was capped at ${pool.length}.`;
  }

  startQuiz(createQuizQuestions(pool, count), false);
}

function getPracticeSettings() {
  const selectedPreset = document.querySelector('input[name="questionCount"]:checked')?.value ?? "25";
  const customCount = Number.parseInt(els.customCount.value, 10);
  const count = Number.isInteger(customCount) && customCount > 0 ? customCount : Number(selectedPreset);
  const poolType = document.querySelector('input[name="poolType"]:checked')?.value ?? "all";
  const selectedTopics = [...document.querySelectorAll('input[name="topic"]:checked')].map((input) => input.value);
  return {
    count,
    poolType,
    rangeFrom: Number.parseInt(document.querySelector("#rangeFrom").value, 10) || 1,
    rangeTo: Number.parseInt(document.querySelector("#rangeTo").value, 10) || Number.MAX_SAFE_INTEGER,
    selectedTopics,
    mode: document.querySelector('input[name="mode"]:checked')?.value ?? "random"
  };
}

function startQuiz(questions, reviewMode) {
  state.reviewMode = reviewMode;
  state.quiz = {
    questions,
    currentIndex: 0,
    selectedIndex: null,
    submitted: false,
    answers: []
  };
  showView("quiz");
  renderQuestion();
}

function renderQuestion() {
  const quiz = state.quiz;
  const question = quiz.questions[quiz.currentIndex];
  const answeredCorrectly = quiz.answers.filter((answer) => answer.correct).length;
  quiz.selectedIndex = null;
  quiz.submitted = false;

  els.questionCounter.textContent = `Question ${quiz.currentIndex + 1} of ${quiz.questions.length}`;
  els.currentScore.textContent = `Score ${answeredCorrectly} / ${quiz.answers.length}`;
  els.questionText.textContent = question.question;
  els.questionTopic.textContent = question.topic;
  els.questionDifficulty.textContent = question.difficulty;
  els.progressFill.style.width = `${(quiz.currentIndex / quiz.questions.length) * 100}%`;
  els.feedbackPanel.className = "feedback hidden";
  els.feedbackPanel.innerHTML = "";
  els.submitAnswer.textContent = "Submit Answer";
  els.submitAnswer.disabled = true;
  els.choiceList.innerHTML = question.shuffledChoices.map((choice, index) => `
    <button class="choice-card" type="button" data-index="${index}">
      <span class="choice-letter">${letter(index)}</span>
      <span>${escapeHtml(choice.text)}</span>
    </button>
  `).join("");

  els.choiceList.querySelectorAll(".choice-card").forEach((button) => {
    button.addEventListener("click", () => selectChoice(Number(button.dataset.index)));
  });
}

function selectChoice(index) {
  if (state.quiz.submitted) return;
  state.quiz.selectedIndex = index;
  els.submitAnswer.disabled = false;
  els.choiceList.querySelectorAll(".choice-card").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.index) === index);
  });
}

function handleMainQuizButton() {
  if (!state.quiz) return;
  if (state.quiz.submitted) {
    goNextQuestion();
  } else {
    submitAnswer();
  }
}

function submitAnswer() {
  const quiz = state.quiz;
  if (quiz.selectedIndex === null) return;
  const question = quiz.questions[quiz.currentIndex];
  const selectedChoice = question.shuffledChoices[quiz.selectedIndex];
  const correct = selectedChoice.isCorrect;
  quiz.submitted = true;
  quiz.answers.push({
    questionId: question.id,
    topic: question.topic,
    correct,
    selectedIndex: quiz.selectedIndex,
    correctIndex: question.shuffledCorrectIndex,
    question
  });

  els.currentScore.textContent = `Score ${quiz.answers.filter((answer) => answer.correct).length} / ${quiz.answers.length}`;
  els.progressFill.style.width = `${((quiz.currentIndex + 1) / quiz.questions.length) * 100}%`;
  els.choiceList.querySelectorAll(".choice-card").forEach((button) => {
    const index = Number(button.dataset.index);
    button.disabled = true;
    button.classList.toggle("correct", index === question.shuffledCorrectIndex);
    button.classList.toggle("incorrect", index === quiz.selectedIndex && !correct);
  });

  renderFeedback(question, correct);
  els.submitAnswer.textContent = quiz.currentIndex === quiz.questions.length - 1 ? "See Results" : "Next Question";
}

function renderFeedback(question, correct) {
  const correctChoice = question.shuffledChoices[question.shuffledCorrectIndex];
  const wrongItems = question.shuffledChoices
    .map((choice, index) => ({ choice, index }))
    .filter((item) => !item.choice.isCorrect)
    .map((item) => `
      <div class="wrong-item">
        <strong>${letter(item.index)}. ${escapeHtml(item.choice.text)}</strong>
        <div>${escapeHtml(item.choice.wrongExplanation)}</div>
      </div>
    `).join("");

  els.feedbackPanel.className = `feedback ${correct ? "correct" : "incorrect"}`;
  els.feedbackPanel.innerHTML = `
    <div class="feedback-title">${correct ? "✓ Correct!" : "✕ Incorrect"}</div>
    <p><strong>Correct Answer:</strong> ${letter(question.shuffledCorrectIndex)}. ${escapeHtml(correctChoice.text)}</p>
    <div class="explanation-block">${escapeHtml(question.explanation)}</div>
    <h3>Why the other answers are wrong</h3>
    <div class="wrong-list">${wrongItems}</div>
  `;
}

function goNextQuestion() {
  if (state.quiz.currentIndex < state.quiz.questions.length - 1) {
    state.quiz.currentIndex += 1;
    renderQuestion();
    return;
  }
  finishQuiz();
}

function finishQuiz() {
  const session = summarizeSession(state.quiz.answers);
  if (!state.reviewMode) {
    state.stats = recordSession(state.stats, { answers: state.quiz.answers });
  } else {
    state.stats = recordSession(state.stats, { answers: state.quiz.answers });
  }
  renderResults(session);
  renderHome();
  showView("results");
}

function renderResults(session) {
  const accuracy = session.total ? session.correct / session.total : 0;
  const topicRows = Object.entries(session.byTopic).sort(([a], [b]) => a.localeCompare(b));
  const topicScores = topicRows.map(([topic, data]) => ({ topic, ...data, accuracy: data.correct / data.total }));
  const strongest = topicScores.length ? [...topicScores].sort((a, b) => b.accuracy - a.accuracy)[0] : null;
  const weakest = topicScores.length ? [...topicScores].sort((a, b) => a.accuracy - b.accuracy)[0] : null;

  els.resultHero.innerHTML = [
    resultCard("Score", `${session.correct} / ${session.total}`),
    resultCard("Percentage", percent(accuracy)),
    resultCard("Result", `<span class="${accuracy >= PASSING_SCORE ? "pass" : "fail"}">${accuracy >= PASSING_SCORE ? "PASS" : "FAIL"}</span>`),
    resultCard("Incorrect", session.total - session.correct),
    resultCard("Strongest Topic", strongest ? strongest.topic : "No data"),
    resultCard("Weakest Topic", weakest ? weakest.topic : "No data"),
    resultCard("Total Correct", session.correct),
    resultCard("Total Incorrect", session.total - session.correct)
  ].join("");

  els.topicResults.innerHTML = topicRows.map(([topic, data]) => `
    <div class="topic-row">
      <strong>${escapeHtml(topic)}</strong>
      <span>${data.correct} / ${data.total}</span>
    </div>
  `).join("");

  els.reviewIncorrect.disabled = session.missed.length === 0;
}

function startCurrentIncorrectReview() {
  const missed = state.quiz.answers.filter((answer) => !answer.correct).map((answer) => answer.question);
  if (missed.length) startQuiz(createQuizQuestions(missed, missed.length), true);
}

function showView(view) {
  els.homeView.classList.toggle("active", view === "home");
  els.quizView.classList.toggle("active", view === "quiz");
  els.resultsView.classList.toggle("active", view === "results");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleTheme() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("cs4372Theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
}

function applySavedTheme() {
  const saved = localStorage.getItem("cs4372Theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", saved ? saved === "dark" : prefersDark);
}

function metric(label, value) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function stat(label, value) {
  return `<div class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function resultCard(label, value) {
  return `<div class="result-card"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
}

function letter(index) {
  return String.fromCharCode(65 + index);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
