import type { Computation } from './types/Computation';

export let currentComputation: Computation | null = null;

export const withComputation = (computation: Computation) => {
    currentComputation = computation;

    currentComputation.fn();

    currentComputation = null;
};
