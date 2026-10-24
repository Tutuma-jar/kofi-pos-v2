// .github/scripts/pr-rules.mjs — ejecutado por .github/workflows/pr-rules.yml
import { validateBranch, validatePrTitle, validatePrBody } from '../../scripts/git-rules.mjs';

const { PR_TITLE = '', PR_BODY = '', PR_HEAD = '', PR_BASE = '' } = process.env;
const errors = [
  ...(PR_BASE === 'develop' ? [] : [`La base del PR debe ser develop, no "${PR_BASE}".`]),
  ...validateBranch(PR_HEAD),
  ...validatePrTitle(PR_TITLE, PR_HEAD),
  ...validatePrBody(PR_BODY, PR_HEAD),
];
for (const e of errors) console.log(`::error::${e}`);
if (errors.length) process.exit(1);
console.log('✔ Título, descripción, rama y base del PR válidos.');
