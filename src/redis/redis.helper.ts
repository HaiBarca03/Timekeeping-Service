export const reconnectStrategy = (retries: number) => {
  if (retries > 50) {
    throw new Error('Redis limit retry connection');
  } else if (retries > 25) {
    return 30_000;
  }
  if (retries > 10) {
    return 15_000;
  }
  return 5_000;
};
