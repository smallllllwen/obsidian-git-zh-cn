# Git 简体中文 · Obsidian

基于 [Vinzent03/obsidian-git 2.39.0](https://github.com/Vinzent03/obsidian-git/tree/2.39.0) 的独立简体中文版本，保留原作者与 MIT 许可证。

- 独立插件 ID：`obsidian-git-zh-cn`
- 当前汉化版：`2.39.1`
- 中文命令、设置说明、下拉选项、版本管理面板、历史视图、常见通知和状态栏。
- 保留上游桌面原生 Git 与移动端 JavaScript Git 实现。
- 首次启用时导入本笔记库原版 Git 的设置，不覆盖已有汉化版设置。

## 下载安装

**[下载 2.39.1 安装包](https://github.com/smallllllwen/obsidian-git-zh-cn/raw/refs/heads/zh-cn/downloads/obsidian-git-zh-cn-2.39.1.zip)** · [查看发行版本](https://github.com/smallllllwen/obsidian-git-zh-cn/releases)

1. 在 Obsidian 设置 → 第三方插件中，先关闭原版 **Git**。
2. 下载并解压安装包，将其中的 `obsidian-git-zh-cn` 文件夹放到当前笔记库的 `.obsidian/plugins/` 下。使用自定义配置目录时，改放到该配置目录的 `plugins/` 下。
3. 重新打开 Obsidian，或在第三方插件页重新加载插件列表，启用 **Git 简体中文**。
4. 按 `⌘P`（Windows：`Ctrl+P`），搜索“提交并同步”，即可备份笔记。

安装包里的 `main.js`、`manifest.json`、`styles.css` 应直接位于 `.obsidian/plugins/obsidian-git-zh-cn/` 中，避免多套一层文件夹。

更新时关闭汉化插件，只替换上述三个程序文件，保留自己的 `data.json`。独立 ID 不会被原版 Git 的社区更新覆盖。不要同时启用两个 Git 插件。

## Mac、Windows、Android 与 iOS

各平台使用同一份安装包，但每个笔记库都需要安装并启用。若配置目录由同步服务完整同步，也仍需确认该设备已经启用插件。

- Mac / Windows：仍需安装本机 Git，并为当前设备配置 HTTPS 或 SSH 身份验证。
- Android / iOS：保留原版移动端实现及其限制；不支持原生 Git/SSH，较大的仓库可能遇到内存或性能问题。汉化不会消除这些上游限制。
- 本次通过构建检查、5 项迁移测试和桌面/移动模式的模拟加载测试；尚未进行各平台实机测试。

首次启用会读取原版 `obsidian-git/data.json` 并导入设置。现有汉化版设置优先保留。本设备的 Git 路径等非密钥设置也会导入；密码和访问令牌不会自动复制，移动端等使用插件内认证的设备可能需要重新登录。原版文件和 Git 仓库保持原位。

## 本地构建与验证

汉化层是可复现的发行构建，不重新安装或改写 Git 后端依赖。保留完整上游源码，可按上游 `AGENTS.md` 和 pnpm 命令进行完整开发。

```sh
# 无需额外安装依赖，使用 Node.js 24+
node zh-build/scripts/localize.mjs
node --check main.js
node --test zh-build/tests/*.test.cjs
```

`zh-build/upstream/main.js` 是上游 2.39.0 发行文件，SHA-256 记录在 `provenance.json`。构建脚本通过 JavaScript AST 定位文本、替换中文词典、隔离事件/视图命名空间，并添加独立 ID 的设置迁移入口。构建前校验上游文件，构建后检查语法、命令 ID、运行时依赖与 Git 协议参数。词典在 `zh-build/translations/zh-CN.json`，报告在 `zh-build/build-report.json`。

也可先用上游 pnpm 构建源码，再将构建产物路径传给本地化脚本：

```sh
pnpm install
pnpm run build
cp main.js /tmp/obsidian-git-upstream.js
node zh-build/scripts/localize.mjs /tmp/obsidian-git-upstream.js
```

较少见的底层 Git 或系统错误仍可能显示英文。原始底层错误会完整保留，方便排查。

## 致谢与许可

原版插件由 denolehov、Vinzent03 及贡献者开发。汉化发行维护：smallllllwen。

原插件与汉化代码遵循 [MIT 许可证](LICENSE)。构建所用 Acorn 解析器的许可证见 `zh-build/vendor/ACORN-LICENSE`。
