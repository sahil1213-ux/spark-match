const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeCoordinate(value: number, min: number, max: number, bits: number) {
  const encoded: number[] = [];
  let lower = min;
  let upper = max;

  for (let i = 0; i < bits; i += 1) {
    const mid = (lower + upper) / 2;
    if (value >= mid) {
      encoded.push(1);
      lower = mid;
    } else {
      encoded.push(0);
      upper = mid;
    }
  }

  return encoded;
}

export function geohashForLocation(
  [latitude, longitude]: [number, number],
  precision = 10,
): string {
  const totalBits = precision * 5;
  const lonBitsCount = Math.ceil(totalBits / 2);
  const latBitsCount = Math.floor(totalBits / 2);

  const lonBits = encodeCoordinate(longitude, -180, 180, lonBitsCount);
  const latBits = encodeCoordinate(latitude, -90, 90, latBitsCount);

  const mergedBits: number[] = [];

  for (let i = 0; i < lonBitsCount; i += 1) {
    mergedBits.push(lonBits[i]);
    if (i < latBitsCount) {
      mergedBits.push(latBits[i]);
    }
  }

  let geohash = '';
  for (let i = 0; i < totalBits; i += 5) {
    const chunk = mergedBits.slice(i, i + 5);
    const index = chunk.reduce((acc, bit) => (acc << 1) + bit, 0);
    geohash += BASE32[index];
  }

  return geohash;
}
