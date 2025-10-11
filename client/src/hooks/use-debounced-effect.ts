import { useEffect, useRef } from 'react';

export const useDebouncedEffect = (
    effect: () => void,
    deps: any[],
    delay: number
) => {
    const callback = useRef(effect);

    useEffect(() => {
        callback.current = effect;
    }, [effect]);

    useEffect(() => {
        if (deps.every(dep => dep !== undefined)) {
            const handler = setTimeout(() => {
                callback.current();
            }, delay);

            return () => {
                clearTimeout(handler);
            };
        }
    }, [...deps, delay]);
};