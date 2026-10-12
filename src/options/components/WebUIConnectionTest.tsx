import { useState, type CSSProperties } from "react";
import { ext } from "../../util/browser-api";
import { TestConnectionMessage, type ITestConnectionMessage } from "../../models/messages";
import type { ConnectionTestResult, WebUISettings } from "../../models/webui";
import { SUCCESS, DANGER } from "../theme";

const UNREACHABLE = { color: DANGER, icon: "❌" };
const CREDENTIALS_REFUSED = { color: "var(--rta-warning, #B8860B)", icon: "⚠" };
const REACHABLE = { color: SUCCESS, icon: "✅" };

const TEST_BUTTON_STYLE: CSSProperties = {
  background: "var(--rta-info, #4682B4)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 16px",
  fontWeight: 700,
};

export default function WebUIConnectionTest({ webUiSettings }: { webUiSettings: WebUISettings }) {
  const { testing, result, run } = useConnectionTest(webUiSettings);
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <button
        onClick={run}
        disabled={testing}
        style={{ ...TEST_BUTTON_STYLE, cursor: testing ? "default" : "pointer", opacity: testing ? 0.7 : 1, transition: "all 0.15s" }}
      >{testing ? "Testing…" : "Test connection"}</button>
      {result && <TestOutcome result={result} />}
    </div>
  );
}

interface TestConnectionState {
  signature: string;
  testing: boolean;
  result: ConnectionTestResult | null;
}

interface ConnectionTest {
  testing: boolean;
  result: ConnectionTestResult | null;
  run: () => Promise<void>;
}

function useConnectionTest(webUiSettings: WebUISettings): ConnectionTest {
  // A result only describes the endpoint + credentials it was produced for, so
  // it is stored together with a signature of those fields. Anything that would
  // change the request makes the stored result stale, which is derived during
  // render rather than cleared from an effect.
  const { id, client, host, port, secure, relativePath, username, password } = webUiSettings;
  const endpointSignature = JSON.stringify([id, client, host, port, secure, relativePath, username, password]);
  const [testState, setTestState] = useState<TestConnectionState>({ signature: endpointSignature, testing: false, result: null });
  const isCurrent = testState.signature === endpointSignature;

  const run = async () => {
    setTestState({ signature: endpointSignature, testing: true, result: null });
    const result = await requestConnectionTest(webUiSettings);
    setTestState({ signature: endpointSignature, testing: false, result });
  };
  return { testing: isCurrent && testState.testing, result: isCurrent ? testState.result : null, run };
}

async function requestConnectionTest(webUiSettings: WebUISettings): Promise<ConnectionTestResult> {
  try {
    const result = await ext.runtime.sendMessage({
      action: TestConnectionMessage.action,
      webUiSettings,
    } as ITestConnectionMessage);
    return result as ConnectionTestResult;
  } catch (error) {
    return { reachable: false, authenticated: null, httpResponseCode: 0, message: String(error) };
  }
}

function TestOutcome({ result }: { result: ConnectionTestResult }) {
  const outcome = result.reachable ? (result.authenticated === false ? CREDENTIALS_REFUSED : REACHABLE) : UNREACHABLE;
  return (
    <span style={{ color: outcome.color, fontWeight: 600, fontSize: 14 }}>
      {outcome.icon} {result.message}
    </span>
  );
}
