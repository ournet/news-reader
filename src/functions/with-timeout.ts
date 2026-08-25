/**
 * Rejects if `promise` has not settled within `ms`.
 *
 * Note the underlying work is not cancelled - it is left to finish or fail on
 * its own. The point is that the *pipeline* moves on, so one bad article cannot
 * consume the whole run's budget.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: NodeJS.Timeout;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms: ${label}`)),
      ms
    );
  });

  const clear = () => clearTimeout(timer);

  return Promise.race([promise, timeout]).then(
    (value) => {
      clear();
      return value;
    },
    (error) => {
      clear();
      throw error;
    }
  );
}
