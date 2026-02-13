const MASTER_NUMBERS = new Set([11, 22, 33]);

const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
};

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function sumDigits(n: number): number {
  let s = 0;
  const abs = Math.abs(Math.floor(n));
  const str = String(abs);
  for (let i = 0; i < str.length; i++) {
    s += Number(str[i]);
  }
  return s;
}

export function reduceToNumber(n: number): number {
  let current = n;
  while (current > 9 && !MASTER_NUMBERS.has(current)) {
    current = sumDigits(current);
  }
  return current;
}

function normalizeLetters(name: string): string {
  return name.toUpperCase().replace(/[^A-Z]/g, '');
}

function letterValues(letters: string): number[] {
  return Array.from(letters).map((ch) => PYTHAGOREAN_MAP[ch] ?? 0);
}

export function calcLifePath(birthDate: string): { value: number; trace: string } {
  const parts = birthDate.split('-');
  const yyyy = parts[0] ?? '0';
  const mm = parts[1] ?? '0';
  const dd = parts[2] ?? '0';

  const ySum = sumDigits(Number(yyyy));
  const mSum = sumDigits(Number(mm));
  const dSum = sumDigits(Number(dd));
  const total = ySum + mSum + dSum;
  const value = reduceToNumber(total);

  const trace = `${yyyy}(${Array.from(yyyy).join('+')})=${ySum}, ${mm}(${Array.from(mm).join('+')})=${mSum}, ${dd}(${Array.from(dd).join('+')})=${dSum} -> ${ySum}+${mSum}+${dSum}=${total} -> ${value}`;
  return { value, trace: trace.slice(0, 120) };
}

export function calcBirthday(birthDate: string): number {
  const dd = birthDate.split('-')[2] ?? '0';
  return Number(dd);
}

export function calcExpression(name: string): { value: number; trace: string } {
  const letters = normalizeLetters(name);
  const values = letterValues(letters);
  const total = values.reduce((a, b) => a + b, 0);
  const value = reduceToNumber(total);
  const trace = `Expression(${letters}): sum=${total} -> ${value}`;
  return { value, trace: trace.slice(0, 120) };
}

export function calcSoulUrge(name: string): { value: number; trace: string } {
  const letters = normalizeLetters(name);
  const vowelLetters = Array.from(letters).filter((ch) => VOWELS.has(ch));
  const values = letterValues(vowelLetters.join(''));
  const total = values.reduce((a, b) => a + b, 0);
  const value = reduceToNumber(total);
  const trace = `SoulUrge(${vowelLetters.join('')}): sum=${total} -> ${value}`;
  return { value, trace: trace.slice(0, 120) };
}

export function calcPersonality(name: string): { value: number; trace: string } {
  const letters = normalizeLetters(name);
  const consonants = Array.from(letters).filter((ch) => !VOWELS.has(ch));
  const values = letterValues(consonants.join(''));
  const total = values.reduce((a, b) => a + b, 0);
  const value = reduceToNumber(total);
  const trace = `Personality(${consonants.join('')}): sum=${total} -> ${value}`;
  return { value, trace: trace.slice(0, 120) };
}
