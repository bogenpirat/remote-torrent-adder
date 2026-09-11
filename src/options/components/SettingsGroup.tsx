import React, { useId } from "react";

interface SettingsGroupProps {
  title: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, actions, children }) => {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      style={{ marginBottom: 20, border: "1px solid var(--rta-border, #b7c9a7)", borderRadius: 10, padding: 16, background: "var(--rta-surface-alt, #f7faf7)" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span id={titleId} style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
        {actions}
      </div>
      {children}
    </section>
  );
};

export default SettingsGroup;
