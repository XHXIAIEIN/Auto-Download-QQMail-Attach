# QQ Mail 附件批量下载

批量下载 QQ 邮箱投稿附件，智能分类命名，生成审计报告。适用于设计比赛、作品作业等通过邮件收集作品的场景。

## 功能

- **全量扫描** — 扫描指定文件夹的全部邮件，提取正规附件 + 正文内嵌图片
- **智能分类** — 自动识别图片/项目文件/文档/音视频/压缩包/重复/第三方附件，分流到子目录
- **命名补全** — 从邮件主题、发件人邮箱提取身份信息（姓名、QQ、手机），统一命名格式
- **AI 增强** — 可选使用 Chrome Built-in AI (Gemini Nano) 解析非标准主题
- **重复检测** — `sender_email + file_size` 判定重复，保留最新，旧版移入重复目录
- **断点续传** — IndexedDB 持久化下载列表，刷新页面后可继续下载
- **登录态恢复** — session 过期自动暂停，刷新登录后无缝继续
- **审计校验** — 邮件数 → 附件数 → 落盘数三级对账，生成 `report.md`

## 使用方式

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 安装 `qqmail-downloader.user.js` 脚本
3. 打开 [QQ 邮箱](https://wx.mail.qq.com)，进入目标文件夹
4. 页面顶部出现「附件下载」面板，点击「开始扫描」
5. 扫描完成后选择本地保存目录，自动开始下载

### 前置条件

- Chrome 浏览器（需要 File System Access API 支持）
- 已登录 QQ 邮箱 (wx.mail.qq.com)

## 项目结构

```
└── qqmail-downloader.user.js    # UserScript 主文件（单文件，无构建依赖）
```
