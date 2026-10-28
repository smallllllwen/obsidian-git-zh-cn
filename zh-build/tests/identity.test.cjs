const { test } = require("node:test");
const assert = require("node:assert/strict");
const createChineseGit = require("../runtime/identity.cjs");
function fixture({ current = null, previous = null, activeOriginal = false, stored = {} } = {}) {
    const notices = [], saved = [], writes = [];
    const local = new Map(Object.entries(stored));
    let starts = 0;
    class Base {
        constructor() {
            this.app = { plugins: { plugins: activeOriginal ? { "obsidian-git": {} } : {} }, vault: { configDir: "custom-config", adapter: { exists: async () => previous != null, read: async (p) => { assert.equal(p, "custom-config/plugins/obsidian-git/data.json"); return typeof previous === "string" ? previous : JSON.stringify(previous); } } }, loadLocalStorage: (key) => local.get(key), saveLocalStorage: (key, value) => { writes.push(key); local.set(key, value); } };
        }
        async loadData() { return current; }
        async saveData(data) { saved.push(data); }
        async onload() { starts++; }
        onunload() { return "original-cleanup"; }
    }
    class Notice { constructor(text) { notices.push(text); } }
    const plugin = new (createChineseGit(Base, Notice))();
    return { plugin, notices, saved, writes, local, starts: () => starts };
}
test("first installation imports settings without altering the original or copying authentication secrets", async () => {
    const previous = { autoSaveInterval: 0, basePath: "notes", lineAuthor: { show: true }, password: "private", token: "private" };
    const f = fixture({ previous, stored: { "obsidian-git:gitPath": "/example/git", "obsidian-git:password": "private" } });
    await f.plugin.onload();
    assert.deepEqual(f.saved, [{ autoSaveInterval: 0, basePath: "notes", lineAuthor: { show: true } }]);
    assert.equal(previous.password, "private");
    assert.equal(f.local.get("obsidian-git-zh-cn:gitPath"), "/example/git");
    assert.equal(f.local.has("obsidian-git-zh-cn:password"), false);
    assert.equal(f.starts(), 1);
    assert.equal(f.plugin.onunload(), "original-cleanup");
});
test("upgrades preserve existing Chinese settings and device paths", async () => {
    const f = fixture({ current: { autoSaveInterval: 20 }, previous: { autoSaveInterval: 3 }, stored: { "obsidian-git:gitPath": "/old/git", "obsidian-git-zh-cn:gitPath": "/new/git" } });
    await f.plugin.onload();
    assert.deepEqual(f.saved, []);
    assert.equal(f.local.get("obsidian-git-zh-cn:gitPath"), "/new/git");
    assert.equal(f.starts(), 1);
});
test("two Git plugins cannot start competing operations on the same vault", async () => {
    const f = fixture({ activeOriginal: true, previous: { autoSaveInterval: 1 } });
    await f.plugin.onload();
    assert.equal(f.starts(), 0);
    assert.deepEqual(f.saved, []);
    assert.match(f.notices[0], /停用原版/);
});
test("a clean installation works with only Obsidian's cross-platform vault API", async () => {
    const f = fixture();
    await f.plugin.onload();
    assert.equal(f.starts(), 1);
    assert.deepEqual(f.saved, []);
});
test("malformed old settings are never saved over the new configuration", async () => {
    const f = fixture({ previous: "[]" });
    const old = console.error; console.error = () => {};
    try { await f.plugin.onload(); } finally { console.error = old; }
    assert.deepEqual(f.saved, []);
    assert.equal(f.starts(), 1);
    assert.match(f.notices[0], /未能导入/);
});
