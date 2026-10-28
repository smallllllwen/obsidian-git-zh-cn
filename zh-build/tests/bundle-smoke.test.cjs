const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
function loadBundle(desktop) {
    let any;
    any = new Proxy(function () { return any; }, { get(target, key) { if (key === 'prototype') return target.prototype; if (key === Symbol.iterator) return function*() {}; if (key === Symbol.toPrimitive) return () => ''; if (key === 'then') return undefined; return any; }, construct() { return any; } });
    const commands = [], views = [], labels = [], descriptions = [], tabs = [];
    function el() { return new Proxy({ style: {}, classList: { add() {}, remove() {} }, empty() {}, setText(s) { labels.push(s); return this; }, createEl() { return el(); }, createDiv() { return el(); }, createSpan() { return el(); }, appendText(s) { descriptions.push(s); }, setAttribute() {}, addEventListener() {}, querySelector() { return null; } }, { get(target,key) { return key in target ? target[key] : any; } }); }
    class Plugin {
        constructor(app,manifest) { this.app=app; this.manifest=manifest; }
        async loadData() { return {}; } async saveData() {}
        registerEvent() {} registerEditorExtension() {} registerHoverLinkSource() {}
        registerView(type) { views.push(type); }
        addRibbonIcon(icon,label) { labels.push(label); }
        addCommand(command) { commands.push(command); return command; }
        addSettingTab(tab) { tabs.push(tab); }
    }
    class PluginSettingTab { constructor(app,plugin) { this.app=app; this.plugin=plugin; this.containerEl=el(); } }
    function control() { const o=el(); return new Proxy(o,{get(t,k){if(k==='inputEl'||k==='buttonEl'||k==='sliderEl')return el();if(k==='getValue')return ()=>'';return (...args)=>o;}}); }
    class Setting {
        constructor(container) { this.settingEl=el();this.nameEl=el();this.descEl=el();this.controlEl=el(); }
        setName(s) { labels.push(s);return this; } setDesc(s) { if(typeof s==='string')descriptions.push(s);return this; }
        setHeading(){return this;} setDisabled(){return this;} setClass(){return this;}
        addMomentFormat(fn){fn(control());return this;} addSearch(fn){fn(control());return this;} addText(fn){fn(control());return this;} addTextArea(fn){fn(control());return this;} addToggle(fn){fn(control());return this;} addDropdown(fn){fn(control());return this;} addButton(fn){fn(control());return this;} addExtraButton(fn){fn(control());return this;} addSlider(fn){fn(control());return this;} addColorPicker(fn){fn(control());return this;}
    }
    const app = { plugins: { plugins: {} }, vault: { configDir: '.obsidian', on() {}, adapter: { exists: async()=>false, getBasePath:()=>'/example-vault' } }, workspace: { on(){}, onLayoutReady(){}, getActiveFile(){return null;}, getLeavesOfType(){return [];} }, loadLocalStorage(){return null;}, saveLocalStorage(){} };
    const obsidian = new Proxy({ Plugin, PluginSettingTab, Setting, Platform: { isDesktopApp:desktop, isMobile:!desktop, isWin:false, isMacOS:desktop, isDesktop:desktop }, Notice:class{}, debounce(){ const f=()=>{};f.cancel=()=>{};return f;}, normalizePath:p=>p, moment:any, setIcon(){} }, {get(t,k){return k in t?t[k]:any;}});
    const module={exports:{}};
    const context={module,exports:module.exports,console,Buffer,TextEncoder,TextDecoder,URL,URLSearchParams,setTimeout,clearTimeout,setInterval,clearInterval,localStorage:{getItem(){return null;},removeItem(){}},navigator:{userAgent:'test'},require(id){if(id==='obsidian')return obsidian;if(id.startsWith('@codemirror/')||id.startsWith('@lezer/'))return any;if(id==='electron')return any;return require(id);}};
    context.setTimeout=()=>0;context.setInterval=()=>0;context.global=context;context.window=context;context.document={createElement(){return el();},createTextNode(){return el();},head:el(),body:el()};context.process=process;
    try { vm.runInNewContext(fs.readFileSync(path.join(root,'main.js'),'utf8'),context,{filename:'main.js',timeout:5000}); } catch (error) { throw new Error(error.message); }
    const plugin = new module.exports.default(app, JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8')));
    return {plugin,commands,views,labels,descriptions,tabs,context};
}
for(const desktop of [true,false]) test(`${desktop?'desktop':'mobile'} bundle loads and registers Chinese commands with independent views`,async()=>{
    const f=loadBundle(desktop);
    await f.plugin.onload();
    assert.ok(f.commands.some(x=>x.id==='push'&&x.name==='提交并同步'));
    assert.ok(f.commands.some(x=>x.id==='push2'&&x.name==='推送到远程'));
    assert.ok(f.views.includes('git-zh-cn-view'));
    assert.ok(!f.views.includes('git-view'));
    assert.ok(f.labels.includes('打开 Git 版本管理'));
    assert.ok(f.tabs.length===1);
    const NativeGit = Object.values(f.context).find(v=>typeof v==='function' && v.prototype && Object.getOwnPropertyDescriptor(v.prototype,'relPluginConfigPath'));
    assert.ok(NativeGit, 'native Git backend is available');
    const nativeGit=new NativeGit(f.plugin);
    assert.equal(nativeGit.relPluginConfigPath,path.join('.obsidian','plugins','obsidian-git-zh-cn'));
    assert.equal(nativeGit.absPluginConfigPath,path.join('/example-vault','.obsidian','plugins','obsidian-git-zh-cn'));
    f.plugin.gitManager={getConfig:async()=>undefined,setConfig:async()=>{}};
    f.plugin.gitReady=true;
    f.tabs[0].display();
    await new Promise(resolve=>setImmediate(resolve));
    assert.ok(f.labels.includes('自动备份'));
    assert.ok(f.labels.includes('自动提交并同步间隔（分钟）'));
    assert.ok(f.labels.includes('设置远程仓库') || f.commands.some(x=>x.name==='设置远程仓库'));
});
