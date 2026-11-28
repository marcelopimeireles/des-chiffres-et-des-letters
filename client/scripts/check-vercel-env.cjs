/**
 * Vite injects public variables at build time. A Vercel deployment with
 * the localhost default would silently leave every game action unusable.
 */
if (process.env.VERCEL === '1') {
  const value = process.env.VITE_API_URL || '';
  if (!/^https:\/\/[^\s]+\/api\/game$/.test(value)) {
    console.error(
      'Vercel frontend requires VITE_API_URL=https://<your-api-domain>/api/game ' +
      'in Project Settings > Environment Variables (Production and Preview).'
    );
    process.exit(1);
  }
}
