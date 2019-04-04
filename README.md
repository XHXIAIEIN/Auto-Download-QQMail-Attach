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
# encoding:utf-8
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

``` python
# encoding:utf-8
import os
import urllib
import _thread
import time
from selenium import webdriver

#......................................................
# 自定义参数
#......................................................
# 登陆邮箱后，找到你想打开的文件夹，右键新窗口打开，在浏览器地址栏可以看到以下地址:
# https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ A }&url=/cgi-bin/mail_list?folderid={ B }%26page={ C }
#
# 需要自定义的参数已在上方链接以 A B C 标记出
# A - token['sid']         相当于临时身份认证。这串密钥似乎会每天更新，每次使用时需要重新填写。
# B - token['folderid']    文件夹的ID
# C - token['page']        邮件列表页数
#......................................................
token={'sid':'R6-CnEyUYkXOuAy', 'folderid':135, 'page':0 }

#......................................................
# title['index']    第index封邮件
# title['start']    从第start封邮件开始
# title['end']      到第end封邮件结束，-1为默认列表长度
# title['step']     读取邮件次数超过step时结束，-1为默认列表长度
#......................................................
title={'index':0, 'start':1, 'end':-1, 'step':-1}


# 附件下载到哪个文件夹（需提前新建文件夹，不然会报错）
download_here='D:\\Downloads\\email'

#......................................................
# 用来测试的一些参数
#......................................................

# 开启DEBUG模式后，只输出列表数据，不下载任何附件。（0: 关闭 | 1: 开启）
DEBUG=0

# 用来计数测试用的，总感觉有时会漏掉一些文件。
test={'fileindex': 0, 'filecount': 0, 'downloadtimes': 0}

# readmail  邮件列表：包含邮件id(value)、时间戳(totime)、发件人邮箱(fa)、发件人昵称(fn)
# filemail  附件列表：包含邮箱、邮件主题、发件人昵称、附件名
readmail,filemail=[],[]

#......................................................
# 配置Web Driver
#......................................................
prefs={"download.default_directory":download_here}
options=webdriver.ChromeOptions()
options.add_argument("user-data-dir=selenium")
options.add_argument("Referrer-Policy=no-referrer")
options.add_experimental_option("prefs",prefs)
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
        # check = (false, true)[a == -1]
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
          time.sleep(0.1)

    title['index']+=1

time.sleep(1.5)
os.system('cls')
print(" ")
print(' 邮件主题({})'.format(title['index']-1))
print(" 开始处理邮件")

# 获取每封邮件的附件列表
for key in readmail:
    url=url_qqmail+'cgi-bin/frame_html?sid={}&url=/cgi-bin/readmail?mailid={}'.format(token['sid'],key['id'])
    url=urllib.parse.unquote(url)
    chrome.implicitly_wait(3)
    chrome.get(url)
    chrome.switch_to.default_content()
    chrome.switch_to.frame(chrome.find_element_by_id("mainFrame"))

    elements=chrome.find_elements_by_class_name("name_big")
    print(' ├─{} {}'.format(key['index'],key['name']))

    for f in elements:
        attach={}
        attach.update({'title': chrome.find_element_by_id("subject").text})
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


print(' └─filecount:{}    downloadtimes:{}'.format(test['filecount'],test['downloadtimes']))
```
---


## 可能出现的BUG
1. 如果网络不稳定。附件的预览图如果没有加载出来，脚本可能会卡住。
  （解决方案：刷新页面，直到附件预览图加载出来，可能需要多刷新几次）
 
2. 本地重命名的批处理脚本，如果附件有重复的文件，后面的相同的文件不会被重命名。
   （解决方案：可以根据控制台输出的记录，搜索文件名，找到发件人昵称或者邮箱，手动重命名）
 

## 踩坑历史
1. 附件收藏中的"全部附件"，并不是想象中真的把全部附件整合在一起，偶尔还是会漏掉一些。（修复：换成进入邮件主题下载附件）

 
 
