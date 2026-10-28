import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const acorn = require("../vendor/acorn.cjs");
const wrapIdentity = require("../runtime/identity.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const input = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, "zh-build/upstream/main.js");
const output = path.join(root, "main.js");
const source = fs.readFileSync(input, "utf8");
const dictionary = JSON.parse(fs.readFileSync(path.join(root, "zh-build/translations/zh-CN.json"), "utf8"));
const config = JSON.parse(fs.readFileSync(path.join(root, "zh-build/upstream/provenance.json"), "utf8"));
const digest = crypto.createHash("sha256").update(source).digest("hex");
if (input === path.join(root, "zh-build/upstream/main.js") && digest !== config.sha256) throw new Error("上游发行文件校验失败，已停止构建。");
const tree = acorn.parse(source, { ecmaVersion: "latest", sourceType: "script" });
const replacements = [];
const views = { "git-view": "git-zh-cn-view", "git-history-view": "git-zh-cn-history-view", "diff-view": "git-zh-cn-diff-view", "split-diff-view": "git-zh-cn-split-diff-view" };
function translateHtml(value) {
    return value.replace(/>([^<>]+)</g, (all, text) => {
        const key = text.trim();
        return Object.hasOwn(dictionary.strings, key) ? ">" + text.replace(key, dictionary.strings[key]) + "<" : all;
    }).replace(/(aria-label|title|placeholder)="([^"]*)"/g, (all, attribute, text) => {
        const translated = dictionary.strings[text];
        return translated ? `${attribute}="${translated.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"` : all;
    });
}
function translate(value, template = false) {
    if (Object.hasOwn(views, value)) return views[value];
    if (value === "obsidian-git") return "obsidian-git-zh-cn";
    if (value.includes("/plugins/obsidian-git/")) return value.replaceAll("/plugins/obsidian-git/", "/plugins/obsidian-git-zh-cn/");
    if (value.startsWith("obsidian-git:")) return "obsidian-git-zh-cn:" + value.slice("obsidian-git:".length);
    if (Object.hasOwn(dictionary.strings, value)) return dictionary.strings[value];
    if (template && Object.hasOwn(dictionary.fragments, value)) return dictionary.fragments[value];
    if (value.includes("<") && value.includes(">")) return translateHtml(value);
    return value;
}
function escapeTemplate(value) {
    return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
function walk(node, visit, parent = null) {
    if (!node || typeof node !== "object") return;
    if (typeof node.type === "string") visit(node, parent);
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) value.forEach((entry) => walk(entry, visit, node));
        else if (value && typeof value === "object") walk(value, visit, node);
    }
}
function settingsRanges(ast) {
    const ranges = [];
    walk(ast, (n) => { if ((n.type === "ClassExpression" || n.type === "ClassDeclaration") && n.superClass?.property?.name === "PluginSettingTab") ranges.push([n.start, n.end]); });
    return ranges;
}
function isDisplayAction(node, parent, ranges) {
    return node.type === "Literal" && parent?.type === "AssignmentExpression" && parent.right === node && parent.left.type === "Identifier" && ["commit", "commit-and-sync", "提交", "提交并同步"].includes(node.value) && ranges.some(([a, b]) => node.start >= a && node.end <= b);
}
const originalRanges = settingsRanges(tree);
walk(tree, (node, parent) => {
    if (node.type === "Literal" && typeof node.value === "string") {
        const translated = isDisplayAction(node, parent, originalRanges) ? ({ "commit": "提交", "commit-and-sync": "提交并同步" }[node.value] ?? node.value) : translate(node.value);
        if (translated !== node.value) replacements.push({ start: node.start, end: node.end, text: JSON.stringify(translated), before: node.value, after: translated, kind: "literal" });
    } else if (node.type === "TemplateElement" && node.value.cooked != null) {
        const translated = translate(node.value.cooked, true);
        if (translated !== node.value.cooked) replacements.push({ start: node.start, end: node.end, text: escapeTemplate(translated), before: node.value.cooked, after: translated, kind: "template" });
    }
});
let localized = source;
for (const item of [...replacements].sort((a, b) => b.start - a.start)) localized = localized.slice(0, item.start) + item.text + localized.slice(item.end);
const localizedTree = acorn.parse(localized, { ecmaVersion: "latest", sourceType: "script" });
function signature(ast) {
    const commands = [], requires = [], protocol = [], structure = [];
    const ranges = settingsRanges(ast);
    walk(ast, (node, parent) => {
        structure.push(node.type);
        if (node.type === "Property" && !node.computed && node.key?.name === "id" && node.value?.type === "Literal") commands.push(node.value.value);
        if (node.type === "CallExpression" && node.callee?.name === "require" && node.arguments[0]?.type === "Literal") requires.push(node.arguments[0].value);
        if (!isDisplayAction(node, parent, ranges) && node.type === "Literal" && typeof node.value === "string" && /^(?:--?[\w-]+|refs\/[^\s]*|https?:\/\/[^\s]*|git@[^\s]*|\.git|HEAD|YES|NO|push|pull|fetch|commit|clone|merge|rebase|reset|checkout|add|status|log)$/.test(node.value)) protocol.push(node.value);
    });
    return { commands, requires, protocol, structure };
}
if (JSON.stringify(signature(tree)) !== JSON.stringify(signature(localizedTree))) throw new Error("汉化改变了程序结构、命令 ID、依赖或 Git 协议参数，构建已终止。");
walk(localizedTree, (node) => {
    if (node.type === "Literal" && (node.value === "obsidian-git" || (typeof node.value === "string" && node.value.includes("/plugins/obsidian-git/")))) throw new Error("发行文件仍引用原插件目录，构建已终止。");
});
const version = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8")).version;
const runtime = `\n;(() => {\nconst original = module.exports;\nconst createChineseGit = ${wrapIdentity.toString()};\nmodule.exports = { ...original, default: createChineseGit(original.default, require("obsidian").Notice) };\n})();\n`;
fs.writeFileSync(output, localized + runtime);
fs.writeFileSync(path.join(root, "zh-build/build-report.json"), JSON.stringify({ upstream: config, version, translatedOccurrences: replacements.filter(x => !x.after.startsWith("obsidian-git-zh-cn:")).length, namespaceChanges: replacements.filter(x => x.after.startsWith("obsidian-git-zh-cn:")).length, integrityChecks: ["JavaScript syntax", "unchanged AST structure", "unchanged command IDs", "unchanged runtime imports", "unchanged Git protocol arguments"], substitutions: replacements.map(({ before, after, kind }) => ({ before, after, kind })) }, null, 2) + "\n");
console.log(`Built ${output}: ${replacements.length} text/namespace substitutions; syntax and Git contract checks passed.`);
