## 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱来自各地网友的投稿附件。数量比较多（上千份），如果手动一个一个下载非常麻烦。。。

而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了，还可能会出现大量重复的命名文件。 这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。

网上搜了下资料，基本都是通过POP3来下载，但这个邮箱并不是自己的，只是临时注册用来接收邮箱的小号，对方也不希望开通手机认证。

于是临时研究了一下 Python + selenium + Chrome 来模拟手动爬虫~
  
--

## 使用步骤

0. 下载必要的软件: [Python](https://www.python.org/downloads/), [Chromedriver](https://googlechromelabs.github.io/chrome-for-testing/#stable)
1. 下载此脚本: [Mail.py](https://raw.githubusercontent.com/XHXIAIEIN/Auto-Download-QQMail-Attach/master/Mail.py), 将它下载到桌面。
3. 使用 [VSCode](https://code.visualstudio.com/Download)(建议) 编辑脚本文件，修改其中的自定义参数：邮箱文件夹ID
4. 运行脚本，手动扫码登录，等待完成即可。

## 小伙子，你干得不错！

如果这个脚本对你非常有帮助，节省了你的时间，提升了你的工作效率，让生活变得更美丽....
可以请我喝杯咖啡喔！我会非常高兴的！！

![xhxiaiein_sponsors](https://user-images.githubusercontent.com/45864744/116389688-d38c4480-a84f-11eb-9dec-036bc1abf397.png)

