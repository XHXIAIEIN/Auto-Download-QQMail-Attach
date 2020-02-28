## 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱上来自各地网友的投稿附件。数量比较多（上千份），如果手动一个一个下载非常麻烦。。。

而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了，而且也会出现大量重复的命名文件。 这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。

网上搜了下资料，基本都是通过POP3来下载，但是这个邮箱并不是自己的，只是临时注册用来接收邮箱的小号，而对方也不希望开通手机认证。

于是临时研究了一下 Python + selenium + Chrome 来模拟手动爬虫~
  
<br>

## 如何安装

- **Python 3**   
  https://www.python.org/

> 下载完成后跟着引导安装就可以了。点页面中那两个带着小盾牌图标的大按钮。
> - [x] 1. Install Now
> - [x] 2. Disable path length limit

<br>

- **WebDriver for Chrome**  
  https://sites.google.com/a/chromium.org/chromedriver/downloads

> - [] Mac系统：  
> 直接用brew安装。 ``` brew cask install chromedriver```   
> ~~都用MAC写代码了，还不知道什么是brew？~~ 好吧，请点这里了解：https://brew.sh/index_zh-cn
>   
> - [] Win系统:   
> 注1：根据自己Chrome当前的版本号，下载对应WebDriver版本。以后Chrome更新了，也需要重新下载最新的版本。否则会报错。
>   
> 注2：**如何查看Chrome当前版本号**：右上角 - 帮助 - 关于Google Chrome 
>   
> 注3：**如何安装**：  
> 下载好之后，把`chromedriver.exe`放到随意一个文件夹，然后复制当前这个文件夹的路径。通常我喜欢把这类工具专门放到一个叫bin的文件夹里。比如D:\Program\bin
>   
> 按下Win键，输入 path ，列表会看到一个「编辑系统环境变量」，按下回车就能打开它。打开右下角「环境变量」，在下面「系统变量」列表里，找到「Path」的一行，双击编辑。右上角有「新建」，它会在列表后面新建空的一行，接着把刚才的文件夹路径粘贴进去就可以了。
>    
> --------------------------------

<br>

- **Nodejs**  
  https://nodejs.org/zh-cn/

> 下载最新的版本即可。跟着引导安装点下一步。  
> NodeJs安装完成后，按下Win + R，输入 cmd。然后按Ctrl + Shift + 回车键。以管理员权限进入命令行。接着输入下方的两条指令：

- **selenium**  
```
python -m pip install --upgrade pip
pip install selenium
```
<br>

繁琐的前置工作完成了。接着可以正式开始咯。

<br>
 
## 如何使用

前面已经安装了Python，会发现开始菜单列表新增了一个IDLE编辑器。打开Shell窗口后在菜单新建文件。【File - New File】

然后把下方的代码复制粘贴到IDLE中，将文件保存在任意位置，随便取个名比如QQmail.py。
另外建议不要放在桌面，因为脚本会生成一个文件夹用来储存浏览器缓存，可能有些占位置。

当你想运行脚本时，只需要在IDLE中按下键盘F5，就可以运行了。

<br>

### 第一次使用

初次启用脚本需手动登陆，勾选**下次自动登陆**（记住密码）以后再启用脚本时就可以实现自动登陆直接进入邮箱主页了。

这里也提供一个自动登录的脚本，只需要第一次使用它就可以了。后面不需要。

``` python
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("user-data-dir=selenium")
chrome = webdriver.Chrome(options=options)

#......................................................
# 填你自己的QQ账号，放心填没其他人看得到
#......................................................
QQNUMBER="123456789"
PASSWORD="abc987654321"


chrome.get("https://mail.qq.com/")
chrome.switch_to.default_content()
chrome.find_element_by_id("qqLoginTab").click()
chrome.switch_to.frame(chrome.find_element_by_id("login_frame"))
chrome.find_element_by_id("u").clear()
chrome.find_element_by_id("u").send_keys(QQNUMBER)
chrome.find_element_by_id("p").clear()
chrome.find_element_by_id("p").send_keys(PASSWORD)
chrome.find_element_by_id("p_low_login_enable").click()
chrome.find_element_by_id("login_button").click()

print('登陆成功！')
```
<br>
  
如果觉得让机器帮你填账号密码不安全。不嫌麻烦也可以先运行下面这段脚本来手动登陆一次。
  
``` python
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("user-data-dir=selenium")
chrome = webdriver.Chrome(options=options)

url = 'https://mail.qq.com/'
chrome.get(url)

print('登陆成功！')
```

<br>

> 注1：MAC运行时，如果提示** chromedriver' executable needs to be in PATH. **
> 需要将这里的代码稍微修改一下，手动补充路径：  
> ``` chrome = webdriver.Chrome('/usr/local/bin/chromedriver', options=options)``` 

<br>

> 注2：通过运行脚本启动的浏览器窗口，只能同时启动一个。若重复启动脚本将会打开空页面，需要关闭上一个窗口重新运行脚本。

<br>

登陆进邮箱主页后，需要做几件事

<br>  

### 1 调整每页显示邮件数量 
邮箱默认只显示25条邮件，需要在邮箱设置里，调整每页显示**100**封邮件。这样效率更高。

<br>  

### 2 邮箱文件夹
把你想要下载的邮件**移动到**文件夹里，方便整理区分。
  
<br>
  
### 3 新窗口打开文件夹（重要）
从邮箱左侧的面板‘我的文件夹’中找到你刚刚创建的文件夹，**右键-新窗口打开**
  
从浏览器的地址栏找到链接的几个参数: `sid` `folderid` `page`  
```
https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ A }&url=/cgi-bin/mail_list?folderid={ B }%26page={ C }
```
<br>
  
### 4 修改脚本里面的自定义参数，然后启动脚本

主要有几个参数需要修改：

1. token.
这里有2个参数需要修改。 ``sid``，和 ``folderid``，登陆QQ邮箱后，会在浏览器地址栏可以看到。  
  ``` token={'sid':'xxx', 'folderid':xxx, 'page': xxx} ```
  
  
2. 附件下载路径.
浏览器下载的文件会自动保存在这里。  
 ``` download_here='D:\\Downloads\\' ```
  
  
3. title.
也就是邮件列表。
如果你想从第10封邮件（从第1页第1封按顺序往下计算），然后只下载5封，就把``start``值改为10，`step`值改为5  
  ``` title={'index':1, 'start':10, 'step':5} ```

  
4. pageInfo
也就是翻页的页面数据。这里你只需要修改step的值。
比如，你的邮件的文件夹，一共有16页，就把这里改为15。运行脚本后就会自动翻页，知道处理完第16页。  
  ```pageInfo={'now':0, 'max':0, 'step':15, 'isfilp':0, 'autofilp':True} ```
  
  
5.Debug模式
如果你不想要下载附件，只想以纯文本的方式收集一下发信人的情况。
发件人的名字，发件人的邮箱，邮箱里有多少附件。
这些都会在控制台里输出。
（当然，即使你不开debug模式，这些数据也会被输出。只是不想下载附件罢了）  
  ``` DEBUG=1 ```

对了，其实邮件发送的时间也有收集，但是拿到的是时间戳的方式`` timestamp ``因为我暂时不需要知道发信时间，所以脚本中我还没有处理这个。


<br>

### 6 下载完成后
可以运行自动生成在下载目录中的 `_ren.bat` 的批处理脚本。它将会把本次下载的文件补充收件人邮箱作为名称前缀。

> 注：如果目录中存在相同名称的文件，或者存在特殊符号的名称，可能会因为无法读取而被无视。需要手动进行重命名。

<br>

### 7 附加脚本：将含有关键词的文件移动到指定文件夹。

```
import os
import shutil
import fnmatch

def find_key(key,path):
    for n in os.listdir(os.getcwd()):
        if fnmatch.fnmatch(n, key):
            print('{}：{}'.format(key,n))
            shutil.move(n,path)

def checkfile():
    all_md5 = {}
    filedir = os.walk(os.getcwd())
    for i in filedir:
        for tlie in i[2]:
            if md5sum(tlie) in all_md5.values():
                print('- {}'.format(tlie))
                shutil.move(tlie,'md5')
                #os.remove(tlie)
            else:
                all_md5[tlie] = md5sum(tlie)

if __name__ == '__main__':
    # 新建文件夹
    # 提前新建好需要分类的文件夹
    os.mkdir('psd')
    os.mkdir('图片')
    os.mkdir('反馈')
    os.mkdir('VIP')

    # 匹配关键词
    # 文件格式来过滤：比如将.jpg的文件移动到‘图片’文件夹。
    find_key('*.psd','psd')
    find_key('*.PSD','psd')
    find_key('*.jpg','图片')
    find_key('*.png','图片')
    
    # 关键词过滤：比如将含有‘issues’的文件名移动到'反馈'目录
    find_key('*issues*.*','反馈')
    find_key('*会员*.*','VIP')
```

---
  
## 特性
1. 自定义文件下载路径夹
2. 可以自定义脚本从第几封邮件开始，处理多少封邮件后结束。（如果start值超过当前页数范围将自动翻页）
2. 自动翻页
3. 如果邮件中没有包含附件，会自动打星标。
4. 脚本结束后会生成一个批处理程序，运行后会自动为附件重命名。命名规则是在文件名前面添加'发件人邮箱' 
  
<br>

## 可能出现的问题

1. 运行脚本时，如果sid过期忘记更换，控制台会报错，提示找不到页面元素。` element is not attached to the page document`  
   （sid密钥更新时间通常是一天，也可能更短。发现浏览器地址栏sid参数跟脚本中的不一样时，尽快更换。）

2. 如果网络不稳定。附件的预览图如果没有加载出来，脚本可能会卡住。  
  （已修复。解决方案：以不加载图片的模式启动浏览器）

3. 如果窗口太小，可能获取不到页面元素，然后报错。  
  （已修复。解决方案：在启动浏览器时调整窗口大小至合适的值，主要是高度）
 
4. 本地重命名的批处理脚本，如果附件有重复的文件，后面的相同的文件不会被重命名。  
  （没想好。临时解决方案：根据控制台输出的记录，搜索文件名，找到发件人昵称或者邮箱，手动重命名）

5. 如果开车的速度过快，会被系统拦下车。提示：【您请求的频率太快，请稍后再试】  
   （没写完。临时解决方案：根据控制台输出的记录，从暂停的地方重新下载）
  
<br>
  
## 踩坑历史
1. 附件收藏中的"全部附件"，并不是想象中真的把全部附件整合在一起，还是会漏掉一些，关键是还不知道漏了哪些。
  （解决方案：换成进入邮件主题下载附件）

