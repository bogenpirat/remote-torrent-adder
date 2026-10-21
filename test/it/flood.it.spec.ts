import { test } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { flood } from "./fixtures/clients/flood";

test.describe("flood", () => {
    defineClientSuite(flood);
});
