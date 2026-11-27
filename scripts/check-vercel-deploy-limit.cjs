#!/usr/bin/env node

async function main() {
  const limit = Number.parseInt(process.env.VERCEL_DAILY_DEPLOY_LIMIT || '2', 10);
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token) {
  console.error('VERCEL_TOKEN is required to check the deployment limit.');
  process.exit(2);
  }
  if (!Number.isInteger(limit) || limit < 1) {
  console.error('VERCEL_DAILY_DEPLOY_LIMIT must be a positive integer.');
  process.exit(2);
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const params = new URLSearchParams({ limit: '100' });
  if (teamId) params.set('teamId', teamId);
  if (projectId) params.set('projectId', projectId);

  const response = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
  headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
  console.error(`Vercel deployments API returned HTTP ${response.status}.`);
  process.exit(2);
  }

  const body = await response.json();
  const deployments = Array.isArray(body.deployments) ? body.deployments : [];
  const today = deployments.filter((deployment) => {
  const created = new Date(deployment.createdAt || 0);
  return created >= startOfDay;
  });

  if (today.length >= limit) {
  console.error(`Daily Vercel deployment limit reached: ${today.length}/${limit} (UTC).`);
  process.exit(1);
  }

  console.log(`Vercel deployment quota available: ${today.length}/${limit} used today (UTC).`);
}

main().catch((error) => {
  console.error(`Unable to check Vercel deployment quota: ${error.message}`);
  process.exit(2);
});
