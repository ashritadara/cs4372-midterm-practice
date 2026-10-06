# CS 4372 Midterm Practice

A static multiple-choice study quiz for CS 4372 Machine Learning midterm review. It uses HTML, CSS, vanilla JavaScript, JSON, and `localStorage` only.

## Features

- Dashboard with question-bank size, session count, overall accuracy, weakest topic, and topic stats.
- Practice exams with 5, 10, 15, 20, 25, or custom question counts.
- Full-bank, topic-filtered, ID-range, weak-topic, and incorrect-question practice.
- One-question-at-a-time quiz flow with shuffled question order and shuffled answer choices.
- Immediate teaching feedback with the correct answer, formulas, and explanations for each wrong option.
- Results page with pass/fail at 70%, topic performance, strongest topic, and weakest topic.
- Missed-question tracking, mastered-question tracking, and resettable local statistics.
- Responsive light/dark design with saved dark-mode preference.

## Project Structure

```text
/
  index.html
  css/
    style.css
  js/
    app.js
    quiz.js
    stats.js
  data/
    questions.json
  README.md
```

## Run Locally

Use VS Code Live Server:

1. Open this folder in VS Code.
2. Install the Live Server extension if needed.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

Opening `index.html` directly from the file system may fail because the browser blocks `fetch("data/questions.json")` on `file://` pages. Live Server runs a small local web server, which allows the app to load the JSON question bank correctly.

## Question Schema

Questions live in `data/questions.json`; they are not hard-coded in JavaScript.

```json
{
  "id": 1,
  "topic": "Decision Trees",
  "difficulty": "medium",
  "question": "Question text",
  "choices": ["A choice", "B choice", "C choice", "D choice"],
  "answer": 2,
  "explanation": "Why the correct answer is correct.",
  "wrong_explanations": [
    "Why choice A is wrong.",
    "Why choice B is wrong.",
    null,
    "Why choice D is wrong."
  ]
}
```

`answer` is the zero-based index of the correct choice in the raw `choices` array. Put `null` in `wrong_explanations` at the correct-answer index and write a useful explanation for every incorrect option.

## Adding Questions

Add new objects to `data/questions.json` with unique numeric IDs. Supported topics are:

- Python / NumPy / Pandas
- Linear Regression
- Decision Trees
- Ensemble Methods
- Boosting
- Model Evaluation

The app validates the bank on load. Malformed questions are logged in the browser console with the question ID and skipped so one bad item does not crash the whole quiz.

## Scoring

Each submitted question is worth one point. The results page reports:

- total score
- percentage
- pass/fail using 70% as the passing score
- topic-by-topic performance
- strongest and weakest topic for the current practice

## localStorage Statistics

The app stores statistics in the browser under `cs4372PracticeStats`, including:

- practice sessions
- total answered and total correct
- topic accuracy
- per-question attempts and correct counts
- previously missed question IDs
- later mastered question IDs

Dark mode is stored separately under `cs4372Theme`.

Use **Reset Statistics** on the home page to clear saved practice data after confirming the dialog.

## GitHub Pages Deployment

This project is ready for GitHub Pages because it is static.

1. Push the folder contents to a GitHub repository.
2. In the repository, open **Settings** → **Pages**.
3. Choose the branch and root folder that contain `index.html`.
4. Save the Pages settings.

After GitHub builds the page, the app will load `data/questions.json` from the same repository path.
