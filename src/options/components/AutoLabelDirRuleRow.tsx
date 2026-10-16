import React from "react";
import type { AutoLabelDirSetting } from "../../models/webui";
import { type AutoLabelDirCriterionEvaluation, type AutoLabelDirRuleEvaluation } from "../../util/auto-label-dir-matcher";
import { fieldLabel } from "./auto-label-dir-fields";
import { MONOSPACE_STYLE } from "./auto-label-dir-tester-styles";
import { MUTED, BORDER, SURFACE, SUCCESS, DANGER } from "../theme";

const CRITERION_ROW_STYLE: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "baseline",
  flexWrap: "wrap",
  fontSize: 14,
  marginTop: 4,
};

const RULE_ROW_STYLE: React.CSSProperties = {
  padding: "8px 10px",
  marginTop: 8,
  borderRadius: 8,
  background: SURFACE,
};

interface RuleRowProps {
  rule: AutoLabelDirRuleEvaluation;
  winningRuleIndex: number | null;
  showLabel: boolean;
  showDir: boolean;
}

export default function RuleRow(props: RuleRowProps) {
  const { rule } = props;
  const borderColor = rule.index === props.winningRuleIndex ? SUCCESS : BORDER;
  return (
    <div style={{ ...RULE_ROW_STYLE, border: `1px solid ${borderColor}` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>Rule {rule.index + 1}</span>
        <RuleVerdict {...props} />
      </div>
      {rule.criteria.length === 0
        ? <div style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>No criteria — a rule without criteria never matches.</div>
        : rule.criteria.map((evaluation, idx) => <CriterionRow key={idx} evaluation={evaluation} />)}
    </div>
  );
}

function RuleVerdict({ rule, winningRuleIndex, showLabel, showDir }: RuleRowProps) {
  const isWinner = rule.index === winningRuleIndex;
  const isShadowed = rule.matched && !isWinner;
  return (
    <>
      {isWinner && (
        <span style={{ color: SUCCESS, fontWeight: 500 }}>✅ applied → {describeOutcome(rule.setting, { showLabel, showDir })}</span>
      )}
      {isShadowed && (
        <span style={{ color: MUTED }}>
          ✅ matches, but rule {(winningRuleIndex ?? 0) + 1} wins
        </span>
      )}
      {!rule.matched && <span style={{ color: MUTED }}>❌ does not match</span>}
    </>
  );
}

type ShownOutcomes = Pick<RuleRowProps, "showLabel" | "showDir">;

function describeOutcome(setting: AutoLabelDirSetting, shown: ShownOutcomes): string {
  const outcomeParts: string[] = [];
  if (shown.showLabel) outcomeParts.push(`label ${setting.label ? `"${setting.label}"` : "(none)"}`);
  if (shown.showDir) outcomeParts.push(`dir ${setting.dir ? `"${setting.dir}"` : "(none)"}`);
  return outcomeParts.join(", ");
}

function CriterionRow({ evaluation }: { evaluation: AutoLabelDirCriterionEvaluation }) {
  const { criterion } = evaluation;
  return (
    <div style={CRITERION_ROW_STYLE}>
      <span style={{ color: MUTED, minWidth: 96 }}>{fieldLabel(criterion.field)}</span>
      <span style={MONOSPACE_STYLE}>{criterion.value || "(empty)"}</span>
      <CriterionVerdict evaluation={evaluation} />
    </div>
  );
}

function CriterionVerdict({ evaluation }: { evaluation: AutoLabelDirCriterionEvaluation }) {
  const { criterion, matched, matchedCandidates, invalidPattern } = evaluation;
  if (invalidPattern) return <span style={{ color: DANGER }}>❌ invalid regular expression</span>;
  if (!criterion.value) return <span style={{ color: MUTED }}>✅ empty pattern, always matches</span>;
  if (!matched) return <span style={{ color: DANGER }}>❌ no match</span>;
  const extra = matchedCandidates.length - 1;
  return (
    <span style={{ color: SUCCESS }}>
      ✅ {matchedCandidates[0]}{extra > 0 ? ` (+${extra} more)` : ""}
    </span>
  );
}
