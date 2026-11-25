/**
 * A promise the spec settles by hand, to order the answers of the API: an
 * answer resolved or rejected only after the admin has moved on.
 */
export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
