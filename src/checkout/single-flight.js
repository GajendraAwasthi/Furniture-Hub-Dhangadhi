export function singleFlight(callback) {
  let inFlight = false;
  return async (...args) => {
    if (inFlight) return;
    inFlight = true;
    try {
      return await callback(...args);
    } finally {
      inFlight = false;
    }
  };
}
