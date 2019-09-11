# 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱上来自各地网友的投稿附件。数量比较多（上千份），如果手动一个一个下载非常麻烦。。。  

而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了。而且也会出现大量重复的命名文件。
这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。  

于是临时研究了一下 Python + selenium + Chrome 来节省很多时间~

---
  
<br>

## 如何安装

- **Python 3**   
  https://www.python.org/
- **WebDriver for Chrome**   
  https://sites.google.com/a/chromium.org/chromedriver/downloads
- **selenium**
  ```
  pip install selenium
  ```
  

<br>
 
## 如何使用


### 1 第一次使用时

初次启用脚本需手动登陆，勾选**下次自动登陆** （记住密码）
以后再启用脚本时就可以实现自动登陆直接进入邮箱主页了。

不嫌麻烦，也可以先运行下面这段脚本来登陆

``` python
from selenium import webdriver

options = webdriver.ChromeOptions()
options.add_argument("user-data-dir=selenium")
chrome = webdriver.Chrome(options=options)

url = 'https://mail.qq.com/'
chrome.get(url)

print('登陆成功！')
```
  
  
> 注：通过运行脚本启动的浏览器窗口，只能同时启动一个。若重复启动脚本将会打开空页面，需要关闭上一个窗口重新运行脚本。
<br>   

### 2 调整每页显示邮件数量 
邮箱默认只显示25条邮件，需要在邮箱设置里，调整每页显示**100**封邮件。

<br>  

### 3 邮箱文件夹
把你想要下载的邮件**移动到**文件夹里，方便区分。
  
<br>
  
### 4 新窗口打开文件夹
从邮箱左侧的面板‘我的文件夹’中找到你刚刚创建的文件夹，**右键-新窗口打开**
  
从浏览器的地址栏找到链接的几个参数: `sid` `folderid` `page`  
```
https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ A }&url=/cgi-bin/mail_list?folderid={ B }%26page={ C }
```
  
<br>
  
### 5 修改脚本里面的自定义参数，然后启动脚本

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

1. 运行脚本时，如果sid过期忘记更换，控制台会报错，提示找不到页面元素。  
   （sid密钥更新的时间通常是一天，也可能更短。所以发现浏览器地址的sid跟脚本中的不一样时，记得更换。）

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

