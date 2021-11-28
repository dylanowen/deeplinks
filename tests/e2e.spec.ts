import { port } from './config';
import { test, expect } from '@playwright/test';

const url = `http://localhost:${port}/tests/html/e2e.html`;

test('check server is running', async ({ page }) => {
  await page.goto(url);
  await expect(page).toHaveTitle('deeplinks e2e test');
});

async function testFragment(page: Page, fragment: string, testFn: (Page) => void) {
  await page.goto('about:blank');
  await page.goto(url + fragment);
  await page.waitForLoadState('domcontentloaded');
  await testFn(page);
}

test('misc', async ({ page }) => {
  const tests = {
    '#1JmqE9nH3Z:121:158': ['valueless until you get the screw out', 'short format, no dot'],
    '#1.JmqE9nH3Z:121:158': ['valueless until you get the screw out', 'short format, with dot'],
    '#1.JmqE9nH3Z:121.JmqE9nH3Z:158': ['valueless until you get the screw out', 'long format (but single node), with dot'],
    '#1JmqE9nH3Z:121.JmqE9nH3Z:158': ['valueless until you get the screw out', 'long format (but single node), no dot'],
    '#1J9W3o85TQ:12.3EdKovNLr:11': ['統一碼 💚💙💜🧡💛💚💙💜🧡💛💚💙💜🧡\n\n🐢🐢', 'selecting multiple different nodes, also unicode'],
    '#16SHlbtTkC:4.CBcmrfV8L:4': ['links.js e2e', 'selecting parent/child nodes'],
    '#1EdoNr3xj_:0.BLkIVltu0:14': ['uh oh\nidentical text', 'multiple identical nodes, but no disambiguation - start node is unique'],
    '#17whfBu1TH:0.TxIWFV5Nq:4': ['identical text nodes?\nhmmm', 'multiple identical nodes, but no disambiguation - end node is unique'],
    '#1EdoNr3xj_:0.7whfBu1TH:21~seeeee~0~2': ['uh oh\nidentical text nodes\nidentical text nodes?\nidentical text nodes\nidentical text nodes?', 'multiple identical nodes, with disambiguation - start node is unique'],
    '#1BLkIVltu0:0.TxIWFV5Nq:4~ssssse~3~5': ['identical text nodes\nidentical text nodes?\nidentical text nodes\nidentical text nodes?\nhmmm', 'multiple identical nodes, with disambiguation - end node is unique'],
    '#1BLkIVltu0:0.7whfBu1TH:21~sesesesese~2~7': ['identical text nodes\nidentical text nodes?\nidentical text nodes\nidentical text nodes?\nidentical text nodes\nidentical text nodes?', 'multiple identical nodes, with disambiguation, both start and end nodes are ambiguous'],
    '#1BLkIVltu0:0:20~sssss~0~1': ['identical text nodes\nidentical text nodes?\nidentical text nodes', 'short fragment with ambiguous nodes, start and end node are different'],
    '#1BLkIVltu0:0:20~sssss~1': ['identical text nodes', 'short fragment with ambiguous nodes, start and end node are the same'],
    '#1.W00000001:0.W00000001:5': ['', 'nonexistent node'],
    '#1.W00000001:0.W00000002:5': ['', 'nonexistent nodes'],
    '#1W00000001:0:5': ['', 'nonexistent node (short version)'],
    '#1.W00000001:0.W00000002:5~sse~1~2': ['', 'nonexistent nodes, with disambiguation'],
  };
  page.on('dialog', async () => {
    throw 'Unexpected dialog box';
  });
  for (const fragment of Object.keys(tests)) {
    const [expected, message] = tests[fragment];
    console.log(`testing ${message}`);
    const testFn = async (page) => {
      const selected = await page.evaluate('document.getSelection().toString()');
      expect(selected).toBe(expected);
    };
    await testFragment(page, fragment, testFn);
  }
});

test('multiselect', async ({ page }, testInfo) => {
  const multiselectKnownGoodBrowsers = ['firefox'];
  const tests = {
    '#193nojgL33:21.3fpc_LoVz:0,3fpc_LoVz:5.VVGZj9Vjq:0': ['bold', 'italic'],
    '#1.J9W3o85TQ:7:15,J9W3o85TQ:16:18,J9W3o85TQ:26.J9W3o85TQ:28,J9W3o85TQ:36:38,3EdKovNLr:0:18,VIMmaQoVW:229.JmqE9nH3Z:10': ['我是少量的統一碼', '💚', '💚', '💚', ' 🐢🐢🐢\n\n', 'unimportant.\n\nRight'],
  };
  page.on('dialog', async (dialog) => {
    if (multiselectKnownGoodBrowsers.includes(testInfo.project.name) || dialog._initializer.message !== 'You opened a link that highlighted multiple selections of text, but your browser does not support this — only the first selection is being shown.') {
      throw 'Unexpected dialog box';
    } else {
      await dialog.dismiss();
    }
  });
  for (const fragment of Object.keys(tests)) {
    const expected = tests[fragment];
    console.log(`testing ${fragment}`);
    const testFn = async (page) => {
      const selected = await page.evaluate('document.getSelection().toString()');
      if (multiselectKnownGoodBrowsers.includes(testInfo.project.name)) {
        expect(selected).toBe(expected.join(''));
      } else {
        expect([expected.join(''), expected[0]]).toContain(selected);
      }
      // Even if multiselect wasn't supported, don't rewrite URL
      expect(page.url()).toBe(url + fragment);
    };
    await testFragment(page, fragment, testFn);
  }
});
