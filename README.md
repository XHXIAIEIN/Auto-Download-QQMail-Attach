# 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱上来自各地网友的投稿附件。数量比较多，如果手动一个一个下载很麻烦，而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了。这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。

于是临时研究了一下 Python + selenium + Chrome 来节省很多时间~

---
  
  

## 如何安装

- **Python 3** 
  https://www.python.org/
- **WebDriver for Chrome** 
  https://sites.google.com/a/chromium.org/chromedriver/downloads
- **selenium**
  ```
  pip install selenium
  ```
  
  
  
  
## 如何使用

### 1 第一次使用时
初次启用脚本需手动登陆，勾选下次自动登陆。下次再启用脚本就可以实现自动登陆直接进入邮箱主页了。

不嫌麻烦的话，也可以先运行下面这段脚本来登陆

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
  
  
  
### 2 调整每页显示邮件数量 
邮箱默认只显示25条邮件，需要在邮箱设置里，调整每页显示100封邮件。
  
  
  
### 3 邮箱文件夹
把你想要下载的邮件**移动到**文件夹里，方便区分。
  
  
  
### 4 新窗口打开文件夹
从邮箱左侧的面板‘我的文件夹’中找到你刚刚创建的文件夹，**右键-新窗口打开**
  
从浏览器的地址栏找到链接的几个参数: `sid` `folderid` `page`  
```
https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ A }&url=/cgi-bin/mail_list?folderid={ B }%26page={ C }
```
  
  
  
### 5 修改脚本里面的自定义参数
  
``` python
# encoding:utf-8
import os
import urllib
import _thread
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

#......................................................
# 自定义参数
#......................................................
# 登陆邮箱后，找到你想打开的文件夹，右键新窗口打开，在浏览器地址栏可以看到以下地址:
# https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ A }&url=/cgi-bin/mail_list?folderid={ B }%26page={ C }
#
# 需要自定义的参数已在上方链接以 A B C 标记出
# A - token['sid']         相当于临时身份认证。这串密钥会定时更新，每次使用时需要重新填写。
# B - token['folderid']    文件夹ID
# C - token['page']        邮件列表页数(初始页为0)
#......................................................
token={'sid':'这里填写你的sid', 'folderid':135, 'page':0 }

# 附件下载到哪个文件夹（需提前新建文件夹，不然会报错）
download_here='D:\\Downloads\\email'

#......................................................
# 用来测试的其他参数
#......................................................

# 开启DEBUG模式后，只输出列表数据，不下载任何附件。（0: 关闭 | 1: 开启）
DEBUG=0

#......................................................
# title['index']    第index封邮件
# title['start']    从第start封邮件开始
# title['end']      到第end封邮件结束，默认为-1。
# title['step']     读取邮件次数超过step时结束，默认为-1
#......................................................
title={'index':0, 'start':1, 'end':-1, 'step':-1}


# 用来计数测试用的，总感觉有时会漏掉一些文件。
test={'fileindex': 0, 'filecount': 0, 'downloadtimes': 0}

# readmail  邮件列表：包含邮件id(value)、时间戳(totime)、发件人邮箱(fa)、发件人昵称(fn)
# filemail  附件列表：包含邮箱、邮件主题、发件人昵称、附件名
# foolmail  没有附件：包含发件人昵称
readmail,filemail,foolmail=[],[],[]


#......................................................
# 配置Web Driver
#......................................................
options=webdriver.ChromeOptions()
prefs={"profile.managed_default_content_settings.images":2,"download.default_directory":download_here}
options.add_argument("user-data-dir=selenium")
options.add_experimental_option("prefs",prefs)
options.add_argument("--window-size=800,600")
options.add_argument('--ignore-certificate-errors')
chrome=webdriver.Chrome(options=options)

url_qqmail='https://mail.qq.com/'
url_folder=url_qqmail+'cgi-bin/mail_list?sid={}&folderid={}&page={}'.format(token['sid'],token['folderid'],token['page'])

# 启动Web Driver
print(" ")
print(" Chrome启动")
chrome.get(url_qqmail)
chrome.implicitly_wait(3)

# 进入文件夹
chrome.get(url_folder)
chrome.switch_to.frame(chrome.find_element_by_id("mainFrame"))
print(" ---- 进入文件夹: ",chrome.find_element_by_xpath('//*[@id="qqmail_mailcontainer"]/div[1]').text.strip('管理"我的文件夹"').strip())
chrome.implicitly_wait(3)

#......................................................
# 开始处理邮件
#......................................................
print(" 获取邮件列表")
elements=chrome.find_elements_by_css_selector('input[name="mailid"]')

# 获取邮件列表
for e in elements:
    if title['index'] >= title['start']:
        # check = (false, true)[num == -1] // if (num == -1) TRUE else FALSE
        check_end  = (title['index'] <= title['end'],title['index'] <= len(elements))[title['end'] == -1]
        check_step = (title['index']-title['start'] < title['step'],True)[title['step'] == -1]

        if check_end and check_step:
          sender={}
          sender.update({'timestamp': e.get_attribute('totime')})
          sender.update({'name': e.get_attribute('fn')})
          sender.update({'email': e.get_attribute('fa')})
          sender.update({'id': e.get_attribute('value')})
          sender.update({'index': title['index']})
          readmail.append(sender)
          print(' ├─{} {}'.format(title['index'],sender['name']))
          time.sleep(1)

    title['index']+=1

time.sleep(1.5)
os.system('cls')
print(" ")
print(' 邮件主题({})'.format(title['index']-1))
print(" 开始处理邮件")

# 获取每封邮件的附件列表
for key in readmail:
    url=url_qqmail+'cgi-bin/frame_html?sid={}&url=/cgi-bin/readmail?mailid={}'.format(token['sid'],key['id'])
    chrome.get(url)
    chrome.switch_to.default_content()
    chrome.switch_to.frame(chrome.find_element_by_id("mainFrame"))

    title=chrome.find_element_by_id("subject").text
    elements=chrome.find_elements_by_class_name("name_big")
    isFool=len(elements)<=0

    print(' ├─{} {} {}'.format(key['index'],key['name'],('', '(没有附件)')[isFool]))
    
    if isFool:
        foolmail.append(key['name'])
        mark_star=chrome.find_element_by_id("img_star")
        if mark_star.get_attribute("class") == 'qm_ico_flagoff':
            mark_star.send_keys(Keys.SPACE)
        continue
    
    for f in elements:
        attach={}
        attach.update({'title': title})
        attach.update({'name': key['name']})
        attach.update({'email': key['email']})
        attach.update({'filename': f.find_element_by_css_selector('span:nth-child(1)').text})
        filemail.append(attach)
        test['filecount']+=1
        print(" │  ├─{}".format(attach['filename']))

    if DEBUG != 1:
        os.chdir(download_here)
        cmd=open("_ren.bat","a")
        cmd.seek(0)
        cmd.truncate()
        cmd.write("@echo off")
        cmd.write("\n")

        for key in filemail:
            cmd.write('ren "{}" "{}-{}"'.format(key['filename'], key['email'], key['filename']))
            cmd.write("\n")

        cmd.write("del _ren.bat")
        cmd.close()

    if DEBUG != 1:
        elements=chrome.find_elements_by_link_text('下载')
        for e in elements:
            e.click()
            test['downloadtimes']+=1
            time.sleep(2)

print(' └─Emailecount:{}    Foolcount:{}    filecount:{}    downloadtimes:{}'.format(len(readmail), len(foolmail), test['filecount'],test['downloadtimes']))
```
  
  
  
## 特性
1. 可以自定义文件下载路径夹
2. 可以自定义脚本从第几封邮件开始，到第几封邮件结束，或者只处理多少封邮件。
3. 如果邮件中没有包含附件，会自动打星标。
4. 脚本结束后会生成一个批处理程序，运行后会自动为附件重命名。命名规则是在文件名前面添加'发件人邮箱'
  
  
  
## 可能出现的BUG

1. 如果网络不稳定。附件的预览图如果没有加载出来，脚本可能会卡住。  
  （已修复。解决方案：以不加载图片的模式启动浏览器）
 
2. 本地重命名的批处理脚本，如果附件有重复的文件，后面的相同的文件不会被重命名。  
  （没想好。临时解决方案：根据控制台输出的记录，搜索文件名，找到发件人昵称或者邮箱，手动重命名）
  
  
  
  
## 踩坑历史
1. 附件收藏中的"全部附件"，并不是想象中真的把全部附件整合在一起，还是会漏掉一些，关键是还不知道漏了哪些。
  （解决方案：换成进入邮件主题下载附件）

