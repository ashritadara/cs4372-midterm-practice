export const TOPICS = [
  "Python / NumPy / Pandas",
  "Linear Regression",
  "Decision Trees",
  "Ensemble Methods",
  "Boosting",
  "Model Evaluation"
];

export function validateQuestionBank(rawQuestions) {
  if (!Array.isArray(rawQuestions)) {
    console.error("Question bank must be an array.");
    return [];
  }

  const seenIds = new Set();
  return rawQuestions.filter((question, index) => {
    const id = question?.id ?? `at index ${index}`;
    const errors = [];
    if (!Number.isInteger(question?.id)) errors.push("id must be an integer");
    if (seenIds.has(question?.id)) errors.push("id must be unique");
    if (!TOPICS.includes(question?.topic)) errors.push("topic is not recognized");
    if (!["easy", "medium", "hard"].includes(question?.difficulty)) errors.push("difficulty must be easy, medium, or hard");
    if (typeof question?.question !== "string" || !question.question.trim()) errors.push("question text is required");
    if (!Array.isArray(question?.choices) || question.choices.length !== 4) errors.push("exactly four choices are required");
    if (!Number.isInteger(question?.answer) || question.answer < 0 || question.answer > 3) errors.push("answer must be an index from 0 to 3");
    if (typeof question?.explanation !== "string" || !question.explanation.trim()) errors.push("explanation is required");
    if (!Array.isArray(question?.wrong_explanations) || question.wrong_explanations.length !== 4) {
      errors.push("wrong_explanations must contain four entries");
    } else {
      question.wrong_explanations.forEach((item, choiceIndex) => {
        if (choiceIndex !== question.answer && (typeof item !== "string" || !item.trim())) {
          errors.push(`wrong explanation missing for choice ${choiceIndex}`);
        }
      });
    }

    if (errors.length) {
      console.error(`Skipping malformed question ${id}: ${errors.join("; ")}`);
      return false;
    }

    seenIds.add(question.id);
    return true;
  });
}

export function buildPool(questions, settings, stats) {
  let pool = [...questions];

  if (settings.poolType === "range") {
    pool = pool.filter((question) => question.id >= settings.rangeFrom && question.id <= settings.rangeTo);
  }

  if (settings.selectedTopics.length) {
    pool = pool.filter((question) => settings.selectedTopics.includes(question.topic));
  }

  if (settings.mode === "weak") {
    const weakTopics = getWeakTopics(stats);
    pool = pool.filter((question) => weakTopics.includes(question.topic));
  }

  if (settings.mode === "incorrect") {
    const missedIds = new Set(stats.missedQuestionIds);
    pool = pool.filter((question) => missedIds.has(question.id));
  }

  return pool;
}

export function createQuizQuestions(pool, count) {
  return shuffle(pool)
    .slice(0, count)
    .map((question) => {
      const shuffledChoices = shuffle(
        question.choices.map((choice, originalIndex) => ({
          text: choice,
          originalIndex,
          isCorrect: originalIndex === question.answer,
          wrongExplanation: question.wrong_explanations[originalIndex]
        }))
      );

      return {
        ...question,
        shuffledChoices,
        shuffledCorrectIndex: shuffledChoices.findIndex((choice) => choice.isCorrect)
      };
    });
}

export function summarizeSession(answers) {
  const byTopic = {};
  answers.forEach((answer) => {
    if (!byTopic[answer.topic]) byTopic[answer.topic] = { correct: 0, total: 0 };
    byTopic[answer.topic].total += 1;
    if (answer.correct) byTopic[answer.topic].correct += 1;
  });
  return {
    correct: answers.filter((answer) => answer.correct).length,
    total: answers.length,
    byTopic,
    missed: answers.filter((answer) => !answer.correct)
  };
}

export function percent(value) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function getWeakTopics(stats) {
  const entries = Object.entries(stats.byTopic)
    .filter(([, data]) => data.answered > 0)
    .map(([topic, data]) => ({ topic, accuracy: data.correct / data.answered, answered: data.answered }))
    .sort((a, b) => a.accuracy - b.accuracy || b.answered - a.answered);
  return entries.slice(0, Math.max(1, Math.ceil(entries.length / 2))).map((entry) => entry.topic);
}

function shuffle(items) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
