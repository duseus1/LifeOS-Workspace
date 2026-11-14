import { test, expect } from '@playwright/test';
test('captures real records, persists after reload, and reopens a daily journal',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Create a brain',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Homebase',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Quick capture',exact:true}).click();
 await page.getByLabel('Capture type').selectOption('task');await page.getByRole('textbox',{name:'Task',exact:true}).fill('Review LifeOS');await page.getByRole('button',{name:'Save capture'}).click();
 await expect(page.getByText('Review LifeOS',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByText('Review LifeOS',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Quick capture',exact:true}).click();await page.getByLabel('Capture type').selectOption('contact');await page.getByLabel('Phone').fill('555-0101');await page.getByRole('button',{name:'Save capture'}).click();
 await page.getByRole('button',{name:'Daily journal',exact:true}).click();await expect(page.getByRole('button',{name:'Edit note',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Go home',exact:true}).click();await page.getByRole('button',{name:'Daily journal',exact:true}).click();
 await page.getByRole('button',{name:'Go home',exact:true}).click();
 const count=await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('lifeos-preview')!).documents).filter(p=>p.startsWith('Journal/')).length);expect(count).toBe(1);
 await page.getByRole('checkbox',{name:'Complete Review LifeOS'}).click();await expect(page.getByText('Review LifeOS',{exact:true})).not.toBeVisible();
});
test('mobile homebase fits and capture has labeled controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Create a brain',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Quick capture',exact:true}).click();await page.getByRole('textbox',{name:'Thought',exact:true}).fill('Save this thought');await page.getByRole('button',{name:'Save capture'}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('mobile capture fields use a font size that does not trigger iOS focus zoom',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Create a brain',exact:true}).click();
 await page.getByRole('button',{name:'Quick capture',exact:true}).click();
 const sizes=await page.getByRole('dialog').locator('input, select, textarea').evaluateAll(elements=>elements.map(element=>({tag:element.tagName,size:parseFloat(getComputedStyle(element).fontSize)})));
 expect(sizes.length).toBeGreaterThan(0);
 expect(sizes.every(field=>field.size>=16),JSON.stringify(sizes)).toBe(true);
});
test('editor autosaves repeated edits and restores deleted notes',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Create a brain',exact:true}).click();
 await page.getByRole('button',{name:'Daily journal',exact:true}).click();await page.getByRole('button',{name:'Edit note',exact:true}).click();
 const editor=page.locator('.cm-content');await editor.fill('# My journal\n\nFirst save');
 await expect(page.locator('.save-status')).toHaveText('Saved');
 await editor.fill('# My journal\n\nSecond save stays');await expect(page.locator('.save-status')).toHaveText('Saved');
 await page.reload();await page.getByRole('button',{name:'Daily journal',exact:true}).click();await expect(page.getByText('Second save stays',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Note history',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('First save');await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByRole('button',{name:'Delete note',exact:true}).click();await page.getByRole('button',{name:'Move to trash',exact:true}).click();await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('button',{name:'Trash',exact:true}).click();await page.getByRole('button',{name:'Restore note',exact:true}).click();await page.getByRole('button',{name:'Close dialog'}).click();await page.getByRole('button',{name:'Close menu'}).click();await page.getByRole('button',{name:'Daily journal',exact:true}).click();await expect(page.getByText('Second save stays',{exact:true})).toBeVisible();
});
test('contact properties can be edited and found by search',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Create a brain',exact:true}).click();
 await page.getByRole('button',{name:'Quick capture',exact:true}).click();await page.getByLabel('Capture type').selectOption('contact');await page.getByRole('textbox',{name:'Phone',exact:true}).fill('555-0101');await page.getByRole('button',{name:'Save capture'}).click();
 await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('button',{name:'Contacts',exact:true}).click();await page.getByRole('button',{name:/555-0101/}).last().click();
 await expect(page.getByRole('heading',{name:'555-0101'})).toBeVisible();await expect(page.getByRole('button',{name:'Edit note'})).toBeVisible();await expect(page.getByText(/Contacts\/.*\.md/)).toHaveCount(0);
 await page.getByRole('button',{name:'Edit note'}).click();await page.getByRole('textbox',{name:'Name',exact:true}).fill('Morgan Lee');await page.getByRole('textbox',{name:'Notes',exact:true}).fill('Met at the library.');await page.getByRole('button',{name:'Save contact'}).click();await expect(page.getByRole('heading',{name:'Morgan Lee'})).toBeVisible();await expect(page.getByText('Met at the library.')).toBeVisible();
 await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('button',{name:'All files',exact:true}).click();await page.getByRole('button',{name:/Morgan Lee/}).last().click();await expect(page.getByRole('heading',{name:'Morgan Lee'})).toBeVisible();await expect(page.getByRole('textbox',{name:'Name',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('button',{name:'Search',exact:true}).click();await page.getByRole('textbox',{name:'Search brain'}).fill('Morgan Lee');await expect(page.getByRole('button',{name:/Morgan Lee/}).last()).toBeVisible();
});
test('dark mobile chrome covers both safe areas and stays opaque',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Create a brain',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByLabel('Appearance').selectOption('dark');await page.getByRole('button',{name:'Save settings'}).click();
 expect(await page.evaluate(()=>getComputedStyle(document.documentElement).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
 expect(await page.evaluate(()=>getComputedStyle(document.body,'::before').position)).toBe('fixed');
 expect(await page.evaluate(()=>getComputedStyle(document.body,'::after').position)).toBe('fixed');
});
