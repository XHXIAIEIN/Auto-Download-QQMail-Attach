# 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱上来自各地网友的投稿附件。数量比较多，如果手动一个一个下载很麻烦，而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了。这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。

于是临时研究了一下 Python + selenium + Chrome 来节省很多时间~

---

## 如何安装

- **Python 3** https://www.python.org/
- **WebDriver for Chrome** https://sites.google.com/a/chromium.org/chromedriver/downloads

---

## 如何使用

### 1. 运行下面这段代码，手动输入账号密码登陆邮箱,并勾选下次自动登陆
``` python
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("user-data-dir=selenium")
chrome = webdriver.Chrome(options=options)

url = 'https://mail.qq.com/'
chrome.get(url)

print('登陆成功！')
```

第一次启动脚本会进入QQ邮箱的登陆页面，需要手动登陆一次。
勾选下次自动登陆，然后就可以关掉浏览器了。下一次再启动脚本，就会自动登陆直接进入邮箱主页了。

> 注：通过运行脚本启动的浏览器窗口，同时只能启动一个。若重复启动脚本将会打开空页面，需要关闭上一个窗口重新运行脚本。


然后把你想要下载的邮件移动到文件夹里面，让脚本进入文件夹里面自动下载。
如果邮件数量比较多，建议在邮箱设置-常规里面，调整每页显示100封邮件。


### 2. 运行`Download_QQEmail_File.py` 



## 可能出现的BUG
1. 如果网络不稳定。附件的预览图如果没有加载出来，脚本可能会卡住。
  （解决方案：刷新页面，直到附件预览图加载出来，可能需要多刷新几次）
 
2. 本地重命名的批处理脚本，如果附件有重复的文件，后面的相同的文件不会被重命名。
   （解决方案：可以根据控制台输出的记录，搜索文件名，找到发件人昵称或者邮箱，手动重命名）
 

## 踩坑历史
1. 附件收藏中的"全部附件"，并不是想象中真的把全部附件整合在一起，偶尔还是会漏掉一些。（修复：换成进入邮件主题下载附件）

 
 
