/* Independent identity and one-time, non-destructive migration for the Chinese fork. */
module.exports = function createChineseGit(BasePlugin, Notice) {
    return class ChineseGit extends BasePlugin {
        async onload() {
            if (this.app.plugins?.plugins?.["obsidian-git"]) {
                new Notice("请先停用原版 Git，再重新启用 Git 简体中文，避免两个插件同时操作同一仓库。", 12000);
                return;
            }
            if ((await this.loadData()) == null) {
                const oldPath = `${this.app.vault.configDir}/plugins/obsidian-git/data.json`;
                try {
                    if (await this.app.vault.adapter.exists(oldPath)) {
                        const previous = JSON.parse(await this.app.vault.adapter.read(oldPath));
                        if (!previous || typeof previous !== "object" || Array.isArray(previous)) {
                            throw new Error("原设置文件的格式不正确");
                        }
                        const { password, token, accessToken, personalAccessToken, ...settings } = previous;
                        await this.saveData(settings);
                        new Notice("已导入原版 Git 的设置。", 5000);
                    }
                } catch (error) {
                    new Notice("未能导入原版 Git 设置，请在设置页重新配置。", 10000);
                    console.error("obsidian-git-zh-cn: settings migration failed", error);
                }
            }
            // Device paths remain local. Passwords/tokens are deliberately not copied.
            for (const key of ["username", "hostname", "gitPath", "PATHPaths"]) {
                const destination = `obsidian-git-zh-cn:${key}`;
                if (this.app.loadLocalStorage(destination) == null) {
                    const oldValue = this.app.loadLocalStorage(`obsidian-git:${key}`);
                    if (oldValue != null) this.app.saveLocalStorage(destination, oldValue);
                }
            }
            await super.onload();
        }
    };
};
