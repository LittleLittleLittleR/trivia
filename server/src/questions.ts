/**
 * ======================= EDIT THIS FILE =======================
 * This is the ONLY file you need to touch to set up your game.
 *
 * - Add exactly 5 categories.
 * - Each category needs exactly 5 questions, for points 100/200/300/400/500.
 * - "answer" is just for the host's reference (the host judges verbal
 *   answers by ear/typing "correct/incorrect" - it is never sent to players).
 * ================================================================
 */

export interface QuestionData {
  text: string;
  answer: string;
}

export interface CategoryData {
  name: string;
  questions: {
    100: QuestionData;
    200: QuestionData;
    300: QuestionData;
    400: QuestionData;
    500: QuestionData;
  };
}

export const POINT_VALUES = [100, 200, 300, 400, 500] as const;

// TODO: Replace with your real categories & questions.
// Keep the shape identical - 5 categories, 5 point values each.
export const CATEGORIES: CategoryData[] = [
  {
    name: "CATEGORY 1",
    questions: {
      100: { text: "Sample 100pt question for Category 1?", answer: "Sample answer" },
      200: { text: "Sample 200pt question for Category 1?", answer: "Sample answer" },
      300: { text: "Sample 300pt question for Category 1?", answer: "Sample answer" },
      400: { text: "Sample 400pt question for Category 1?", answer: "Sample answer" },
      500: { text: "Sample 500pt question for Category 1?", answer: "Sample answer" },
    },
  },
  {
    name: "CATEGORY 2",
    questions: {
      100: { text: "Sample 100pt question for Category 2?", answer: "Sample answer" },
      200: { text: "Sample 200pt question for Category 2?", answer: "Sample answer" },
      300: { text: "Sample 300pt question for Category 2?", answer: "Sample answer" },
      400: { text: "Sample 400pt question for Category 2?", answer: "Sample answer" },
      500: { text: "Sample 500pt question for Category 2?", answer: "Sample answer" },
    },
  },
  {
    name: "CATEGORY 3",
    questions: {
      100: { text: "Sample 100pt question for Category 3?", answer: "Sample answer" },
      200: { text: "Sample 200pt question for Category 3?", answer: "Sample answer" },
      300: { text: "Sample 300pt question for Category 3?", answer: "Sample answer" },
      400: { text: "Sample 400pt question for Category 3?", answer: "Sample answer" },
      500: { text: "Sample 500pt question for Category 3?", answer: "Sample answer" },
    },
  },
  {
    name: "CATEGORY 4",
    questions: {
      100: { text: "Sample 100pt question for Category 4?", answer: "Sample answer" },
      200: { text: "Sample 200pt question for Category 4?", answer: "Sample answer" },
      300: { text: "Sample 300pt question for Category 4?", answer: "Sample answer" },
      400: { text: "Sample 400pt question for Category 4?", answer: "Sample answer" },
      500: { text: "Sample 500pt question for Category 4?", answer: "Sample answer" },
    },
  },
  {
    name: "CATEGORY 5",
    questions: {
      100: { text: "Sample 100pt question for Category 5?", answer: "Sample answer" },
      200: { text: "Sample 200pt question for Category 5?", answer: "Sample answer" },
      300: { text: "Sample 300pt question for Category 5?", answer: "Sample answer" },
      400: { text: "Sample 400pt question for Category 5?", answer: "Sample answer" },
      500: { text: "Sample 500pt question for Category 5?", answer: "Sample answer" },
    },
  },
];
