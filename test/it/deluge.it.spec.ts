import { test } from "../../e2e/fixtures/extension";
import { defineClientSuite } from "./fixtures/client-suite";
import { deluge } from "./fixtures/clients/deluge";

test.describe("Deluge", () => {
    defineClientSuite(deluge);
});
