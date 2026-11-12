import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PASSWORD_MAX_LEN,
  calcAgeFromDob,
  composeE164,
  passwordStrength,
  validateContactPair,
  validateDob,
  validateNamePart,
  validatePassword,
  suggestRegistrationUsername,
} from './registration.js';

test('calcAgeFromDob floors correctly and rejects future', () => {
  const now = new Date('2026-08-27T12:00:00Z');
  assert.equal(calcAgeFromDob('2000-08-27', now), 26);
  assert.equal(calcAgeFromDob('2000-08-28', now), 25);
  assert.equal(calcAgeFromDob('2099-01-01', now), null);
});

test('validateDob enforces configurable minimum age', () => {
  const now = new Date('2026-08-27T12:00:00Z');
  const young = validateDob('2018-01-01', 13, now);
  assert.equal(young.ok, false);
  const ok = validateDob('2008-01-01', 13, now);
  assert.equal(ok.ok, true);
  if (ok.ok === true) assert.equal(ok.age, 18);
});

test('validateNamePart rejects empty and junk', () => {
  assert.equal(validateNamePart('', 'First name').ok, false);
  assert.equal(validateNamePart('A'.repeat(100), 'First name').ok, false);
  assert.equal(validateNamePart('John', 'First name').ok, true);
});

test('validatePassword enforces length and common list', () => {
  assert.equal(validatePassword('123').ok, false);
  assert.equal(validatePassword('password').ok, false);
  assert.equal(validatePassword('a1'.repeat(PASSWORD_MAX_LEN)).ok, false);
  assert.equal(validatePassword('a1'.repeat(PASSWORD_MAX_LEN / 2)).ok, true);
  assert.equal(validatePassword('SafePass9').ok, true);
});

test('passwordStrength ranks reasonably', () => {
  assert.equal(passwordStrength('abcdef'), 'weak');
  assert.equal(passwordStrength('Abcdef12!'), 'strong');
});

test('contact requires phone or email and composes E.164', () => {
  const none = validateContactPair({});
  assert.equal(none.ok, false);
  const both = validateContactPair({ email: 'a@b.co', phoneNational: '1712345678', phoneCode: '+880' });
  assert.equal(both.ok, true);
  if (both.ok === true) {
    assert.equal(both.phoneE164, '+8801712345678');
    assert.equal(both.email, 'a@b.co');
  }
  assert.equal(composeE164('880', '01712345678'), '+88001712345678');
});

test('suggestRegistrationUsername builds a handle from name parts', () => {
  assert.equal(
    suggestRegistrationUsername({ firstName: 'Sazzad', lastName: 'Rahman' }),
    'sazzad_rahman',
  );
  assert.equal(
    suggestRegistrationUsername({ firstName: 'Mary', lastName: 'Jane', preferredName: 'MJ' }),
    'mary_jane',
  );
  assert.equal(suggestRegistrationUsername({ firstName: 'Li' }), 'li01');
});
