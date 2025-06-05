# QQ邮箱附件下载助手

该仓库提供一份 Tampermonkey 用户脚本 `QQmailAttachmentHelper.user.js`，
用于在 QQ 邮箱网页版批量下载邮件附件并进行简单管理。

## 使用方法
1. 安装浏览器扩展 [Tampermonkey](https://tampermonkey.net/)。
2. 将脚本文件导入扩展并启用。
3. 打开 [QQ 邮箱](https://wx.mail.qq.com/) 后，工具栏会出现“附件下载”按钮，点击即可按需下载附件。

脚本支持批量下载、分组保存和附件去重等功能，适合直接在网页端处理邮件附件的场景。

脚本会在浏览器本地存储下载设置，例如并发数和文件命名模板，可在“下载设置”中调整。
