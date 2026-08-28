import { type Torrent } from "../models/torrent";
import { type AutoLabelDirCriterion, type AutoLabelDirSetting } from "../models/webui";

export interface AutoLabelDirCriterionEvaluation {
    criterion: AutoLabelDirCriterion;
    matched: boolean;
    matchedCandidates: string[];
    invalidPattern: boolean;
}

export interface AutoLabelDirRuleEvaluation {
    index: number;
    setting: AutoLabelDirSetting;
    matched: boolean;
    criteria: Array<AutoLabelDirCriterionEvaluation>;
}

export interface AutoLabelDirExplanation {
    rules: Array<AutoLabelDirRuleEvaluation>;
    winningRuleIndex: number | null;
    label: string | null;
    dir: string | null;
}

export function getAutoLabelResult(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): string | null {
    return explainAutoLabelDir(torrent, autoLabelDirSettings).label;
}

export function getAutoDirResult(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): string | null {
    return explainAutoLabelDir(torrent, autoLabelDirSettings).dir;
}

export function explainAutoLabelDir(torrent: Torrent, autoLabelDirSettings: Array<AutoLabelDirSetting>): AutoLabelDirExplanation {
    const rules = (autoLabelDirSettings ?? []).map((setting, index) => evaluateSetting(setting, index, torrent));
    const winningRule = rules.find(rule => rule.matched) ?? null;

    return {
        rules,
        winningRuleIndex: winningRule?.index ?? null,
        label: winningRule?.setting.label ?? null,
        dir: winningRule?.setting.dir ?? null
    };
}

function evaluateSetting(setting: AutoLabelDirSetting, index: number, torrent: Torrent): AutoLabelDirRuleEvaluation {
    const criteria = setting.criteria.map(criterion => evaluateCriterion(criterion, torrent));

    return {
        index,
        setting,
        matched: criteria.length > 0 && criteria.every(evaluation => evaluation.matched),
        criteria
    };
}

function evaluateCriterion(criterion: AutoLabelDirCriterion, torrent: Torrent): AutoLabelDirCriterionEvaluation {
    const candidates = candidatesForField(criterion.field, torrent);

    if (candidates === null) {
        return { criterion, matched: false, matchedCandidates: [], invalidPattern: false };
    }

    if (!criterion.value) {
        return { criterion, matched: true, matchedCandidates: [], invalidPattern: false };
    }

    return matchCandidates(criterion, candidates.values, candidates.flags);
}

function candidatesForField(field: AutoLabelDirCriterion["field"], torrent: Torrent): { values: string[] | undefined; flags: string } | null {
    switch (field) {
        case "trackerUrl": return { values: torrent.trackers, flags: "" };
        case "filePath": return { values: torrent.files, flags: "i" };
        case "torrentName": return { values: torrent.declaredName ? [torrent.declaredName] : [], flags: "i" };
        default: return null;
    }
}

function matchCandidates(criterion: AutoLabelDirCriterion, candidates: string[] | undefined, flags: string): AutoLabelDirCriterionEvaluation {
    let regex: RegExp;
    try {
        regex = new RegExp(criterion.value, flags);
    } catch {
        return { criterion, matched: false, matchedCandidates: [], invalidPattern: true };
    }

    const matchedCandidates = candidates?.filter(candidate => regex.test(candidate)) ?? [];
    return { criterion, matched: matchedCandidates.length > 0, matchedCandidates, invalidPattern: false };
}
