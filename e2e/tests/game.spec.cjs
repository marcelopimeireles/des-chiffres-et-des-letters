const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('e2e-init')) { localStorage.setItem('ui-language','en'); sessionStorage.setItem('e2e-init','1'); } });
});
test('global language persists and is used by real match API', async ({page}) => {
  await page.goto('/');
  const select = page.getByRole('combobox');
  await expect(select.locator('option')).toHaveCount(3);
  await select.selectOption('pt');
  await page.reload();
  await expect(select).toHaveValue('pt');
  await page.goto('/match');
  const response = page.waitForResponse(r => r.url().endsWith('/api/game/matches') && r.request().method() === 'POST');
  await page.getByRole('button',{name:'Iniciar partida'}).click();
  const result = await response;
  expect(result.ok()).toBeTruthy();
  const match = await result.json();
  expect(match.language).toBe('pt');
  expect(match.totalRounds).toBe(9);
  await page.reload();
  await expect(page.getByRole('region',{name:'Pontuação da partida'})).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('des-chiffres-et-des-lettres:solo-match'))).toBe(match.matchId);
});
test('letter tiles compose, undo, reset and submit', async ({page}) => {
  await page.route('**/api/game/letters/draw', route => route.fulfill({json:{drawId:'e2e-letters',language:'en',letters:['C','A','T','E','R','S','O','N','L','I'],choices:Array(10).fill('vowel'),deadlineAt:Date.now()+60000,revealDurationMs:2300,playSeconds:30}}));
  await page.route('**/api/game/letters/validate', async route => {
    expect(route.request().postDataJSON().word.toLowerCase()).toBe('cat');
    await route.fulfill({json:{valid:true,reason:'accepted',language:'en',word:'cat',score:3,solutions:{bestLength:3,bestWords:['cat'],lexiconEntries:4888}}});
  });
  await page.goto('/letter-round');
  await page.getByRole('button',{name:'Automatic draw (5 V / 5 C)'}).click();
  await page.getByRole('button',{name:'Start draw'}).click();
  const panel=page.getByRole('region',{name:'Visual composition'});
  const rack=panel.getByRole('group',{name:'Available letters'});
  const answer=page.getByRole('textbox',{name:'Your word in English'});
  await expect(panel).toBeVisible();
  for (const id of [0,1,2]) {
    await rack.locator('[data-tile="'+id+'"]').click();
    await panel.getByRole('button',{name:'Add to word'}).click();
  }
  await expect(answer).toHaveValue(/cat/i);
  await panel.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(answer).toHaveValue(/ca/i);
  await rack.locator('[data-tile="2"]').click();
  await panel.getByRole('button',{name:'Add to word'}).click();
  await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect(page.getByText('cat',{exact:true})).toBeVisible();
});
test('real API rejects reusing number tiles and accepts a valid expression', async ({request}) => {
  const base='http://localhost:5000/api/game';
  const draw=await request.post(base+'/numbers/draw',{data:{largeCount:2}});
  expect(draw.ok()).toBeTruthy();
  const {drawId,numbers}=await draw.json();
  const n=numbers[0];
  const invalid=await request.post(base+'/numbers/validate',{data:{drawId,expression:Array(7).fill(n).join('+')}});
  expect((await invalid.json()).valid).toBe(false);
  const valid=await request.post(base+'/numbers/validate',{data:{drawId,expression:String(n)}}); 
  expect((await valid.json()).valid).toBe(true);
});
