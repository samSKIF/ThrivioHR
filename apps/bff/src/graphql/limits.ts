import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-validation-complexity';

export function makeValidationRules() {
  const maxDepth = Number(process.env.GQL_MAX_DEPTH ?? 8);
  const maxComplexity = Number(process.env.GQL_MAX_COMPLEXITY ?? 1000);
  return [
    depthLimit(maxDepth),
    createComplexityLimitRule(maxComplexity, {
      onCost: (cost: number) => {
        if (process.env.NODE_ENV !== 'test') {
          // eslint-disable-next-line no-console
          console.log(`[GraphQL] cost=${cost}`);
        }
      },
    }),
  ];
}