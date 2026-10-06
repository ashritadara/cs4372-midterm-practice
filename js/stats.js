const STORAGE_KEY = "cs4372PracticeStats";
const DEFAULT_STATS = {
  sessions: 0,
  totalAnswered: 0,
  totalCorrect: 0,
  byTopic: {},
  byQuestion: {},
  missedQuestionIds: [],
  masteredQuestionIds: []
};

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATS);
    return normalizeStats(JSON.parse(raw));
  } catch (error) {
    console.error("Could not load saved statistics.", error);
    return structuredClone(DEFAULT_STATS);
  }
}

export function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeStats(stats)));
}

export function resetStats() {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEFAULT_STATS);
}

export function recordSession(stats, session) {
  const next = normalizeStats(stats);
  next.sessions += 1;
  session.answers.forEach((answer) => {
    next.totalAnswered += 1;
    if (answer.correct) next.totalCorrect += 1;

    if (!next.byTopic[answer.topic]) {
      next.byTopic[answer.topic] = { answered: 0, correct: 0 };
    }
    next.byTopic[answer.topic].answered += 1;
    if (answer.correct) next.byTopic[answer.topic].correct += 1;

    const id = String(answer.questionId);
    if (!next.byQuestion[id]) {
      next.byQuestion[id] = { attempted: 0, correct: 0 };
    }
    next.byQuestion[id].attempted += 1;
    if (answer.correct) next.byQuestion[id].correct += 1;

    const missed = new Set(next.missedQuestionIds);
    const mastered = new Set(next.masteredQuestionIds);
    if (answer.correct) {
      if (missed.has(answer.questionId)) {
        mastered.add(answer.questionId);
        missed.delete(answer.questionId);
      }
    } else {
      missed.add(answer.questionId);
      mastered.delete(answer.questionId);
    }
    next.missedQuestionIds = [...missed].sort((a, b) => a - b);
    next.masteredQuestionIds = [...mastered].sort((a, b) => a - b);
  });
  saveStats(next);
  return next;
}

export function getOverallAccuracy(stats) {
  return stats.totalAnswered ? stats.totalCorrect / stats.totalAnswered : null;
}

export function getTopicSummaries(stats) {
  return Object.entries(stats.byTopic).map(([topic, data]) => ({
    topic,
    answered: data.answered,
    correct: data.correct,
    accuracy: data.answered ? data.correct / data.answered : 0
  }));
}

export function getWeakestTopic(stats) {
  const summaries = getTopicSummaries(stats).filter((item) => item.answered > 0);
  if (!summaries.length) return null;
  return summaries.sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered)[0];
}

export function getStrongestTopic(stats) {
  const summaries = getTopicSummaries(stats).filter((item) => item.answered > 0);
  if (!summaries.length) return null;
  return summaries.sort((a, b) => b.accuracy - a.accuracy || b.answered - a.answered)[0];
}

function normalizeStats(stats) {
  return {
    sessions: Number(stats.sessions) || 0,
    totalAnswered: Number(stats.totalAnswered) || 0,
    totalCorrect: Number(stats.totalCorrect) || 0,
    byTopic: stats.byTopic && typeof stats.byTopic === "object" ? stats.byTopic : {},
    byQuestion: stats.byQuestion && typeof stats.byQuestion === "object" ? stats.byQuestion : {},
    missedQuestionIds: Array.isArray(stats.missedQuestionIds) ? stats.missedQuestionIds.map(Number) : [],
    masteredQuestionIds: Array.isArray(stats.masteredQuestionIds) ? stats.masteredQuestionIds.map(Number) : []
  };
}
