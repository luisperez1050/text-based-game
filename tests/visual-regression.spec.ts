import { test, expect } from '@playwright/test';
import { veraSnapshot } from '@vera-ci/playwright-reporter';

test.describe('Visual Regression for Local Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click on "PLAY LOCAL" button
    await page.getByRole('button', { name: 'PLAY LOCAL' }).click();
    await expect(page.locator('main')).toContainText('ROUND 1/12');
    await veraSnapshot(page, 'local-game-start');
  });

  test('full local game flow', async ({ page }) => {
    // Round 1: Player 1 draws
    await page.getByRole('button', { name: 'DRAW POKÉMON' }).click();
    await expect(page.locator('main')).toContainText('Player 1 drew');

    // Round 1: Player 2 draws
    await page.getByRole('button', { name: 'DRAW POKÉMON' }).click();
    await expect(page.locator('main')).toContainText('Player 2 drew');

    // After round 1 result, click Next Round
    await page.getByRole('button', { name: 'Next Round >' }).click();
    await expect(page.locator('main')).toContainText('ROUND 2/12');
    await veraSnapshot(page, 'round-2-start');

    // Let's play a few more rounds programmatically
    for (let i = 2; i <= 3; i++) {
      // Player 1 draws
      await page.getByRole('button', { name: 'DRAW POKÉMON' }).click();
      await expect(page.locator('main')).toContainText('Player 1 drew');

      // Player 2 draws
      await page.getByRole('button', { name: 'DRAW POKÉMON' }).click();
      await expect(page.locator('main')).toContainText('Player 2 drew');

      // Click Next Round
      await page.getByRole('button', { name: 'Next Round >' }).click();
      await expect(page.locator('main')).toContainText(`ROUND ${i + 1}/12`);
      await veraSnapshot(page, `round-${i + 1}-start`);
    }

    // Simulate game end (fast forward to last round if possible, or just play through)
    // For simplicity, let's just go back to game mode and check the scoreboard
    await page.getByRole('button', { name: '< BACK TO GAME MODE' }).click();
    await expect(page.locator('main')).toContainText('Choose Your Game Mode');
    await veraSnapshot(page, 'back-to-game-mode-after-game');

  });

});
test.describe('Visual Regression for Online Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Click on "PLAY ONLINE" button
    await page.getByRole('button', { name: 'PLAY ONLINE' }).click();
    await expect(page.locator('main')).toContainText('ONLINE LOBBY');
    await veraSnapshot(page, 'online-lobby');
  });

  test('create online room', async ({ page }) => {
    await page.getByRole('button', { name: 'CREATE ROOM' }).click();
    // Expect to see the "WAITING FOR PLAYERS..." message
    await expect(page.locator('div.animate-pulse').filter({ hasText: 'WAITING FOR PLAYERS...' })).toBeVisible();
    await veraSnapshot(page, 'online-room-created');
  });
});

test.describe('Visual Regression for Scoreboard', () => {
  test('view scoreboard', async ({ page }) => {
    // Mock localStorage with sample data 
    const scoreboardData = {
      "Red": {
        "gamesWon": 2,
        "roundsWon": 32,
        "overkills": 8,
        "tieBreakWins": 0,
        "bonusPicks": 0
      },
      "Blue": {
        "gamesWon": 0,
        "roundsWon": 18,
        "overkills": 6,
        "tieBreakWins": 0,
        "bonusPicks": 0
      },
      "z": {
        "gamesWon": 0,
        "roundsWon": 20,
        "overkills": 4,
        "tieBreakWins": 0,
        "bonusPicks": 2
      },
      "y": {
        "gamesWon": 2,
        "roundsWon": 22,
        "overkills": 4,
        "tieBreakWins": 2,
        "bonusPicks": 2
      }
    };
    await page.addInitScript((data) => {
      window.localStorage.setItem('pokebattle_scoreboard', JSON.stringify(data));
    }, scoreboardData);

    await page.goto('/');
    // View scoreboard
    await page.getByRole('button', { name: 'VIEW SCOREBOARD' }).click();
    await expect(page.locator('main')).toContainText('SCOREBOARD');
    await veraSnapshot(page, 'scoreboard-view', {
      fullPage: true,
    });
  });
});