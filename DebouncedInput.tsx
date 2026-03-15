import React, { useState, useEffect, useRef } from 'react';

interface DebouncedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
    onDebounceChange: (value: string) => void;
    delay?: number;
}

export const DebouncedTextarea: React.FC<DebouncedTextareaProps> = ({ value, onDebounceChange, delay = 500, ...props }) => {
    const [localValue, setLocalValue] = useState(value);
    const onDebounceChangeRef = useRef(onDebounceChange);
    const isTypingRef = useRef(false);

    useEffect(() => {
        onDebounceChangeRef.current = onDebounceChange;
    }, [onDebounceChange]);

    useEffect(() => {
        if (!isTypingRef.current) {
            setLocalValue(value);
        }
    }, [value]);

    useEffect(() => {
        if (!isTypingRef.current) return;

        const handler = setTimeout(() => {
            isTypingRef.current = false;
            if (localValue !== value) {
                onDebounceChangeRef.current(localValue);
            }
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [localValue, delay, value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        isTypingRef.current = true;
        setLocalValue(e.target.value);
        if (props.onChange) {
            props.onChange(e);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        if (isTypingRef.current) {
            isTypingRef.current = false;
            if (localValue !== value) {
                onDebounceChangeRef.current(localValue);
            }
        }
        if (props.onBlur) {
            props.onBlur(e);
        }
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
        // Scroll into view on mobile when keyboard appears
        if (window.innerWidth < 768) {
            setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300); // Wait for keyboard to fully open
        }
        if (props.onFocus) {
            props.onFocus(e);
        }
    };

    return (
        <textarea
            {...props}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
        />
    );
};
