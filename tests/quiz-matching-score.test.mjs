import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Quiz depends on browser modules and a remote pronunciation source. Run its
// real event handler with those import declarations removed, without network.
const source = readFileSync(new URL('../js/quiz.js', import.meta.url), 'utf8')
  .replace(/^import .*;\s*$/gm, '')
  .replace('export class Quiz', 'class Quiz');
const context = { db: {}, toDev: () => '', toPronunciation: () => '', setTimeout, console };
runInNewContext(`${source}\nthis.Quiz = Quiz;`, context);

function clickNext(quiz, round) {
  let action;
  const container = {
    querySelectorAll: () => [],
    querySelector: selector => selector === '#q-next' ? {
      addEventListener: (_event, callback) => { action = callback; }
    } : null
  };
  quiz.render = () => {};
  quiz.bindMatchEvents(container, round);
  action();
}

test('matching quiz keeps score across multiple rounds and subtracts mistakes', () => {
  const quiz = new context.Quiz({}, [], () => {});
  const rounds = [{ pairs: Array(6).fill({}) }, { pairs: Array(4).fill({}) }];
  quiz.mode = 'matching';
  quiz.phase = 'active';
  quiz.questions = rounds;

  // Six completed pairs, two incorrect attempts in round one.
  quiz.score = 6;
  quiz.matchState = { errors: 2 };
  clickNext(quiz, rounds[0]);
  assert.equal(quiz.score, 4);
  assert.equal(quiz.currentIdx, 1);
  assert.equal(quiz.phase, 'active');

  // Four further completed pairs, one incorrect attempt in round two.
  quiz.score += 4;
  quiz.matchState = { errors: 1 };
  clickNext(quiz, rounds[1]);
  assert.equal(quiz.score, 7, 'final score must not reset to the last four pairs');
  assert.equal(quiz.currentIdx, 2);
  assert.equal(quiz.phase, 'results');
});

test('matching quiz never reports negative points after repeated mistakes', () => {
  const quiz = new context.Quiz({}, [], () => {});
  const round = { pairs: Array(4).fill({}) };
  quiz.mode = 'matching';
  quiz.questions = [round];
  quiz.score = 4;
  quiz.matchState = { errors: 7 };
  clickNext(quiz, round);
  assert.equal(quiz.score, 0);
  assert.equal(quiz.phase, 'results');
});
