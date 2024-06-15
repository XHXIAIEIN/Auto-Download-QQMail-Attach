## 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱来自各地网友的投稿附件。数量比较多（上千份），如果手动一个一个下载非常麻烦。。。

而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了，还可能会出现大量重复的命名文件。 这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。

网上搜了下资料，基本都是通过POP3来下载，但这个邮箱并不是自己的，只是临时注册用来接收邮箱的小号，对方也不希望开通手机认证。

于是临时研究了一下 Python + selenium + Chrome 来模拟手动爬虫~
  
--

## 简要安装步骤

0. 下载必要的软件:
   - [Python](https://www.python.org/downloads/)，安装最新版。
   - [Chromedriver](https://googlechromelabs.github.io/chrome-for-testing/#stable)，下载 win64 版本的 chromedriver，并解压到桌面。
   - 按下 win + R， 输入 cmd，在终端控制台安装运行库: `pip install selenium`
1. 保存 [Mail.py](https://raw.githubusercontent.com/XHXIAIEIN/Auto-Download-QQMail-Attach/master/Mail.py), 右键，保存到桌面。
2. 使用 [VSCode](https://code.visualstudio.com/Download)(建议)编辑文件，修改其中的自定义参数：邮箱文件夹ID
3. 运行脚本。手动扫码登录，等待完成即可。


## 详细安装步骤

### 1. **Python 3**   
https://www.python.org/
打开页面，点击网页最醒目的黄色按钮。"Download Python 3.xxx" (xxx 为最新版本号)
下载最新版即可，跟着引导安装。

### 2. **selenium**  
如果你已经安装好了 python 环境，按下 Win + R，输入 cmd，打开控制台。    
接着输入下方的指令：
```
pip install selenium
```
若因网络代理问题无法下载，可尝试使用国内的镜像源。举例：
```
pip install selenium -i http://pypi.douban.com/simple --trusted-host pypi.douban.com
```

### 3. **chromedriver**
https://googlechromelabs.github.io/chrome-for-testing/#stable

这一步，可能相对比较麻烦，和看起来可怕，但请耐心操作。
打开页面，你会看一个巨大的，绿色的表格。
看中间的那几行，找到中间 chromedriver, 然后找到 win64 那行。

将 win64 旁边那格 URL 地址复制到浏览器地址栏，按下回车，即可下载。
可能有点慢，因为需要科学上网。
下载后，解压出来，放这个脚本文件相同的目录。

举例：下载的地址是这样的，只有链接中间的版本号数字不同  
https://storage.googleapis.com/chrome-for-testing-public/126.0.6478.61/win64/chromedriver-win64.zip

<br><br>

## 在开始之前，你需要先做几件事。

### 1 邮箱文件夹

把你想要下载的邮件**移动到**文件夹里，方便整理区分。
   
<br>   
   
### 2 找到对应的文件夹ID
在左侧的面板‘我的文件夹’中找到你刚刚创建的文件夹，  
然后**右键-新窗口打开**，在浏览器地址栏的网址链接找到**文件夹ID**的参数:  `folderid`  
  
举例：这里的 folderid={ A }，里面通常是一个数字，例如：123，129，200...  
```
https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={x}&url=/cgi-bin/mail_list?folderid={ A }%26page={x}
```  
     
<br>   


    
## 如何使用

已经安装了 Python，会发现开始菜单新增了一个 IDLE 编辑器，从菜单新建文件：File - New File (Ctrl + N)。    
然后把 [Mail.py](https://raw.githubusercontent.com/XHXIAIEIN/Auto-Download-QQMail-Attach/master/Mail.py) 的代码复制粘贴到 IDLE 中，  
将文件保存在任意位置(比如桌面)，随便取个名比如 QQmail.py

阅读前半部分的参数区，根据你的需要对参数进行修改。具体的参数说明请继续看下方。    
当你想运行脚本时，只需要在 IDLE 中运行代码即可：Run - Run Module (F5)   

<br>   
   
> 注：通过运行脚本启动的浏览器窗口，只能同时启动一个。若重复启动脚本将会打开空页面，需要关闭上一个窗口重新运行脚本。  
     
<br><br><br>  
   
## 修改自定义参数

1. **文件夹ID**（必填）  
就如前面的提示， 在文件夹右键，新窗口打开，找到网址链接的参数。
```
https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={x}&url=/cgi-bin/mail_list?folderid={ A }%26page={x}
``` 

2. **附件下载路径**（必填）  
浏览器下载的文件会自动保存在这里。只需要填 ` ROOTPATH ` 在双引号里面的内容， 剩下两个会在这个目录创建文件夹。 
```
ROOTPATH = r"D:\Downloads\2024"
DOWNLOAD_FOLDER = os.path.join(ROOTPATH,"download")     # 不需要修改。附件实际下载目录 即："D:\\Downloads\\2024\\download"
USERDATA_FOLDER = os.path.join(ROOTPATH,"selenium")     # 不需要修改。浏览器的缓存数据 即："D:\\Downloads\\2024\\selenium"
```

3. **计划任务** （可选） 
- Title_Task，从第几封邮件开始，只读取多少封邮件，或者在第几封邮件结束。  
- Pages_Task，从第几页开始，翻多少页后结束，或者在第几页结束。   
 
> start  从第几个开始。默认从第1封邮件开始。    
> end    到第几个结束。举例：执行到第 20 封邮件时结束。(包含第20封邮件)   
> step   执行多少次后结束。举例：从第 1 封邮件开始执行，往后处理 10 封结束，也就是在第 10 封邮件时结束下载。   

> relay   初始编号，默认从 0 开始计数，若下载过程中断，可以通过它覆盖任务初始编号(title_index)  
> reverse 翻页任务结束时，将邮件列表顺序反转，即根据{投稿时间}顺序下载附件。否则按默认{最新邮件}顺序下载。

注：end 和 step 不同的地方是，end 代表着结束的终点，而 step 则是从开始后累计的数量。  

```
Title_Task = { 'start':1, 'step':0, 'end': 0, 'relay': 0 }
Pages_Task = { 'start':1, 'step':0, 'end':0, 'autoNext': 1, 'reverse': 0 }
```

4. **关键词过滤：邮件主题** （可选）   
TITLE_BACKLIST_KEYS，黑名单  
TITLE_WHITELIST_KEYS，白名单  

需要注意的是，白名单关键词越多，匹配规则越严格。
      
``` 
TITLE_WHITELIST_KEYS = ['反馈','合作']      # 只处理标题同时包含这两个关键词的邮件
TITLE_BACKLIST_KEYS  = ['发信方已撤回邮件']  # 不处理
```
  
5. **文件类型过滤：附件** （可选）   
ATTACH_BACKLIST_FILETYPE，黑名单  
ATTACH_WHITELIST_FILETYPE，白名单  
      
``` 
attach_blacklist_filetype = [''] 
attach_whitelist_filetype = ['psd', 'ai']  # 不下载 psd 或 ai 类型的文件
```

  
<br><br><br>  


## 小伙子，你干得不错！

如果这个脚本对你非常有帮助，节省了你的时间，提升了你的工作效率，让生活变得更美丽....
可以请我喝杯咖啡喔！我会非常高兴的！！

![xhxiaiein_sponsors](https://user-images.githubusercontent.com/45864744/116389688-d38c4480-a84f-11eb-9dec-036bc1abf397.png)

