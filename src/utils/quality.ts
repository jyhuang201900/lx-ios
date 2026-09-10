const qualityRank: Record<LX.Quality, number> = {
  flac24bit: 700,
  wav: 600,
  flac: 500,
  ape: 400,
  '320k': 300,
  '192k': 200,
  '128k': 100,
}

/** Present the best available stream first, independent of provider metadata order. */
export const sortQualities = (qualities: readonly LX.Quality[]): LX.Quality[] => {
  return [...new Set(qualities)].sort((a, b) => qualityRank[b] - qualityRank[a])
}
