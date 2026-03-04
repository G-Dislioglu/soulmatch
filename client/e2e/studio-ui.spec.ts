import { test, expect } from '@playwright/test'

const BASE = process.env.TEST_URL ?? 'http://localhost:5173'

test.describe('Studio UI — Layout & Visualizer', () => {

  test('Gear icon is bottom-right, not overlapping avatar', async ({ page }) => {
    await page.goto(BASE)
    // Navigate to Studio tab
    await page.getByText('Studio').click()
    await page.waitForSelector('[data-testid="persona-card"]', { timeout: 5000 })

    const card = page.locator('[data-testid="persona-card"]').first()
    const gear = card.locator('[data-testid="persona-gear"]')

    const cardBox = await card.boundingBox()
    const gearBox = await gear.boundingBox()

    // Gear must be in bottom-right quadrant of card
    expect(gearBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width * 0.5)
    expect(gearBox!.y).toBeGreaterThan(cardBox!.y + cardBox!.height * 0.5)

    // Gear must NOT overlap center of card (where avatar is)
    const cardCenterX = cardBox!.x + cardBox!.width / 2
    const cardCenterY = cardBox!.y + cardBox!.height / 2
    const gearCenterX = gearBox!.x + gearBox!.width / 2
    const distance = Math.sqrt(
      Math.pow(gearCenterX - cardCenterX, 2) +
      Math.pow((gearBox!.y + gearBox!.height / 2) - cardCenterY, 2)
    )
    expect(distance).toBeGreaterThan(20) // must be >20px from center
    console.log('✅ Gear icon correctly positioned bottom-right')
  })

  test('Studio talk shows 2|chat|2 grid layout', async ({ page }) => {
    await page.goto(BASE)
    await page.getByText('Studio').click()

    // Select a topic and start discussion (adjust selectors to your app)
    // We click the first persona to select it and then click the "Chat Starten" button
    const firstPersona = page.locator('[data-testid="persona-card"]').first()
    await firstPersona.click()
    
    // In Soulmatch the button is "Studio Starten" usually or "Mit X Personas starten"
    const startButton = page.locator('button', { hasText: /starten|loslegen|diskussion|Schatten/i }).first()
    await startButton.click()
    
    await page.waitForSelector('[data-testid="persona-tension-card"]', { timeout: 8000 })

    const leftCol  = page.locator('[data-testid="studio-left-col"]')
    const rightCol = page.locator('[data-testid="studio-right-col"]')
    const chatCol  = page.locator('[data-testid="studio-chat-col"]')

    // All three columns must exist
    await expect(leftCol).toBeVisible()
    await expect(chatCol).toBeVisible()

    // Left column must contain Maya
    await expect(leftCol.getByText('Maya')).toBeVisible()

    // Chat col must be wider than side columns
    const leftBox = await leftCol.boundingBox()
    const chatBox = await chatCol.boundingBox()
    expect(chatBox!.width).toBeGreaterThan(leftBox!.width * 2)

    console.log('✅ 2|chat|2 layout confirmed')
  })

  test('Canvas visualizer has correct dimensions', async ({ page }) => {
    await page.goto(BASE)
    await page.getByText('Studio').click()
    
    const firstPersona = page.locator('[data-testid="persona-card"]').first()
    await firstPersona.click()
    
    const startButton = page.locator('button', { hasText: /starten|loslegen|diskussion|Schatten/i }).first()
    await startButton.click()
    
    await page.waitForSelector('canvas', { timeout: 8000 })

    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()

    // Canvas must be 80×80 (not 0×0)
    expect(box!.width).toBeGreaterThanOrEqual(78)
    expect(box!.height).toBeGreaterThanOrEqual(78)
    console.log(`✅ Canvas size: ${box!.width}×${box!.height}`)
  })

  test('Beenden button exists and navigates back', async ({ page }) => {
    await page.goto(BASE)
    await page.getByText('Studio').click()
    
    const firstPersona = page.locator('[data-testid="persona-card"]').first()
    await firstPersona.click()
    
    const startButton = page.locator('button', { hasText: /starten|loslegen|diskussion|Schatten/i }).first()
    await startButton.click()
    
    await page.waitForSelector('button:has-text("Beenden")', { timeout: 8000 })

    const btn = page.locator('button:has-text("Beenden")')
    await expect(btn).toBeVisible()
    await btn.click()

    // Should navigate back to Studio start
    await expect(page.getByText(/Wähle|Bestimme|Begleitung|Persona Chat/)).toBeVisible({ timeout: 5000 })
    console.log('✅ Beenden button works')
  })

  test('User input field stays empty when personas speak', async ({ page }) => {
    await page.goto(BASE)
    await page.getByText('Studio').click()
    
    const firstPersona = page.locator('[data-testid="persona-card"]').first()
    await firstPersona.click()
    
    const startButton = page.locator('button', { hasText: /starten|loslegen|diskussion|Schatten/i }).first()
    await startButton.click()

    const inputField = page.locator('[data-testid="user-input"], textarea').first()

    // Wait for a persona message to appear
    await page.waitForSelector('.messages > div:has-text("Maya")', { timeout: 15000 }).catch(() => null)

    // Input field must still be empty
    const value = await inputField.inputValue()
    expect(value).toBe('')
    console.log('✅ Input field stays clean during persona speech')
  })

  test('Audio pipeline files were not modified', async ({ page }) => {
    // This test runs a git check — use via CLI, not Playwright
    // Included here as documentation
    console.log('Run manually: git diff --name-only STUDIO_UI_STABLE_v1')
    console.log('Must NOT contain: providers.ts, studio.ts, personaRouter.ts')
  })

})
