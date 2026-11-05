import { ComboBox } from '../components/ui/combobox';
import { type EditableOptions } from '../lib/form-hooks';

interface FormFrameProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function FormFrame({ title, subtitle, children }: FormFrameProps) {
  return (
    <div className="h-full bg-background p-6">
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>

        <div className="space-y-3 bg-card p-4 rounded-lg border border-border shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SubmitError({ message }: { message: string | null }) {
  if (!message) return <></>;
  return <p role="alert" className="text-xs text-destructive">{message}</p>;
}

interface EditableComboBoxProps {
  label: string;
  field: EditableOptions;
  placeholder: string;
  className?: string;
  rainbowOutline?: boolean;
}

export function EditableComboBox({ label, field, placeholder, className, rainbowOutline }: EditableComboBoxProps) {
  return (
    <ComboBox
      className={className}
      label={label}
      value={field.value}
      onChange={field.setValue}
      onRemoveOption={field.remove}
      options={field.options}
      rainbowOutline={rainbowOutline}
      placeholder={placeholder}
    />
  );
}
