# encoding:utf-8
import os
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

#......................................................
# 自定义参数
#......................................................
# 先登陆邮箱，找到你想处理的文件夹，右键新窗口打开，在浏览器地址栏可以看到以下地址:
# https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ A }&url=/cgi-bin/mail_list?folderid={ B }%26page={ C }
#
# 需要自定义的参数已在上方链接以 A B C 标记出，然后自己替换下面的参数
#
# A - token['sid']         这串密钥会定时更新，每次使用时需要重新填写。
# B - token['folderid']    文件夹ID
# C - token['page']        邮件列表页数(初始页为0)。如果要下载第2页的邮件，就改为1。
#
#......................................................
token={'sid':'abcdecg', 'folderid':123, 'page':0}


#......................................................
# 附件下载到哪个文件夹。（如果文件夹不存在，会自动创建）
# 注：路径需要以双斜杠 \\ 作为分隔，不是单斜杠 \
#......................................................
download_here='d:\\QQMail\\'


#......................................................
# Debug 模式 （0: 关闭 | 1: 开启）
# 开启DEBUG模式后，只输出列表数据，不下载任何附件。
#......................................................
DEBUG=0

#................................................... ...
# title['index']    第index封邮件，默认为1，不可修改。
# title['start']    从第start封邮件开始，默认为1
# title['end']      到第end封邮件结束，默认为-1
# title['step']     读取邮件次数超过step时结束，默认为-1
#......................................................
title={'index':1, 'start':1, 'step':-1}


#......................................................
# pageInfo['now']     目前在第几页，默认为0，即第1页。
# pageInfo['max']     文件夹共有几页，在第0页时会自动读取。
# pageInfo['step']    希望下载至多少页
# pageInfo['step']    希望下载至多少页
#......................................................
pageInfo={'now':0, 'max':0, 'step':0, 'isfilp':0, 'autofilp':True}


#......................................................
# TODO 还没花时间写完的功能
#......................................................
# for name in title:
#   for key in ignore_keys:
#     if key in name:
#......................................................
# 关键词屏蔽（黑名单）
# ignore_keys 全局关键词，无论在哪里出现都跳过
# ignore_tile_keys 从邮件标题搜索
# ignore_user_keys 从发信人昵称搜索
# ignore_file_keys 从附件文件名搜索
#......................................................
ignore_keys = []
ignore_tile_keys=[]
ignore_user_keys=[]
ignore_file_keys=[]


#......................................................
# 用来测试的其他参数
#......................................................

# 用来计数测试用的，总感觉有时会漏掉一些文件。
test={'fileindex': 0, 'filecount': 0, 'downloadtimes': 0}

# readmail  邮件列表：包含邮件id(value)、时间戳(totime)、发件人邮箱(fa)、发件人昵称(fn)
# filemail  附件列表：包含邮箱、邮件主题、发件人昵称、附件名
# foolmail  没有附件：包含发件人昵称
readmail,filemail,foolmail=[],[],[]

# 邮箱地址
url_qqmail='https://mail.qq.com/'
url_folder=url_qqmail+'cgi-bin/mail_list?sid={}&folderid={}&page={}'.format(token['sid'],token['folderid'],token['page'])

#......................................................
# 检查下载路径是否存在
#......................................................
if not os.path.exists(download_here):
    print("文件夹不存在。正在自动创建文件夹....")
    os.mkdir(download_here)

#......................................................
# 配置Web Driver
#......................................................
options=webdriver.ChromeOptions()
prefs={"download.default_directory":download_here}
options.add_argument('blink-settings=imagesEnabled=false')
options.add_argument('--disable-plugins')
options.add_argument('--disable-gpu')
options.add_argument('--no-sandbox')
options.add_argument("user-data-dir=selenium")
options.add_experimental_option("prefs",prefs)
options.add_argument("--window-size=720,800")
options.add_argument('--ignore-certificate-errors')
chrome=webdriver.Chrome(options=options)

# 启动Web Driver
print(" ")
print(" Chrome启动")
chrome.get(url_qqmail)
chrome.implicitly_wait(2)

#......................................................
# 获取页面信息
#......................................................

while pageInfo['autofilp']:
  chrome.get(url_folder)
  element = chrome.find_element_by_id("mainFrame")
  chrome.switch_to.frame(element)

  if pageInfo['isfilp']==0:
    pageInfo['now']=token['page']+1
    pageInfo['max']=eval(chrome.find_elements_by_class_name("right")[1].find_elements_by_tag_name('script')[0+pageInfo['isfilp']].get_attribute('innerHTML').strip('document.write(').strip(');'))
    print(" ---- 进入文件夹: ",chrome.find_element_by_xpath('//*[@id="qqmail_mailcontainer"]/div[1]').text.strip('管理"我的文件夹"').strip())

  print("当前是第{}/{}页".format(pageInfo['now'],pageInfo['max']))

  #翻页规则
  can_filp_1 = pageInfo['now'] < pageInfo['max']
  can_filp_2 = pageInfo['now'] < pageInfo['step']

  # 获取邮件列表
  elements=chrome.find_elements_by_css_selector('input[name="mailid"]')

  for e in elements[1:]:
    try:
      if title['index'] >= title['start']:
        # check = (false, true)[num == -1]
        check_step = (title['index']-title['start'] < title['step'],True)[title['step'] == -1]

        if check_step:
          sender={}
          sender.update({'timestamp': e.get_attribute('totime')})
          sender.update({'name': e.get_attribute('fn')})
          sender.update({'email': e.get_attribute('fa')})
          sender.update({'id': e.get_attribute('value')})
          sender.update({'index': title['index']})
          readmail.append(sender)
          print(' ├─{} {}'.format(title['index'],sender['name']))
          time.sleep(0.002)

      title['index']+=1
    except Exception as e:
      break

  if can_filp_2:
    pageInfo['isfilp']=1
    pageInfo['now']+=1
    url_folder=url_qqmail+'cgi-bin/mail_list?sid={}&folderid={}&page={}'.format(token['sid'],token['folderid'],pageInfo['now']-1)
  else:
    pageInfo['autofilp']=False

#......................................................
# 开始处理附件
#......................................................

time.sleep(0.125)
#os.system('cls')
print("\n")
print(" ---------------------------------------")
print(' 邮件主题({})'.format(title['index']-1))
print(" ---------------------------------------")
print(" ")
print(" 开始处理附件")

# 获取每封邮件的附件列表
for key in readmail:
  time.sleep(0.125)
  url=url_qqmail+'cgi-bin/frame_html?sid={}&url=/cgi-bin/readmail?mailid={}'.format(token['sid'],key['id'])
  chrome.get(url)

  try:
    chrome.switch_to.default_content()
    chrome.find_element_by_id("mainFrame")
  except Exception as e:
    print("您请求的频率太快，请稍后再试")
    os.system('pause')
    chrome.get(url)

  chrome.switch_to.default_content()
  chrome.switch_to.frame(chrome.find_element_by_id("mainFrame"))
  elements=chrome.find_elements_by_class_name("name_big")

  isFool=len(elements)<=0  #没有附件
  print(' ├─{} {} {}'.format(key['index'],key['name'],(key['email'], '(没有附件)')[isFool]))

  if isFool:
      foolmail.append(key['name'])
      mark_star=chrome.find_element_by_id("img_star")
      if mark_star.get_attribute("class") == 'qm_ico_flagoff':
          mark_star.send_keys(Keys.SPACE)
      continue

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
        time.sleep(0.625)

    time.sleep(0.542)

print(' └─Emailecount:{}    Foolcount:{}    filecount:{}    downloadtimes:{}'.format(len(readmail), len(foolmail), test['filecount'],test['downloadtimes']))
