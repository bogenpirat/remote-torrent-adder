import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import RuleRow from "../../../src/options/components/AutoLabelDirRuleRow";
import { type AutoLabelDirCriterionEvaluation, type AutoLabelDirRuleEvaluation } from "../../../src/util/auto-label-dir-matcher";

function criterionEvaluation(overrides: Partial<AutoLabelDirCriterionEvaluation> = {}): AutoLabelDirCriterionEvaluation {
    return {
        criterion: { field: "filePath", value: "\\.mkv$" },
        matched: true,
        matchedCandidates: ["a.mkv", "b.mkv", "c.mkv"],
        invalidPattern: false,
        ...overrides,
    };
}

function ruleEvaluation(criteria: AutoLabelDirCriterionEvaluation[]): AutoLabelDirRuleEvaluation {
    const setting = { criteria: criteria.map(each => each.criterion), label: "video", dir: "/video" };
    return { index: 1, setting, matched: true, criteria };
}

function renderRow(rule: AutoLabelDirRuleEvaluation, winningRuleIndex: number | null = 1): HTMLElement {
    return render(<RuleRow rule={rule} winningRuleIndex={winningRuleIndex} showLabel showDir />).container;
}

describe("AutoLabelDirRuleRow", () => {
    it("numbers the rule from one and states what it applies", () => {
        const row = renderRow(ruleEvaluation([criterionEvaluation()]));

        expect(row).toHaveTextContent('Rule 2✅ applied → label "video", dir "/video"');
    });

    it("shows the first match and counts the others", () => {
        const row = renderRow(ruleEvaluation([criterionEvaluation()]));

        expect(row).toHaveTextContent("File in torrent\\.mkv$✅ a.mkv (+2 more)");
    });

    it("shows a single match without a count", () => {
        const row = renderRow(ruleEvaluation([criterionEvaluation({ matchedCandidates: ["a.mkv"] })]));

        expect(row).toHaveTextContent("✅ a.mkv");
        expect(row).not.toHaveTextContent("more");
    });

    it("explains that an empty pattern always matches", () => {
        const emptyPattern = criterionEvaluation({ criterion: { field: "trackerUrl", value: "" }, matchedCandidates: [] });

        expect(renderRow(ruleEvaluation([emptyPattern]))).toHaveTextContent("Tracker URL(empty)✅ empty pattern, always matches");
    });

    it("says which rule wins instead when it matches but is not the winner", () => {
        const shadowed = renderRow(ruleEvaluation([criterionEvaluation()]), 0);

        expect(shadowed).toHaveTextContent("Rule 2✅ matches, but rule 1 wins");
        expect(shadowed).not.toHaveTextContent("applied");
    });
});
