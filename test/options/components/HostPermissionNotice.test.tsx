import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HostPermissionNotice from "../../../src/options/components/HostPermissionNotice";

describe("HostPermissionNotice", () => {
    it("stays out of the way while host access is granted", async () => {
        (chrome.permissions.contains as any).mockResolvedValue(true);

        render(<HostPermissionNotice />);

        await waitFor(() => expect(chrome.permissions.contains).toHaveBeenCalled());
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("warns when host access has been revoked", async () => {
        (chrome.permissions.contains as any).mockResolvedValue(false);

        render(<HostPermissionNotice />);

        expect(await screen.findByRole("alert")).toBeInTheDocument();
        expect(chrome.permissions.contains).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
    });

    it("requests the origins back and dismisses itself once granted", async () => {
        (chrome.permissions.contains as any).mockResolvedValue(false);
        (chrome.permissions.request as any).mockResolvedValue(true);

        render(<HostPermissionNotice />);
        await userEvent.click(await screen.findByRole("button", { name: "Grant access" }));

        expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ["<all_urls>"] });
        await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    });

    it("keeps quiet on a browser that cannot answer the query", async () => {
        (chrome.permissions.contains as any).mockRejectedValue(new Error("unsupported"));

        render(<HostPermissionNotice />);

        await waitFor(() => expect(chrome.permissions.contains).toHaveBeenCalled());
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("re-checks when the browser reports a permission change", async () => {
        (chrome.permissions.contains as any).mockResolvedValue(true);

        render(<HostPermissionNotice />);
        await waitFor(() => expect(chrome.permissions.onRemoved.addListener).toHaveBeenCalled());

        const onRemoved = (chrome.permissions.onRemoved.addListener as any).mock.calls[0][0];
        (chrome.permissions.contains as any).mockResolvedValue(false);
        onRemoved({ origins: ["<all_urls>"] });

        expect(await screen.findByRole("alert")).toBeInTheDocument();
    });
});
