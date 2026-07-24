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
  answer: string | string[];
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
    name: "Miracles and Wonders",
    questions: {
      100: { text: "During the wedding feast at Cana, what drink was miraculously produced inside six stone water jars?", answer: "Wine" },
      200: { text: "What animal spoke to the prophet Balaam after he struck it?", answer: "Donkey" },
      300: { text: "Which river stopped flowing so that the Israelites could cross into Canaan on dry ground?", answer: "Jordan" },
      400: { text: "Over Gibeon, what halted its movement in the sky during Israel's fight against the five Amorite kings", answer: "Sun" },
      500: { text: "What was the eighth plague in Egypt?", answer: "Locusts" },
    },
  },
  {
    name: "Where in the World?",
    questions: {
      100: { text: "In which town was Jesus born?", answer: "Bethlehem" },
      200: { text: "Which ancient, corrupt city was destroyed by fire and brimstone alongside Gomorrah?", answer: "Sodom" },
      300: { text: "What city was Jonah commanded by God to preach to?", answer: "Nineveh" },
      400: { text: "Which town was Saul travelling to when he was blinded and converted to Christianity?", answer: "Damascus" },
      500: { text: "Where was John the Apostle exiled when he wrote the Book of Revelation?", answer: "Patmos" },
    },
  },
  {
    name: "Count your blessings",
    questions: {
      100: { text: "How many silver coins did Judas Iscariot receive to betray Jesus?", answer: "30" },
      200: { text: "How many books are there in the Bible?", answer: "66" },
      300: { text: "How many pairs of clean animals were brought onto Noah's ark?", answer: "7" },
      400: { text: "How many people were saved on Noah's Ark?", answer: "8" },
      500: { text: "In Luke 10, how many additional people did Jesus appoint to go ahead of him?", answer: ["70", "72"] },
    },
  },
  {
    name: "爸爸线",
    questions: {
      100: { text: "In Genesis, Isaac was the son of Abraham. Who was Lot to Abraham?", answer: "Nephew" },
      200: { text: "The Gospel of Matthew divides the genealogy of Jesus into three distinct groups of fourteen generations each. True or False?", answer: "True" },
      300: { text: "What is the name of Samuel's mother?", answer: "Hannah" },
      400: { text: "Who married Ruth and became the father of Obed, who was the grandfather of King David?", answer: "Boaz" },
      500: { text: "In Genesis 49, Jacob blessed his 12 sons. Who was he referring to when he said \"their swords are weapons of violence. Let me not enter their council, let me not join their assembly, for they have killed men in their anger and hamstrung oxen as they pleased.\"? \n(hint: 2 possible answers)", answer: ["Simeon", "Levi"] },
    },
  },
  {
    name: "Who said it?",
    questions: {
      100: { text: "\"I will not leave you as orphans; I will come to you.\" Who said it?", answer: "Jesus" },
      200: { text: "\"The Lord is my rock and my fortress and my deliverer.\" Who said it?", answer: "David" },
      300: { text: "\"Am I a dog, that you come at me with sticks?\" Who said it?", answer: "Goliath" },
      400: { text: "Who was Jesus talking to when he said John 3:16?", answer: "A Pharisee" },
      500: { text: "\"Don't urge me to leave you or to turn back from you. Where you go I will go, and where you stay I will stay. Your people will be my people and your God my God.\" \nWho said it?", answer: "Ruth" },
    },
  },
];
