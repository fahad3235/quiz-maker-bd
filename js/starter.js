// Quiz Maker BD \u2014 starter quiz (shipped data, not user data).
// 10 hand-checked, well-known facts about Bangladesh.
(function (root) {
  'use strict';

  var STARTER_QUIZ = {
    id: 'starter-bangladesh-gk',
    title: 'Bangladesh GK Starter',
    description: 'Ten well-known facts about Bangladesh \u2014 a warm-up quiz.',
    category: 'Bangladesh',
    timeLimit: 0,
    starter: true,
    questions: [
      {
        id: 'starter-q1',
        text: 'What is the capital of Bangladesh?',
        options: ['Dhaka', 'Chittagong', 'Khulna', 'Sylhet'],
        correct: 0,
        explanation: 'Dhaka is the capital and largest city of Bangladesh.'
      },
      {
        id: 'starter-q2',
        text: 'What is the national fish of Bangladesh?',
        options: ['Rohu', 'Hilsa (Ilish)', 'Catla', 'Pabda'],
        correct: 1,
        explanation: 'Hilsa, known locally as ilish, is the national fish of Bangladesh.'
      },
      {
        id: 'starter-q3',
        text: 'What is the national flower of Bangladesh?',
        options: ['Rose', 'Jasmine', 'Water lily (Shapla)', 'Marigold'],
        correct: 2,
        explanation: 'The water lily, called shapla in Bangla, is the national flower.'
      },
      {
        id: 'starter-q4',
        text: 'On which date is Independence Day of Bangladesh observed?',
        options: ['16 December 1971', '21 February 1952', '26 March 1971', '14 April 1971'],
        correct: 2,
        explanation: 'Independence Day is observed on 26 March, marking the declaration of independence in 1971.'
      },
      {
        id: 'starter-q5',
        text: 'On which date is Victory Day of Bangladesh observed?',
        options: ['26 March 1971', '16 December 1971', '21 February 1952', '1 July 1971'],
        correct: 1,
        explanation: 'Victory Day is observed on 16 December, the day of victory in the Liberation War in 1971.'
      },
      {
        id: 'starter-q6',
        text: 'Which is the longest natural sea beach in the world?',
        options: ["Cox's Bazar", 'Kuakata', 'Patenga', 'Saint Martin\'s Island'],
        correct: 0,
        explanation: "Cox's Bazar in Bangladesh is the world's longest natural sea beach."
      },
      {
        id: 'starter-q7',
        text: 'The Sundarbans is best known as what?',
        options: [
          'The largest mangrove forest in the world',
          'The highest mountain range in Asia',
          'The longest river in Bangladesh',
          'The largest desert in South Asia'
        ],
        correct: 0,
        explanation: 'The Sundarbans is the largest mangrove forest in the world.'
      },
      {
        id: 'starter-q8',
        text: 'Who wrote the national anthem of Bangladesh, "Amar Sonar Bangla"?',
        options: ['Kazi Nazrul Islam', 'Rabindranath Tagore', 'Jasimuddin', 'Sukanta Bhattacharya'],
        correct: 1,
        explanation: '"Amar Sonar Bangla" was written by Rabindranath Tagore.'
      },
      {
        id: 'starter-q9',
        text: 'What is the currency of Bangladesh?',
        options: ['Rupee', 'Taka', 'Dinar', 'Ringgit'],
        correct: 1,
        explanation: 'The Taka (BDT) is the currency of Bangladesh.'
      },
      {
        id: 'starter-q10',
        text: 'Which is the largest district of Bangladesh by area?',
        options: ['Dhaka', 'Chittagong', 'Rangamati', 'Khulna'],
        correct: 2,
        explanation: 'Rangamati, in the Chittagong Hill Tracts, is the largest district by area.'
      }
    ]
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { STARTER_QUIZ: STARTER_QUIZ };
  root.QuizMakerStarter = { STARTER_QUIZ: STARTER_QUIZ };
})(typeof window !== 'undefined' ? window : globalThis);
