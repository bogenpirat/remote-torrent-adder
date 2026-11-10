import { useState } from 'react';
import { errorMessage } from './utils';

export interface EditableOptions {
  value: string;
  setValue: (value: string) => void;
  options: string[];
  remove: (option: string) => void;
}

export function useEditableOptions(initialValue: string, initialOptions: string[]): EditableOptions {
  const [value, setValue] = useState(initialValue);
  const [options, setOptions] = useState(initialOptions);
  const remove = (option: string) => {
    setOptions(previous => previous.filter(entry => entry !== option));
    if (value === option) setValue('');
  };
  return { value, setValue, options, remove };
}

export function useSubmission(failureDescription: string, action: () => Promise<void>) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await action();
      window.close();
    } catch (error: unknown) {
      console.error(failureDescription, error);
      setSubmitError(errorMessage(error));
      setSubmitting(false);
    }
  };
  return { submitting, submitError, submit };
}
