import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extensionUrl } from "../helpers/chrome-mock";

const { getCustomSound } = vi.hoisted(() => ({ getCustomSound: vi.fn() }));
vi.mock("../../src/util/sound-storage", () => ({ getCustomSound }));

const { playNotificationSound } = await import("../../src/util/play-sound");

const CUSTOM_SOUND_URL = "blob:custom-sound";
const DEFAULT_SOUND_URL = extensionUrl("assets/sounds/success.ogg");

interface AudioStub {
    Audio: ReturnType<typeof vi.fn>;
    finishPlaying: () => void;
}

function stubAudioPlay(play: () => Promise<void>): AudioStub {
    let endedListener = () => {};
    const Audio = vi.fn(function () {
        return {
            play,
            addEventListener: (_event: string, listener: () => void) => { endedListener = listener; },
        };
    });
    vi.stubGlobal("Audio", Audio);
    return { Audio, finishPlaying: () => endedListener() };
}

beforeEach(() => {
    URL.createObjectURL = vi.fn(() => CUSTOM_SOUND_URL);
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("playNotificationSound with a stored custom sound", () => {
    beforeEach(() => {
        getCustomSound.mockResolvedValue({ name: "ding.ogg", blob: new Blob(["ding"]) });
    });

    it("frees the sound's object URL when playback is refused", async () => {
        stubAudioPlay(() => Promise.reject(new Error("autoplay blocked")));

        await playNotificationSound("success");

        await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(CUSTOM_SOUND_URL));
    });

    it("keeps the object URL while the sound is still playing", async () => {
        stubAudioPlay(() => Promise.resolve());

        await playNotificationSound("success");

        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("frees the object URL once the sound has finished", async () => {
        const audio = stubAudioPlay(() => Promise.resolve());

        await playNotificationSound("success");
        audio.finishPlaying();

        expect(URL.revokeObjectURL).toHaveBeenCalledWith(CUSTOM_SOUND_URL);
    });
});

describe("playNotificationSound without a usable custom sound", () => {
    it("plays the bundled default when none is stored", async () => {
        getCustomSound.mockResolvedValue(undefined);
        const audio = stubAudioPlay(() => Promise.resolve());

        await playNotificationSound("success");
        audio.finishPlaying();

        expect(audio.Audio).toHaveBeenCalledWith(DEFAULT_SOUND_URL);
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it("falls back to the bundled default when loading the custom sound fails", async () => {
        getCustomSound.mockRejectedValue(new Error("IndexedDB unavailable"));
        const audio = stubAudioPlay(() => Promise.resolve());

        await playNotificationSound("success");

        expect(audio.Audio).toHaveBeenCalledWith(DEFAULT_SOUND_URL);
    });
});
