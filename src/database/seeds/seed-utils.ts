import { faker } from '@faker-js/faker/locale/vi';

export function random<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('Mảng rỗng');
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomFromArray<T>(arr: T[]): T {
  return random(arr);
}


export function randomDateBetween(from: Date, to: Date): Date {
  const start = from.getTime();
  const end = to.getTime();
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

export function randomPastDate(yearsBack = 5): Date {
  return faker.date.past({ years: yearsBack });
}


export function randomBoolean(probability = 0.5): boolean {
  return Math.random() < probability;
}