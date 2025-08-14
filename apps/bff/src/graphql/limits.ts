import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const toInt = (v: string | undefined, fallback: number) =>
  Number.isFinite(Number(v)) ? Number(v) : fallback;

/**
 * Builds validation rules for GraphQL queries:
 * - Depth limit (default 8, env GQL_MAX_DEPTH)
 * - Complexity limit (default 1000, env GQL_MAX_COMPLEXITY)
 * Logs cost in non-test environments for visibility.
 */
export function makeValidationRules() {
  const maxDepth = toInt(process.env.GQL_MAX_DEPTH, 8);
  const maxComplexity = toInt(process.env.GQL_MAX_COMPLEXITY, 1000);
  const isTest = process.env.NODE_ENV === 'test';

  const complexityRule = createComplexityLimitRule({
    maximumComplexity: maxComplexity,
    onComplete: (complexity: number) => {
      if (!isTest) console.log(`[GraphQL] cost=${complexity}`);
    },
    // reasonable defaults; tweak if needed
    estimators: [
      // falls back to 1 per field if nothing else matches
    ],
  });

  return [depthLimit(maxDepth), complexityRule];
}