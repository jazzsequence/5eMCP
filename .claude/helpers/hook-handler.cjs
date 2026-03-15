#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

// PreToolUse hook — validates git commits have reviewer approval (Layer 1)
const args = process.argv.slice(2);

if (args[0] === 'pre-bash') {
  const stdin = fs.readFileSync(0, 'utf-8');
  let toolInput;
  try {
    toolInput = JSON.parse(stdin);
  } catch {
    console.log('[OK] Non-JSON input');
    process.exit(0);
  }

  const cmd = toolInput.command || '';

  if (cmd.includes('git commit')) {
    const userCommit = process.env.USER_COMMIT === '1';

    if (!userCommit) {
      const approvalFile = path.join(process.cwd(), '.git', 'hooks', 'reviewer-approved');

      if (!fs.existsSync(approvalFile)) {
        console.error('[BLOCKED] No reviewer approval found');
        console.error('');
        console.error('Required before git commit:');
        console.error('  1. Spawn reviewer agent with Agent tool');
        console.error('  2. Get APPROVE decision from agent');
        console.error('  3. Main agent creates approval flag');
        console.error('  4. Then commit within 5 minutes');
        console.error('');
        console.error('For manual commits: USER_COMMIT=1 git commit -m "message"');
        process.exit(1);
      }

      const approvalTime = parseInt(fs.readFileSync(approvalFile, 'utf8').trim(), 10);

      if (isNaN(approvalTime) || approvalTime <= 0) {
        console.error('[BLOCKED] Invalid approval file (corrupted timestamp)');
        process.exit(1);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const timeDiff = currentTime - approvalTime;

      if (timeDiff >= 300) {
        console.error(`[BLOCKED] Reviewer approval expired (${timeDiff}s old)`);
        console.error('');
        console.error('Approval is older than 5 minutes.');
        console.error('Spawn reviewer agent again and get fresh approval.');
        process.exit(1);
      }

      console.log(`[OK] Reviewer approved (${timeDiff}s ago)`);
    } else {
      console.log('[OK] User commit (bypassing reviewer)');
    }
  }

  console.log('[OK] Command validated');
  process.exit(0);
}

console.error('[ERROR] Unknown hook command');
process.exit(1);
