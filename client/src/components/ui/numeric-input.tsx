import { useState, useEffect, ChangeEvent, FocusEvent } from 'react';
import { Input } from '@/components/ui/input';
import React from 'react';

interface NumericInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void;
}

export function NumericInput({ value, onChange, onFocus, ...props }: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(value.toString());

  useEffect(() => {
    // Update display value when the external value changes, but only if not focused
    if (document.activeElement !== document.getElementById(props.id || '')) {
      setDisplayValue(value.toString());
    }
  }, [value, props.id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Allow only numbers and a single decimal point
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setDisplayValue(value);
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    const parsedValue = parseFloat(displayValue);
    if (!isNaN(parsedValue)) {
      onChange(parsedValue);
    } else {
      onChange(0);
      setDisplayValue('0');
    }
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (displayValue === '0') {
      setDisplayValue('');
    }
    e.target.select();
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <Input
      type="text" // Use text to allow empty string
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      {...props}
    />
  );
}