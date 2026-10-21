import { test } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { rqbit } from "./fixtures/clients/rqbit";

test.describe("rqbit", () => {
    defineClientSuite(rqbit);
});
