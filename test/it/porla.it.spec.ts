import { test } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { porla } from "./fixtures/clients/porla";

test.describe("Porla", () => {
    defineClientSuite(porla);
});
