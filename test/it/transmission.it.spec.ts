import { test } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { transmission } from "./fixtures/clients/transmission";

test.describe("Transmission", () => {
    defineClientSuite(transmission);
});
