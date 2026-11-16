import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail, isValidPassword } from '../src/utils/validation.js';

test('normalizes valid email addresses', () => {
  assert.equal(normalizeEmail('  USER+tag@Example.COM '), 'user+tag@example.com');
});

test('rejects invalid or oversized email addresses', () => {
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail('x'.repeat(250) + '@example.com'), null);
  assert.equal(normalizeEmail(null), null);
});

test('accepts passwords in bcrypt supported byte range', () => {
  assert.equal(isValidPassword('password123'), true);
  assert.equal(isValidPassword('é'.repeat(36)), true);
});

test('rejects passwords shorter than eight characters or over 72 UTF-8 bytes', () => {
  assert.equal(isValidPassword('short'), false);
  assert.equal(isValidPassword('é'.repeat(37)), false);
  assert.equal(isValidPassword(undefined), false);
});
