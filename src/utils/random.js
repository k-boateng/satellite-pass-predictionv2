export function sampleUnique(arr, n) {
  const pick = [];
  const used = new Set();
  const N = Math.min(n, arr.length);
  while (pick.length < N) {
    const i = (Math.random() * arr.length) | 0;
    if (!used.has(i)) {
      used.add(i);
      pick.push(arr[i]);
    }
  }
  return pick;
}