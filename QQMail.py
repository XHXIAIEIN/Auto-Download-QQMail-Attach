# -*- coding: UTF-8 -*-
from helium import *
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.action_chains import ActionChains
import math,time,os,re,codecs,shutil,hashlib,filecmp
import prettytable
 
#===============================================================================
# * 声明
#===============================================================================
# 作者：XHXIAIEIN
# 更新：2020/12/10
# 主页：https://github.com/XHXIAIEIN/Auto-Download-QQEmail-File
#===============================================================================

#===============================================================================
# * 如何安装
#===============================================================================

#...............................................................................
#  0. 必要的运行库
#...............................................................................
#  python3    :   https://www.python.org/
#  Nodejs     :   https://nodejs.org/zh-cn/
#...............................................................................

#...............................................................................
#  1. WebDriver for Chrome
#...............................................................................
#  使用前检查Chrome与chromedriver版本是否一致，若Chrome有更新，请更新chromedriver
#  https://sites.google.com/a/chromium.org/chromedriver/downloads
#
#  注意，还需要将 chromedriver 的路径放进系统环境变量PATH里面
#  MAC用户："/usr/local/bin/chromedriver"
#...............................................................................

#...............................................................................
#  2.脚本中使用到的工具库
#...............................................................................
#  - helium         :    https://selenium-python-helium.readthedocs.io/
#  - prettytable    :    https://pypi.org/project/prettytable/
#...............................................................................
#  运行后如果提示缺少xxx，请运行 cmd 在控制台执行 pip install xxx
#...............................................................................
#  Windows用户，安装 python 和 NodeJs 之后，运行 cmd 在控制台输入以下指令：
#  python -m pip install --upgrade pip
#  pip install helium
#  pip install prettytable
#...............................................................................
#  MAC用户，安装brew后，在终端输入以下指令：
#  brew install chromedriver
#  brew install selenium
#  brew install helium
#  brew install prettytable
#...............................................................................


#===============================================================================
# * 使用提示
#===============================================================================

#...............................................................................
#  运行脚本后，会开启一个浏览器窗口。
#  
#  如果它不会马上跳转到QQ邮箱的主页，或者在主页等待了很长时间(>5秒)。
#  可能需要在浏览器按一次Esc键，才会从浏览器主页跳转到QQ邮箱。原因不明。
#...............................................................................


'''
#===============================================================================
#  自定义参数
#===============================================================================
'''
 
# 是否为Mac用户。如果是，请改为 1
is_mac_user = 0
 
#...............................................................................
#  QQ账号
#...............................................................................
# 如果你登陆了相同QQ账号的客户端，会自动帮你点击快速登录的头像。否则填写账号密码
#...............................................................................
 
QQNUMBER="132465798"
PASSWORD="132465798"
 
#...............................................................................
# 附件下载到哪个文件夹。
#...............................................................................
# 
# 若文件夹不存在，会自动创建。但仅处理1层路径。
#
# 注：Win用户用 '\\' 作为路径分隔符。如："d:\\download\\email"
#     Mac用户用 '/' 作为路径分隔符。如："~/Downloads/email"
#...............................................................................
 
ROOTPATH = "D:\\Downloads\\2020"
DOWNLOAD_FOLDER = os.path.join(ROOTPATH,"download")     # 附件实际下载目录
USERDATA_FOLDER = os.path.join(ROOTPATH,"selenium")     # 浏览器的缓存数据
 
#...............................................................................
#  要下载的邮箱文件夹ID
#...............................................................................
#  展开左侧面板[我的文件夹]列表，找到你想下载的文件夹，右键-新窗口打开。
#  浏览器地址栏会出现一个参数 folderid ，是一个数字，如123, 198, 201。首页收件箱的序号是 0
#  mail.qq.com/cgi-bin/frame_html?t=frame_html&sid=x&url=/cgi-bin/mail_list?folderid={ A }%26page=0
#...............................................................................
 
FOLDERID = 200

#-------------------------------------------------------------------------------
# 指定下载计划。
#-------------------------------------------------------------------------------
#  start:     从列表第n个开始。（包含n，即列表第一个就是n。）默认值：1
#  end:       在列表第n个结束。（包含n，即列表最后一个是n。）默认值：-1
#  step:      从开始计算，累计n个结束。（包含start，即列表最终有n个）默认值：0
#  autoNext:  是否允许翻页。允许：1  /  禁用：0
#-------------------------------------------------------------------------------
 
# 邮件列表
Title_Task = { 'start':1, 'step':0, 'end': 0 }
 
# 翻页规则
Pages_Task = { 'start':1, 'step':0, 'end':0, 'autoNext': 1 }

 
#...............................................................................
# 邮件主题，关键词过滤
#...............................................................................
 
# 黑名单关键词。忽略邮件主题中包含任意一个关键词的邮件。
# 示例：title_blacklist_keys = ['发信方已撤回邮件','QQ会员业务通知邮件']
title_blacklist_keys = ['发信方已撤回邮件']

# 白名单关键词。只搜索邮件主题中包含任意一个关键词的邮件。
# 示例：title_whitelist_keys = ['反馈','回复']
title_whitelist_keys = ['']
 
#...............................................................................
# 附件过滤
#...............................................................................
 
# 文件类型黑名单。忽略指定类型的文件。不包含'.'
# 示例：attach_blacklist_filetype = ['psd','txt']
attach_blacklist_filetype = ['']
 
# 文件类型白名单。只有指定类型的文件允许下载。不包含'.'
attach_whitelist_filetype = ['']
 
#-------------------------------------------------------------------------------
# Config
#-------------------------------------------------------------------------------
# 禁用: 0       |     启用:  1
#-------------------------------------------------------------------------------
 
# 是否禁止显示网页图片。
# 首次登录时，需要开启显示图片功能，否则无法进行滑块安全验证。
# 登录时，勾选"下次自动登录"，下次就可以手动开启禁用图片了。
can_disabled_images = 0
 
#···············································································
# 下载
#···············································································
 
# 是否需要下载附件
can_download_file = 1
 
# 是否重命名文件
can_rename_file = 0
 
# 是否按邮件创建文件夹
can_move_folder = 1
 
# 是否根据投稿时间顺序下载附件。：即从最后一页往前下载。
can_reverse_list = 0
 
# 下载前，检测文件是否存在，若已存在则跳过 / 继续下载。
# 若继续下载，新下载的文件名可能会自动被加上（1）这样的序号。
# 检测方式：对比文件名以及文件大小是否相同。
ready_download_but_file_exists = 'skip' or 'continue'
 
#···············································································
# 星标 / 标签
#···············································································
 
# 没有附件的邮件设为星标
can_star_nofile = 1
 
# 过期附件的邮件设为星标
can_star_timeoutfile = 0
 
# 没有附件添加标签
can_tag_nofile = 1
str_tag_nofile = '没有附件'
 
# 过期附件添加标签
can_tag_timeoutfile = 1
str_tag_timeoutfile = '过期附件'
 
#···············································································
# 控制台信息
#···············································································
 
# 是否在控制台打印邮件信息
can_print_title = 1
can_print_attch = 1
can_print_folder = 0

# 是否在控制台打印统计表格
can_print_title_table = 1
 
# 是否将数据导出为CSV文件
can_export_titledata_to_csv = 1
can_export_attchdata_to_csv = 1
 
#···············································································
# 高级选项
#···············································································
 
# 是否需要读取标题、邮件
can_load_title = 1
can_load_email = 1
 
# 下载等待时长(单位：秒)。超过时长后则放弃后续操作，如移动文件夹或重命名。
downloading_timeout = 300
 
# 是否需要设置 desired_capabilities 参数
can_set_capabilities = 1
config_timeout_pageLoad = 10000
config_timeout_script = 1500
 
#-------------------------------------------------------------------------------
# 重命名模板。 
# 如果需要添加或更改，请到代码区搜索 "rule" 
#-------------------------------------------------------------------------------
# filename1       附件原始的文件名(不包含扩展名）          例: 简历
# filename2       附件原始的文件名(包含扩展名）            例: 简历.pdf
#-------------------------------------------------------------------------------
# extension1      附件原始的扩展名(包含.)                  例: .jpg  .txt  .pdf
# extension2      附件原始的扩展名(不包含.)                例:  jpg   txt   pdf
#-------------------------------------------------------------------------------
# attchindex      当前附件是目前下载的第几个附件（不包含过期附件）     例:  1
# titleindex      当前邮件在本次下载程序的顺序 (从1开始计数)           例:  1
# attchtitleindex 当前附件在本篇邮件中的附件顺序 (从1开始计数)         例:  1
#-------------------------------------------------------------------------------
# titlecount     本次下载程序共有多少邮件，即当前文件夹的邮件总数      例:  0
# attchcount     本次下载程序已统计附件的数量（包含过期附件）          例:  0
#-------------------------------------------------------------------------------
# nameid         发信方的邮箱昵称                      例:  小明
# address        发信方的邮箱地址                      例:  123456@qq.com
# emailid        发信方的邮箱ID                        例:  123456
#-------------------------------------------------------------------------------
# year           发送时间：年        %Y                例:  2020
# month          发送时间：月        %m                例:  12
# day            发送时间：日        %d                例:  07
#-------------------------------------------------------------------------------
# week           发送时间：周        %a                例:  Mon 
# ampm           发送时间：上/下午   %p                例:  AM
#-------------------------------------------------------------------------------
# hours          发送时间：时        %H                例:  14 
# minutes        发送时间：分        %M                例:  30 
# seconds        发送时间：秒        %S                例:  59 
#-------------------------------------------------------------------------------
# time1          发送时间：格式化    %H%M              例:  1430
# time2          发送时间：格式化    %H'%M'%S          例:  14'30'59
#-------------------------------------------------------------------------------
# date1          发送时间：格式化    %m%d              例: 1207
# date2          发送时间：格式化    %Y%m%d            例: 20201207
# date3          发送时间：格式化    %Y-%m-%d          例: 2020-12-07
# date4          发送时间：格式化    %Y%m%d_%H'%M'%S   例: 2020-12-07_14'30'59
#-------------------------------------------------------------------------------
 
# 重命名规则
# 123456@qq.com_20201104_1430'59_file.jpg
rule_rename = "address_date4_filename2"
 
# file_1104_0.jpg
# rule_rename = "filename1_date1_titleindex.extension1"
 
# 文件夹
# 123456@qq.com(20201104_1430'59)
rule_folder = "address(date4)"
  
'''
#===============================================================================
#                 " 请 勿 跨 过 这 块 区 域 修 改 内 容 "
#===============================================================================
'''
#-------------------------------------------------------------------------------
# print color
#-------------------------------------------------------------------------------
  
class C:
  END       =  '\033[0m'    # 白色
  UNLINK    =  '\033[4m'    # 下划线
  LINK      =  '\033[9m'    # 删除线
  GREY      =  '\033[2m'    # 灰色
  GOLD      =  '\033[33m'   # 金色
  BLUE      =  '\033[36m'   # 蓝色
  RED       =  '\033[91m'   # 红色
  GREEN     =  '\033[92m'   # 绿色
  SILVER    =  '\033[90m'   # 灰色
  BGWHITE   =  '\033[7m'    # 白底黑字
  BGRED     =  '\033[41m'   # 红底白字
  BGGREEN   =  '\033[42m'   # 绿底白字
  BGBLUE    =  '\033[44m'   # 蓝底白字
  BGPURPLE  =  '\033[45m'   # 紫底白字
  FLASHANI  =  '\033[5m'    # 闪烁白灰
  
#-------------------------------------------------------------------------------
# thread
#-------------------------------------------------------------------------------
  
def thread_webdriver():
  
  folderslist, titlelist, attchlist = [],[],[]
  token_page, title_count, attach_count, timeout_count, viewpagetitle = 0,0,0,0,25
  token_sid = ''
   
  script_start_time = time.strftime("%Y-%m-%d-%H'%M'%S",time.localtime(time.time()))
  print(f"任务开始：{script_start_time}")

  #---------------------------------------------------------------------------
  # WebDriver
  #---------------------------------------------------------------------------
  
  options = ChromeOptions()
  
  prefs = {
      "download.directory_upgrade": True,
      "download.prompt_for_download": "false",
      'profile.default_content_settings.multiple-automatic-downloads': 1,
      "download.default_directory": DOWNLOAD_FOLDER
  }
  
  options.add_experimental_option("prefs", prefs)
  options.add_argument("--dns-prefetch-disable")
  options.add_argument("--window-size=1000,1200")
  options.add_argument("--disable-gpu")
  options.add_argument("--no-sandbox")
  
  # 禁止网页显示图片
  if bool(can_disabled_images):
    options.add_argument("--blink-settings=imagesEnabled=false")      
  
  # 如果无法启动，请检查环境变量 PATH 是否正确填写了 chromedriver 的路径。
  if bool(is_mac_user):
    options.add_argument(f'--user-data-dir {USERDATA_FOLDER}')    
  else:
    options.add_argument(f'--user-data-dir={USERDATA_FOLDER}')
  
  try:
    chrome = start_chrome(options=options)
  except:
    print(f"{C.RED}无法打开浏览器。检查是否已运行了另一个脚本。{C.END}")
    os.system("PAUSE");C
  
  # desired_capabilities
  if bool(can_set_capabilities):
    chrome.desired_capabilities["pageLoadStrategy"] = "none"
    chrome.desired_capabilities['timeouts']['pageLoad'] = config_timeout_pageLoad or 10000
    chrome.desired_capabilities['timeouts']['script'] = config_timeout_script or 1500
  
  go_to("https://mail.qq.com")
  
  #---------------------------------------------------------------------------
  # login
  #---------------------------------------------------------------------------
  
  if S('#login_frame').exists:
    while S(".login_container").exists():
      if S("login_wx_iframe").exists(): click(Text("QQ登录"))
      if S(f"#img_out_{QQNUMBER}").exists(): click(S('a.face')); time.sleep(2); break;   # 点击头像登陆
      if Link("帐号密码登录").exists(): click(Link("帐号密码登录"))
      write(QQNUMBER, S("#u"))
      write(PASSWORD, S("#p"))
      if S("#p_low_login_enable").web_element.get_attribute("class") == "uncheck": click(S("#p_low_login_enable"))
      click(S("#login_button"))
      
      once = True
      while S("#tcaptcha_iframe").exists():
        if once: print(f"{C.FLASHANI}等待用户手动完成拼图认证...{C.END}"); once = False;
        time.sleep(1)
      
      wait_until(S('#mainFrameContainer').exists)
  
  #---------------------------------------------------------------------------
  # update token
  #---------------------------------------------------------------------------
  
  token_sid = chrome.current_url.split("sid=")[1].split("&")[0]

  #---------------------------------------------------------------------------
  # prettytable 打印好看的表格
  #---------------------------------------------------------------------------

  # 邮件标题
  title_table = prettytable.PrettyTable()
  title_table.field_names = ["index", "page", "name", "title", "email", "timestamp"]
  title_table.align = "l"
  
  # 邮件附件
  attach_table = prettytable.PrettyTable()
  attach_table.field_names = ["count","filename","index","name","title","email","fileindex","filebyte","filetype","page","timeout","timestamp"]
  attach_table.align = "l"
  
  # 过期附件
  attach_timeout_table = prettytable.PrettyTable()
  attach_timeout_table.field_names = ["count","filename","index","name","title","email","fileindex","filebyte","filetype","page","timeout","timestamp"]
  attach_timeout_table.align = "l"
  
  # 标题黑名单
  if title_blacklist_keys != [''] or title_whitelist_keys != ['']:
    title_black_table = prettytable.PrettyTable()
    title_black_table.field_names = ["count","filename","index","name","title","email","fileindex","filebyte","filetype","page","timeout","timestamp"]
    title_black_table.align = "l"
  
  # 附件黑名单
  if attach_blacklist_filetype != [''] or attach_whitelist_filetype != ['']:
    attach_black_table = prettytable.PrettyTable()
    attach_black_table.field_names = ["count","filename","index","name","title","email","fileindex","filebyte","filetype","page","timeout","timestamp"]
    attach_black_table.align = "l"
  
  # 文件夹列表
  if bool(can_print_folder): 
    foldertable = prettytable.PrettyTable()
    foldertable.field_names = ["index", "folderid", "name"]
    foldertable.align = "l"
  
  #---------------------------------------------------------------------------
  # folder list
  #---------------------------------------------------------------------------
  
  # 获取文件夹列表
  if bool(can_print_folder): 

    # 展开文件夹列表
    chrome.execute_script("showFolders('personal', true)")
    wait_until(lambda: S("#personalfoldersDiv > ul#personalfolders").exists())
    
    for i, e in enumerate([find_all(S("#personalfolders > li > a"))][0], start=1):
      aid = e.web_element.get_attribute('id').split('_')[1]
      atl = e.web_element.get_attribute('title')
      folderslist.append({'index':f"{i:02}", 'id':int(aid), 'name':re.sub(r'未读邮件(.*?)封','',atl)})
    
    chrome.execute_script("showFolders('personal', false)")
    wait_until(S('#tagfoldersDiv').exists)
    
    for a in folderslist: foldertable.add_row([a['index'], a['id'], a['name']])
    print(foldertable)
  
  #---------------------------------------------------------------------------
  # tag list
  #---------------------------------------------------------------------------
  
  # 获取标签列表
  if bool(can_tag_nofile) or bool(can_tag_timeoutfile): 
    # 展开标签列表
    chrome.execute_script("showFolders('tag', true)")
    wait_until(lambda: S("#tagfoldersDiv > ul#tagfolders").exists())
    
    tags = [re.sub(r' 未读邮件(.*?)封','',tag.web_element.get_attribute('title')) for tag in find_all(S('#tagfolders > li > a'))]
    
    if bool(can_tag_nofile) and bool(str_tag_nofile) and str_tag_nofile not in tags:
        print(f"{C.BLUE}[新增标签]{C.END} 用于标记不包含附件邮件的 '{C.GREEN}{str_tag_nofile}{C.END}' 标签不存在，将自动新建。")
        rightclick(S('#folder_tag'))
        wait_until(S('#tag_QMMenu').exists)
        click(S('#tag_QMMenu__menuitem_createtag'))
        wait_until(S('#QMconfirm_QMDialog').exists)
        write(f'{str_tag_nofile}', S("#QMconfirm_QMDialog_txt"))
        click(S('#QMconfirm_QMDialog_confirm'))
    
    if bool(can_tag_timeoutfile) and bool(str_tag_timeoutfile) and str_tag_timeoutfile not in tags:
        print(f"{C.BLUE}[新增标签]{C.END} 用于标记包含过期附件邮件的 '{C.GREEN}{str_tag_timeoutfile}{C.END}' 标签不存在，将自动新建。")
        rightclick(S('#folder_tag'))
        wait_until(S('#tag_QMMenu').exists)
        click(S('#tag_QMMenu__menuitem_createtag'))
        wait_until(S('#QMconfirm_QMDialog').exists)
        write(f'{str_tag_timeoutfile}', S("#QMconfirm_QMDialog_txt"))
        click(S('#QMconfirm_QMDialog_confirm'))
    
    chrome.execute_script("showFolders('tag', false)")

  #---------------------------------------------------------------------------
  # mail
  #---------------------------------------------------------------------------
  
  # 进入目标文件夹
  go_to(f"https://mail.qq.com/cgi-bin/mail_list?folderid={FOLDERID}&page={token_page}&sid={token_sid}&nocheckframe=true")
  time.sleep(1)
  wait_until(S('#_ut_c').exists)
  
  # 读取文件夹名称、总邮件数
  folder_name = chrome.title.split(" - ")[1]
  folder_title_count = int(S('#_ut_c').web_element.text)
  print(f"{C.GOLD}[进入文件夹] {folder_name} (共 {folder_title_count} 封){C.END}")
  
  # 读取当前页数
  currentpage = int(S('#frm > div > .right').web_element.text.split('/')[0])
  thelastpage = int(S('#frm > div > .right').web_element.text.split('/')[1].split(' 页')[0])
  
  # 分析每页显示多少封邮件
  scroll_down(S('#frm').height)
  viewpagetitle = len(find_all(S('u.tt')))

  #---------------------------------------------------------------------------
  # Pages_Task
  #---------------------------------------------------------------------------
  
  # Pages_Task
  if Pages_Task['start'] > Pages_Task['end'] > 1:
      print(f"Pages_Task:{C.UNLINK}{Pages_Task}{C.END}")
      print(f"{C.BGPURPLE}[参数异常]{C.END} Pages_Task start 不能大于 end ")
      if Pages_Task['step'] >= 1: 
        Pages_Task['end'] = -1
        print(f"{C.GREEN}[自动修正]{C.END} Pages_Task[end] = {C.GREEN}{Pages_Task['end']}{C.END}")
      else:
        Pages_Task['start'] = 1
        print(f"{C.GREEN}[自动修正]{C.END} Pages_Task[start] = {C.GREEN}{Pages_Task['end']}{C.END}")
  
  # Title_Task
  if Pages_Task['start'] > 1 and Title_Task['start'] < (Pages_Task['start'] * viewpagetitle):
    print(f"Pages_Task:{C.UNLINK}{Pages_Task}{C.END}")
    print(f'Title_Task:{C.UNLINK}{Title_Task}{C.END}')
    print(f"{C.BGPURPLE}[参数异常]{C.END} Title_Task[start] 不能小于 {C.GREEN}{Pages_Task['start'] * viewpagetitle}{C.END} ({Pages_Task['start']} * {viewpagetitle})")
    Title_Task['start'] = (Pages_Task['start'] - 1) * viewpagetitle + 1 if Title_Task['step'] > 1 else 1
    print(f"{C.GREEN}[自动修正]{C.END} Title_Task[start] = {Title_Task['start']}")
  
  # 计算任务计划从第几页开始
  if Pages_Task['start'] >= 1 and Title_Task['start'] < (Pages_Task['start'] * viewpagetitle): 
      token_page = max(1, Pages_Task['start'])-1
      print(f"{C.GREEN}[自动修正]{C.END} Pages_Task[start] = {Pages_Task['start']}\t{C.GOLD}即将跳转至第{token_page+1}页。{C.END}")
  elif Pages_Task['start'] >= 1 and Title_Task['start'] >= viewpagetitle:
      token_page = max(1, math.ceil(Title_Task['start']/viewpagetitle))-1
      print(f"{C.GREEN}[自动修正]{C.END} Title_Task[start] = {Pages_Task['start']}\t第 {Title_Task['start']} 封邮件位于第 {token_page+1} 页 (当前每页显示 {viewpagetitle} 封)")
  else:
      token_page = 0
  
  # 跳转到目标页数
  if token_page >= 1:
      title_count = token_page * viewpagetitle
      go_to(f"https://mail.qq.com/cgi-bin/mail_list?folderid={FOLDERID}&page={token_page}&sid={token_sid}&nocheckframe=true")
  
  #---------------------------------------------------------------------------
  # title
  #---------------------------------------------------------------------------
  
  can_next_page = 1
  
  # 读取标题列表
  while bool(can_next_page) and token_page < thelastpage:
      
    # 读取当前页数
    currentpage = int(S('#frm > div > .right').web_element.text.split('/')[0])
    print(f"\n{C.BGWHITE} ▷ {folder_name} {currentpage} / {thelastpage}{C.END} ")
    
    # 读取当前页面所有标题名称
    namelist = [item.web_element.text for item in find_all(S('u.tt'))]
    maillist = find_all(S('input[name="mailid"]'))
    
    # 倒序下载
    if bool(can_reverse_list):
       maillist = maillist[::-1]
    
    if bool(can_load_title):
        for i, e in enumerate(maillist, start=0):
            
            # 标题黑名单
            if title_blacklist_keys != [''] and any([key in namelist[i] for key in title_blacklist_keys]): 
                print(f"{C.GREY}[黑名单] 邮件标题包含黑名单关键词，已跳过：{namelist[i]}{C.END}")
                title_black_table.add_row([title["index"], title["page"], title["name"], title["title"], title["email"], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
                continue
            
            # 标题白名单
            if title_whitelist_keys != [''] and not all([key in namelist[i] for key in title_whitelist_keys]): 
                print(f"{C.SILVER}[白名单] 邮件标题不包含白名单关键词，已跳过：{namelist[i]}{C.END}")
                title_black_table.add_row([title["index"], title["page"], title["name"], title["title"], title["email"], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
                continue
            
            title_count += 1
            
            # Title_Task['start']
            if Title_Task['start'] > 1 and title_count < Title_Task['start']:
                print(f"{C.GREY}[Title_Task: start] 跳过。{title_count} / {Title_Task['start']}{C.END}")
                continue
            
            # Title_Task['end']
            if Title_Task['end'] >= 1 and title_count > Title_Task['end']:
                print(f"{C.BGPURPLE}[Title_Task: end]{C.END} 任务结束。{Title_Task['start']} / {Title_Task['end']}")
                can_next_page = 0
                break
            
            # Title_Task['step']
            if Title_Task['step'] >= 1 and title_count >= Title_Task['start'] + Title_Task['step']:
                print(f"{C.BGPURPLE}[Title_Task: step]{C.END} 任务结束。{Title_Task['start']}(+{Title_Task['step']}) -> {title_count-1}")
                can_next_page = 0
                break
            
            title = {}
            title.update({"index":f"{title_count:04}"})
            title.update({"page":currentpage})
            title.update({"name":e.web_element.get_attribute('fn')})
            title.update({"email":e.web_element.get_attribute('fa')})
            title.update({"mailid":e.web_element.get_attribute("value")})
            title.update({"timestamp":time.localtime(float(int(e.web_element.get_attribute('totime'))/1000))})
            title.update({"title":namelist[i]})
            titlelist.append(title)
            title_table.add_row([title["index"], title["page"], title["name"], title["title"], title["email"], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            
            # 是否需要打印到控制台
            if bool(can_print_title):
                print(f"+ {title['index']}: {title['page']}\t{title['email']:<24}\t{title['name']:<24}\t{title['title']}")
            
    # Pages_Task['autoNext']
    if not bool(Pages_Task['autoNext']):
        print(f'{C.BGPURPLE}[Pages_Task: autoNext]{C.END} 任务结束。{currentpage} / {thelastpage}')
        break
    
    # Pages_Task['end']
    if Pages_Task['end'] >= 1 and currentpage > Pages_Task['end']:
        print(f'{C.BGPURPLE}[Pages_Task: end]{C.END} 任务结束。{currentpage} / {thelastpage}')
        break
        
    # 是否可以翻页
    if not bool(find_all(S('#nextpage'))): 
        print(f'{C.BGBLUE}翻页到底了{C.END} {currentpage} / {thelastpage}')
        break
    
    # 下一页
    nextpage = int(S('#nextpage').web_element.get_attribute("page"))
    
    # Pages_Task['step']
    if Pages_Task['step'] >= 1 and token_page + Pages_Task['step'] < nextpage:
        print(f"{C.BGPURPLE}[Pages_Task: step]{C.END} 任务结束。{currentpage}({token_page+1} + {Pages_Task['step']}) / {thelastpage}")
        break
    
    go_to(f"https://mail.qq.com/cgi-bin/mail_list?folderid={FOLDERID}&page={nextpage}&sid={token_sid}&nocheckframe=true")
    time.sleep(1)
    
    try: wait_until(S('#frm').exists)
    except :print(f"{C.RED}等待超时{C.END}")
    
    # 您请求的频率太快，请稍后再试
    wait = 0
    while not S('#frm').exists():
        if wait == 0: time.sleep(10); refresh()
        elif wait == 2: time.sleep(5); refresh()
        elif wait%3 == 0: time.sleep(3); refresh()
        else:time.sleep(1)
        wait+=1
    
    scroll_down(S('#frm').height)
      
  # 打印好看的表格
  if bool(can_print_title_table):
      print(f"\n\n{title_table}\n共有{len(titlelist)}封邮件。\n\n")
  
  # 如果不需要读取邮件
  if not bool(can_load_email):
    os.system('pause')
    return
  
  #---------------------------------------------------------------------------
  # download path
  #---------------------------------------------------------------------------
  
  if not os.path.exists(DOWNLOAD_FOLDER): 
    os.mkdir(DOWNLOAD_FOLDER)
  
  #---------------------------------------------------------------------------
  # mail
  #---------------------------------------------------------------------------
  
  TEMP = {}
  
  # 打开邮件正文

  for index, title in enumerate(titlelist, start=0):
    
    go_to(f"https://mail.qq.com/cgi-bin/frame_html?t=newwin_frame&sid={token_sid}&url=/cgi-bin/readmail?t=readmail%26mailid={title['mailid']}%26mode=pre")
    time.sleep(2)
    
    # 您请求的频率太快，请稍后再试
    wait = 0
    while not S('#mainmail').exists():
        if wait == 0: time.sleep(10); refresh()
        elif wait == 2: time.sleep(5); refresh()
        elif wait%3 == 0: time.sleep(3); refresh()
        else:time.sleep(1)
        wait+=1
    
    
    # 临时数据，用于失败原因检测（未完成） 
    TEMP['INDEX'] = title['index']
    TEMP['TITLE'] = title['title']
    
    # 是否包含过期文件
    if(Text("已过期").exists()):
        highlight(Text("已过期"))
        print(f"{C.BGRED}![过期附件] {title['index']}: {title['email']:<24}\t{title['title']:<24} 包含过期附件 {C.END}")
        
        # 设为星标
        if bool(can_star_timeoutfile):
          if S('#img_star').web_element.get_attribute('class') == 'qm_ico_flagoff':
            click(S('#img_star'))
    
        # 添加标签
        if bool(can_tag_timeoutfile):
          click(Text('标记为...'))
          wait_until(S('#select_QMMenu__menuall_').exists)
          click(Text(str_tag_timeoutfile))
    
    # 邮件是否包含附件
    if not(S("#attachment").exists()): 
      
      print(f"{C.RED}[没有附件] {title['index']}: {title['email']:<24}\t{title['name']:<24}\t{title['title']}{C.END}")
      
      # 设为星标
      if bool(can_star_nofile):
        if S('#img_star').web_element.get_attribute('class') == 'qm_ico_flagoff':
          click(S('#img_star'))
    
      # 添加标签
      if bool(can_tag_nofile):
        click(Text('标记为...'))
        wait_until(S('#select_QMMenu__menuall_').exists)
        click(Text(str_tag_nofile))
    
      continue
    
    # 滚动页面至底部
    scroll_down(S("#pageEnd").y)
    
    #---------------------------------------------------------------------------
    # attach
    #---------------------------------------------------------------------------
    
    elements = [e.find_elements_by_tag_name('a')[0] for e in chrome.find_elements_by_class_name('ico_big')]

    for i, e in enumerate(elements, start=0):

        attach={}
        attach.update({'filename': e.get_attribute('filename')})
        attach.update({'filetype': e.get_attribute('filename').split('.')[-1]})
        attach.update({'filebyte': int(e.get_attribute('filebyte'))})
        attach.update({'filedown': "https://mail.qq.com" + e.get_attribute('down')})
        attach.update({'index': int(e.get_attribute('idx') or 0)+1})
        # 只有超大附件(bigattach="1") 有("timeout"= 0 or 1)参数。普通附件(attach="1")没有。 
        attach.update({'timeout': int(e.get_attribute('timeout') or 0)}) 
        attach.update({'ti': title['index']})
        attach.update({'tn': title['name']})
        attach.update({'tt': title['title']})
        attach.update({'page': title['page']})
        attach.update({'email': title['email']})
        attach.update({'timestamp': title['timestamp']})
        
        attchlist.append(attach)
        attach_table.add_row([f'{attach_count+1:04}', attach["filename"], title["index"], title["name"], title["title"], title["email"], attach["index"], attach["filebyte"], attach["filetype"], title["page"], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
        
        # 附件类型黑名单
        if attach_blacklist_filetype != [''] and any([key in attach["filetype"] for key in attach_blacklist_filetype]):
            print(f"{C.SILVER}[文件类型过滤] 已跳过 {title['index']}: {title['name']:<24}\t{title['title']}\t{attach['index']}\t{attach['filename']} {C.END}")
            attach_black_table.add_row([f'{attach_count+1:04}', attach["filename"], title["index"], title["name"], title["title"], title["email"], attach["index"], attach["filebyte"], attach["filetype"], title["page"], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            continue
        
        # 附件类型白名单
        if attach_whitelist_filetype != [''] and not all([key in attach["filetype"] for key in attach_whitelist_filetype]): 
            print(f"{C.SILVER}[文件类型过滤] 已跳过 {title['index']}: {title['name']:<24}\t{title['title']}\t{attach['index']}\t{attach['filename']} {C.END}")
            attach_black_table.add_row([f'{attach_count+1:04}', attach["filename"], title["index"], title["name"], title["title"], title["email"], attach["index"], attach["filebyte"], attach["filetype"], title["page"], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            continue
        
        # 该附件是否已过期
        if bool(attach['timeout']):
            print(f"{C.RED}![过期附件] {title['index']}: {title['name']:<24}\t{title['title']}\t{attach['index']}\t{attach['filename']} 该文件已过期！！{C.END}")
            timeout_count+=1
            attach_timeout_table.add_row([f'{attach_count+1:04}', attach["filename"], title["index"], title["name"], title["title"], title["email"], attach["index"], attach["filebyte"], attach["filetype"], title["page"], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            break
        
        attach_count += 1
        
        #---------------------------------------------------------------------------
        # rule
        #---------------------------------------------------------------------------
        
        # 重命名规则模板
        rule = { 
          'filename1':        attach['filename'].split(".")[0] if len(attach['filename'].split('.')) <= 1 else '.'.join(attach['filename'].split('.')[0:-1]), # file
          'filename2':        attach['filename'],                                             # file.jpg
          'extension1':       '.' + attach['filetype'],                                       # .jpg
          'extension2':       attach['filetype'],                                             # jpg
          'attchtitleindex':  str(attach["index"]),                                           # 标附序
          'titleindex':       str(title_count),                                               # 标序 [1 ~ 总标]
          'attchindex':       str(title_count),                                               # 附序 [1 ~ 总附]
          'titlecount':       str(len(titlelist)),                                            # 总标 0 
          'attchcount':       str(len(attchlist)),                                            # 总附 0 
          'nameid':           title['name'],                                                  # 发信人昵称
          'address':          title['email'],                                                 # 邮箱地址：123456@qq.com
          'mailid':           title['email'].split("@")[0],                                   # 邮箱ID：123456
          'year':             time.strftime("%Y", title['timestamp']),                        # 年：2020
          'month':            time.strftime("%m", title['timestamp']),                        # 月：11
          'day':              time.strftime("%d", title['timestamp']),                        # 日：04
          'week':             time.strftime("%a", title['timestamp']),                        # 周：Wed
          'ampm':             time.strftime("%p", title['timestamp']),                        # 午：PM
          'hours':            time.strftime("%H", title['timestamp']),                        # 时：14
          'minutes':          time.strftime("%M", title['timestamp']),                        # 分：30
          'seconds':          time.strftime("%S", title['timestamp']),                        # 秒：59
          'time1':            time.strftime("%H%M", title['timestamp']),                      # 时间： 1430
          'time2':            time.strftime("%H'%M'%S", title['timestamp']),                  # 时间： 14'30'59
          'date1':            time.strftime("%m%d", title['timestamp']),                      # 日期:  1207
          'date2':            time.strftime("%Y%m%d", title['timestamp']),                    # 日期:  20201207
          'date3':            time.strftime("%Y-%m-%d", title['timestamp']),                  # 日期:  2020-12-07
          'date4':            time.strftime("%Y%m%d_%H'%M'%S", title['timestamp']),           # 日期:  2020-12-07_14'30'59
        }
        
        # 替换变量模板
        pattern = re.compile("|".join(rule.keys()))
        fn = lambda x: rule[re.escape(x.group(0))]
        
        re_rule_folder = pattern.sub(fn, rule_folder)
        re_rule_rename = pattern.sub(fn, rule_rename)
        
        rootpath = DOWNLOAD_FOLDER
        expepath = os.path.join(rootpath, attach['filename'])      # 原始预期下载路径
        folder_path = os.path.join(rootpath, re_rule_folder)       # 移入文件夹的新路径
        rename_path = os.path.join(rootpath, re_rule_rename)       # 重命名后的新路径
        
        TEMP['FILENAME'] = attach['filename']

        #---------------------------------------------------------------------------
        # ready download
        #---------------------------------------------------------------------------
        
        # 下载前检查文件是否已存在，如果存在跳过下载。
        if ready_download_but_file_exists == 'skip':

            if os.path.isfile(expepath) and os.path.getsize(expepath) == attach['filebyte']:
                print(f"{C.BLUE}~ {title['index']:<4}\t{attach_count:04}: {attach['filename']} 文件已存在根目录，跳过本次下载。{C.END}")
                continue

            if bool(can_move_folder):
                if not os.path.exists(folder_path): 
                    os.mkdir(folder_path)
                else:
                    folderfile_path = os.path.join(folder_path, attach['filename'])
                    if os.path.isfile(folderfile_path) and os.path.getsize(folderfile_path) == attach['filebyte']:
                        print(f"{C.BLUE}~ {title['index']:<4}\t{attach_count:04}: {attach['filename']} 文件已存在文件夹，跳过本次下载。{C.END}")
                        continue
        
        #---------------------------------------------------------------------------
        # download
        #---------------------------------------------------------------------------

        if bool(can_download_file):
            ActionChains(chrome).click(chrome.find_elements_by_link_text('下载')[i]).perform() 
        
        #---------------------------------------------------------------------------
        # downloading
        #---------------------------------------------------------------------------

        # 等待下载
        if bool(can_move_folder) or bool(can_rename_file):
          wait_time = 0
          while wait_time <= downloading_timeout:

            if get_last_filepath() != '':
               break

            if wait_time %2 == 0: 
              # 如果下载时长过久。默认300: 大于5分钟
              if wait_time >= downloading_timeout:
                print(f"{C.GOLD} ^ {title['index']}\t{attach['index']:02}: {attach['filename']} 下载时长过久，放弃等待，执行下一个。{C.END}")
                break
              
              # 每分钟提示
              if wait_time >= 60 and not bool(wait_time % 60):
                print(f"{C.SILVER}^ {title['index']}\t{attach['index']:02}: {attach['filename']} 正在下载... 您已等待了 {wait_time / 60} 分钟。{C.END}")

            time.sleep(2)
            wait_time += 2
            
        #---------------------------------------------------------------------------
        # download finish
        #---------------------------------------------------------------------------

        # 是否允许重命名文件
        if bool(can_rename_file):
          rename_file(get_last_filepath(), rename_path, {attach['filename']})
         
        # 是否允许移动到文件夹
        if bool(can_move_folder):
          move_file(get_last_filepath(), folder_path, {attach['filename']})

        # 打印日志
        if bool(can_print_attch):
            print(f"+ {title['index']:<4}\t{attach_count:04}: {title['email']:<24}\t{title['name']:<24}\t{attach['filename']}")

    switch_to(find_all(Window())[0])
  
  # 下载结束
  print(f"{C.GREEN}任务完成{C.END}")
  go_to("https://mail.qq.com")
  
  tips_text_timeout = f"另外，有 {timeout_count} 个过期附件无法下载。" if timeout_count > 0 else ''
  print(f"\n\n{attach_table}\n包含 {folder_title_count} 封邮件，共 {len(attchlist)} 个附件。{tips_text_timeout}\n 预计实际下载了 {attach_count} 个附件。\n\n")
  
  # 将数据导出为CSV
  if bool(can_export_titledata_to_csv):
    ptable_to_csv(title_table, os.path.join(ROOTPATH, f"_邮件导出列表{script_start_time}.csv"))

  # 将数据导出为CSV
  if bool(can_export_attchdata_to_csv):
    ptable_to_csv(attach_table, os.path.join(ROOTPATH, f"_附件导出列表{script_start_time}.csv"))
  
#-------------------------------------------------------------------------------
# os
#-------------------------------------------------------------------------------
  
# 返回最后一个下载完成的文件路径
def get_last_filepath(path = DOWNLOAD_FOLDER):
    fn = lambda f: os.path.join(path, f)
    files = [f for f in os.listdir(path) if os.path.isfile(fn(f)) and os.path.splitext(f)[1] not in ['.tmp','.crdownload']]
    if len(files) == 0:
      return ''
    else:
      files.sort(key=lambda f: os.path.getmtime(fn(f)))
      return os.path.join(path, files[-1])

# 将文件重命名
def rename_file(oldpath, newpath, err = ''):
    if oldpath == '' or not os.path.exists(oldpath):
      print(f"{C.RED}[rename_file] {err} 文件不存在。{C.END}")
      return
    rootpath = os.path.dirname(oldpath)
    # 先检查目标文件是否已存在
    if os.path.exists(newpath):
        # 先检查两个文件是否相同。相同则删除a文件。
        if filecmp.cmp(oldpath, newpath):
            print(f"{C.BGBLUE}[rename_file] {newname} 已存在。且与文件 {oldname} 内容相同。已自动删除。{C.END}")
            os.remove(oldpath)
        else:
            randnumber = 1
            filename = newname.split(".")[0] if len(newname.split('.')) <= 1 else '.'.join(newname.split('.')[0:-1])
            filetype = newname.split(".")[-1]
            aliaspath = os.path.join(rootpath, f'{filename}_{randnumber}.{filetype}')
            while os.path.exists(aliaspath):
                randnumber+=1
                aliaspath = os.path.join(rootpath, f'{filename}_{randnumber}.{filetype}')
            os.rename(oldpath, aliaspath)
            print(f"{C.BGBLUE}[rename_file] {newname} 已存在。但两个文件内容不相同。已在 {newname} 文件名后面添加编号 {randnumber} 。{C.END}")
    else:
        os.rename(oldpath, newpath)
  
# 将文件移动到目标文件夹
def move_file(filepath, newfolder, err = ''):
    if filepath == '' or not os.path.exists(filepath):
      print(f"{C.RED}[move_file] {err} 文件不存在。{C.END}")
      return
    filename = os.path.basename(filepath)
    newpath = os.path.join(newfolder, filename)
    # 先检查目标文件夹是否已存在该文件
    if os.path.exists(newpath): 
        # 先检查两个文件是否相同。
        if filecmp.cmp(filepath, newpath): 
            print(f"{C.BGBLUE}[move_file] {filename} 已存在此文件夹中。已自动删除 {filepath} 。{C.END}")
            os.remove(filepath)
        else:
            rename_file(filepath, newpath)
            shutil.move(newpath, newfolder)
    else:
        shutil.move(filepath, newfolder)
  
# 将Table导出为csv文件
def ptable_to_csv(table, filename):
    raw = table.get_string()
    data = [tuple(filter(None, map(str.strip, splitline)))
    for line in raw.splitlines()
    for splitline in [line.split('|')] if len(splitline) > 1]
    with codecs.open(filename,'w','utf_8_sig') as f: 
      for d in data: f.write('{}\n'.format(','.join(d)))
  
#-------------------------------------------------------------------------------
# main
#-------------------------------------------------------------------------------
 
def main():
  thread_webdriver()
  os.system('pause')

#-------------------------------------------------------------------------------
# END
#-------------------------------------------------------------------------------
if __name__ == '__main__': os.system('cls'); print(''); main();

