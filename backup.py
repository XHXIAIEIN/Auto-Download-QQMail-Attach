#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#===============================================================================
# * 声明
#===============================================================================
# 作者：XHXIAIEIN
# 更新：2023/08/08
# 主页：https://github.com/XHXIAIEIN/Auto-Download-QQEmail-Attach
#===============================================================================

'''
#===============================================================================
# * 如何安装
#===============================================================================
'''

#-------------------------------------------------------------------------------
# 🎈 必要的软件
#-------------------------------------------------------------------------------
#  - python3:       https://www.python.org/downloads/
#-------------------------------------------------------------------------------
#  Windows 用户安装补充：
#  安装 python3 时，需要勾选安装页面底部选项 ⌈Add Python 3.xx to PATH⌋
#...............................................................................

#-------------------------------------------------------------------------------
# 🎈 必要的依赖库
#-------------------------------------------------------------------------------
#  - chromedriver:  https://sites.google.com/chromium.org/driver/
#  - selenium:      https://github.com/baijum/selenium-python/
#  - helium:        https://github.com/mherrmann/selenium-python-helium/
#  - rich           https://github.com/Textualize/rich
#-------------------------------------------------------------------------------

#...............................................................................
#  MacOS用户：
#  运行终端(Terminal)输入以下指令：
#...............................................................................
#  python -m pip install helium
#  python -m pip install rich
#...............................................................................
#  注：需先安装 Homebrew
#  https://brew.sh/index_zh-cn
#...............................................................................

#...............................................................................
#  Windows用户：
#  按下 Win + R 打开 cmd，在命令提示符输入以下指令：
#...............................................................................
#  python -m pip install --upgrade pip
#  pip install selenium
#  pip install helium
#  pip install rich
#...............................................................................
#  注：若网络问题无法下载或下载过慢，可尝试使用国内镜像源，加个参数即可。
#  pip install helium -i https://pypi.tuna.tsinghua.edu.cn/simple
#...............................................................................

import os
import os
import shutil
import time
import traceback
from datetime import datetime
from urllib import parse

from helium import *
from rich import print
from rich.console import Console
from rich.table import Column, Table
from selenium.common.exceptions import (SessionNotCreatedException,WebDriverException)
from selenium.webdriver import Chrome, ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities

'''
#===============================================================================
# * 使用提示
#===============================================================================
'''

#...............................................................................
#  运行脚本之前，你需要先做几件事。
#...............................................................................
#  1 修改脚本参数
#    阅读下方的自定义参数区，根据你的需要对参数进行修改。
#    其中，带 📌 符号的为必填项。其他均为可选，如果不明白它代表什么，可以跳过它。
#...............................................................................
#  2 邮箱文件夹
#    把你想要下载的邮件移动到一个新的文件夹里，并找到这个文件夹ID。
#    文件夹ID是个数字，如123, 135, 247。
#
#    QQ邮箱用户：
#    1. 展开左侧面板 [我的文件夹] 列表，找到你想下载的文件夹，右键-新窗口打开。（注，不是选择"我的文件夹"）
#    2. 在新窗口的网站地址找到参数 folderid
#    如：mail.qq.com/cgi-bin/frame_html?t=frame_html&sid=xxx&url=/cgi-bin/mail_list?folderid={ 数字 }%26page=0
#
#    企业邮箱用户：
#    1. 启动开发者工具（按下键盘 Ctrl + Shift + C 审查元素）
#    2. 将鼠标移动到文件夹名称左边的"展开/收缩符号" (+ / -) 查看它上方弹出网页元素的ID属性，
#    如：img#icon_129.fd_on，那么 129 就是文件夹ID
#...............................................................................

'''
#===============================================================================
# * 自定义参数
#===============================================================================
'''

class PROFILE:

    #---------------------------------------------------------------------------
    # 📌 QQ账号
    #---------------------------------------------------------------------------
    # 企业邮箱和QQ邮箱的账号密码是不同的。
    #   普通QQ邮箱账号示例：134625798
    #   企业邮箱账号示例：name@company.onexmail.com
    #---------------------------------------------------------------------------

    # 是否为腾讯企业邮箱用户。如果是，请改为 1。
    IS_EXMAIL_USER = 0

    QQNUMBER='123456'
    PASSWORD='123456'

    #---------------------------------------------------------------------------
    # 📌 附件下载到本地哪个位置
    #---------------------------------------------------------------------------
    #  Win 用户举例：r'd:/download/email'
    #  Mac 用户举例：r'~/Downloads/email'
    #  注，需保留最前面的 r 符号。
    #---------------------------------------------------------------------------

    # 附件下载到本地哪个位置
    ROOTPATH = r'D:\XHXIAIEIN\QQMail'

    # 临时文件路径
    DOWNLOAD_FOLDER = os.path.join(ROOTPATH,'download')     # 附件实际下载目录
    USERDATA_FOLDER = os.path.join(ROOTPATH,'selenium')     # 浏览器的缓存数据

    #---------------------------------------------------------------------------
    # 📌 要下载的邮箱文件夹ID
    #---------------------------------------------------------------------------
    #  首页收件箱的文件夹ID是 1
    #---------------------------------------------------------------------------
    FOLDER_ID = 123

    #---------------------------------------------------------------------------
    # （可选）禁止显示网页图片
    #---------------------------------------------------------------------------
    # 如果你是首次登录，必须先允许显示图片，否则无法进行滑块安全验证。
    # 勾选"下次自动登录"，登录成功后关闭脚本与浏览器，开启下方选项重新运行脚本。
    #
    # 下载附件时，可以禁止显示图片，可以显著提升网页处理的速度，预估可以快3倍。
    #---------------------------------------------------------------------------
    can_disabled_images = 0

    #---------------------------------------------------------------------------
    # （可选）下载计划。
    #---------------------------------------------------------------------------
    #  start:     从邮件列表第n个开始。（包含n，即列表第一个就是n。）默认值：1
    #  end:       到邮件列表第n个结束。（包含n，即列表最后一个是n。）默认值：0
    #  step:      从start开始计算，累计下载n个后结束。（即需下载n个）默认值：0
    #---------------------------------------------------------------------------

    # 邮件列表
    TITLE_TASK = { 'start':1, 'step':0, 'end': 0 }

    # 翻页规则
    PAGES_TASK = { 'start':1, 'step':0, 'end':0 }

    #---------------------------------------------------------------------------
    # （可选）邮件主题，关键词过滤
    #---------------------------------------------------------------------------

    # 黑名单关键词。邮件主题如果包含了任意一个关键词，就忽略不下载。
    # 示例：TITLE_BACKLIST_KEYS = ['发信方已撤回邮件','QQ会员业务通知邮件']
    TITLE_BACKLIST_KEYS = ['发信方已撤回邮件']

    # 白名单关键词。邮件主题必须包含白名单里的所有关键词。关键词越多，匹配规则越严格。
    # 示例：TITLE_BACKLIST_KEYS = ['反馈','回复']
    TITLE_WHITELIST_KEYS = ['']

    #---------------------------------------------------------------------------
    # （可选）邮件主题，关键词过滤
    #---------------------------------------------------------------------------

    # 文件类型黑名单。忽略指定类型的文件。不包含'.'
    # 示例：ATTACH_BACKLIST_FILETYPE = ['.psd','.txt']
    ATTACH_BACKLIST_FILETYPE = ['']

    # 文件类型白名单。只下载指定类型的文件，不包含 '.'
    # 满足任意一个关键词即允许下载。
    # ATTACH_WHITELIST_FILETYPE = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    ATTACH_WHITELIST_FILETYPE = ['']


    #---------------------------------------------------------------------------
    # （可选）Advanced Config 高级选项
    #---------------------------------------------------------------------------

    #...........................................................................
    # 下载
    #...........................................................................

    # 是否需要下载附件
    can_download_attach = 1

    # 是否按邮件创建文件夹
    can_move_folder = 0

    # 是否重命名文件
    can_rename_file = 0

    # 下载前，检测本地是否存在相同文件（检测方法：对比文件名及文件大小是否一致）。
    # 'skip'     :  跳过下载。
    # 'continue' :  继续下载，后面重复的文件名可能会自动被加上（1）这样的序号。
    ready_download_but_exists = 'skip' or 'continue'

    # 下载等待时长(单位：秒)。超过时长后则放弃后续操作，如移动文件夹或重命名。
    downloading_timeout = 30

    #...........................................................................
    # 星标 / 标签
    #...........................................................................

    # 是否处理星标/已读/未读邮件
    can_check_star_mail = 1
    can_check_open_mail = 1
    can_check_unopen_mail = 1

    # 是否检查是否包含附件/过期附件
    can_check_no_attach = 1
    can_check_timeout_attach = 1

    # 没有附件或附件已过期设为星标
    can_star_no_attach = 1
    can_star_timeout_attach = 1

    # 没有附件添加标签
    can_tag_no_attach = 1
    str_tag_no_attach = '没有附件'

    # 过期附件添加标签
    can_tag_timeout_attach = 0
    str_tag_timeout_attach = '过期附件'

    #...........................................................................
    # 控制台信息
    #...........................................................................

    # 在控制台显示信息
    can_print_page = 1
    can_print_title = 1
    can_print_attach = 1

    #...........................................................................
    # DEBUG
    #...........................................................................

    # 是否需要读取标题、邮件、附件
    can_load_title  = 1
    can_load_email  = 1
    can_load_attach = 1

'''
#===============================================================================
#                 " 请 勿 跨 过 这 块 区 域 修 改 内 容 "
#===============================================================================
'''

#-------------------------------------------------------------------------------
# Webdriver Path
#-------------------------------------------------------------------------------
chromedriver = os.path.join(os.getcwd(), 'chromedriver.exe')

#-------------------------------------------------------------------------------
# 本地变量
#-------------------------------------------------------------------------------

# 脚本运行开始时间
START_TIME = str(datetime.now().date().isoformat())   

# 用于选择是QQ邮箱还是企业邮箱
MAILDOMIN = PROFILE.IS_EXMAIL_USER

# 本地缓存数据
LOCALDATA = {
  'token_domin'   : ['mail', 'exmail'][MAILDOMIN],      # 地址参数：域名
  'token_sid'     : '',                                 # 地址参数：身份密钥
  'token_page'    : 0,                                  # 地址参数：文件夹页数
  'folder_id'     : PROFILE.FOLDER_ID,                  # 地址参数：文件夹的ID
  'folder_name'   : '',                                 # 文件夹名称
  'page_count'    : 0,                                  # 文件夹总页数（首次进文件夹读取）
  'title_count'   : 0,                                  # 文件夹总邮件数量（首次进文件夹读取）
  'attach_count'  : 0,                                  # 文件夹总附件数量
  'title_list'    : [],
  'attach_list'   : [],
  'history_data'  : {},
}

# 文件夹当前页缓存数据
FOLDER_DATA = {
    'tiele_count'    :  0,                              # 收集阶段，已处理的邮件序号
    'title_index'   :  0,                               # 当前处理邮件序
    'page'          :  1,                               # 当前处理页
    'title'         :  1,                               # 当前邮件总序
    'title_at'      :  1,                               # 当前邮件页序
    'attach'        :  1,                               # 当前附件总序
    'attach_at'     :  1                                # 当前附件页序
}

# 临时缓存文件名
CONFIGDATA = {
    'titlefile'     :  os.path.join(PROFILE.ROOTPATH, f'title_{START_TIME}.csv'),         # 邮件统计
    'attachfile'    :  os.path.join(PROFILE.ROOTPATH, f'attach_{START_TIME}.csv'),        # 附件统计
}

# 表头
FIELD_TITLE   =  ['index', 'timestamp','address','title','name','attach','mailid','star','unread','page']                                                     # title表头
FIELD_ATTACH  =  ['title_index', 'attach_index', 'timestamp','address','title','name','mailid', 'fileindex', 'filename', 'filebyte', 'fileview', 'filedown']  # attach表头

# 富文本表格
RICHTABLE = {
    'tittle_table' : Table(Column('page',width=6),Column('index',width=6),Column('address',min_width=28),Column('name',min_width=30),Column('title',min_width=46,no_wrap=True),Column('state',min_width=6,no_wrap=True),show_header=False,box=None,width=None),
    'attach_table' : Table(Column('page',width=6),Column('index',width=6),Column('address',min_width=28),Column('name',min_width=30),Column('title',min_width=46,no_wrap=True),Column('filename',min_width=46,no_wrap=True),Column('state',min_width=6,no_wrap=True),show_header=False,box=None,width=None)
}

#-------------------------------------------------------------------------------
# 两种邮箱的元素选择器
#-------------------------------------------------------------------------------

MAIL_SELECTOR = {
    'login_title'              : ['登录QQ邮箱'                              , '腾讯企业邮箱-登录入口'],
    'login_url'                : ['mail.qq.com'                             , 'exmail.qq.com/login'],
    'login_verify'             : ['#useraddrcontainer'                      , '#useraddrcontainer'],
    'login_tcaptcha'           : ['#login'                                  , '#loginForm'],
    'login_pwd_panel'          : ['#switcher_plogin'                        , '.js_show_pwd_panel'],
    'login_autologin'          : ['#QQMailSdkTool_auto_login'               , '#auto_login_in_five_days_pwd'],
    'login_username'           : ['#u'                                      , '#inputuin'],
    'login_password'           : ['#p'                                      , '#pp'],
    'login_button'             : ['#login_button'                           , '#btlogin'],
    'login_frame'              : ['#web_login'                              , '#loginForm'],
    'mainFrame_verify'         : ['#mainFrameContainer'                     , '#mainFrameContainer'],
    'mainFrame_scroll'         : ['#qqmail_mailcontainer'                   , '#mainFrameContainer'],
    'check_tag_scroll'         : ['#mainFrameContainer'                     , '#contenttable'],
    'create_tag_scroll'        : ['#tag'                                    , '#contenttable'],
    'create_tag_menu'          : ['#tag_QMMenu'                             , '#tag_i'],
    'create_tag_menuitem'      : ['#tag_QMMenu__menuitem_createtag'         , '#tag_0_i__menuitem_createtag'],
    'create_tag_input'         : ['#QMconfirm_QMDialog_txt'                 , '#QMconfirm_i_txt'],
    'create_tag_confirm'       : ['#QMconfirm_QMDialog_confirm'             , '#QMconfirm_i_confirm'],
    'create_tag_setting_xpath' : ["//a[starts-with(#id,'folder_tag_') and contains(#id, '_name')]", "//tr[starts-with(#id,'tag_')]/td[1]/div[2]/a"],
    'folder_title_frame'       : ['u.tt'                                    , 'u.black'],
    'attach_info_class'        : ['.ico_big a'                              , '.down_big'],
    'login_error_503'          : ['.errorInfo'                              , '.errorInfo']
}

#-------------------------------------------------------------------------------
# 用于控制台的颜色配置 (弃用，已使用 rich 代替)
#-------------------------------------------------------------------------------

console = Console()

C = {
    'END'       :  '\033[0m',     # 白色（正常）
    'GREY'      :  '\033[2m',     # 灰色（失效）
    'SILVER'    :  '\033[90m',    # 银色（忽略）
    'GOLD'      :  '\033[33m',    # 金色（警告）
    'RED'       :  '\033[91m',    # 红色（错误）
    'BLUE'      :  '\033[36m',    # 蓝色（下载）
    'GREEN'     :  '\033[92m',    # 绿色（完成）
    'UNLINK'    :  '\033[4m',     # 下划线（超链接）
    'LINK'      :  '\033[9m',     # 删除线（删除）
    'BGWHITE'   :  '\033[7m',     # 白底黑字
    'BGRED'     :  '\033[41m',    # 红底白字
    'FLASHANI'  :  '\033[6m',     # 闪烁白灰
}

#-------------------------------------------------------------------------------
# Utility
#-------------------------------------------------------------------------------

# 将输出的日志保存到文件
def say(text, color='END'):
    print(text)
    # print(C[color] + text + C['END'])

# 输出错误信息
def error(text):
    say(text, color='RED')

#-------------------------------------------------------------------------------
# webdriver
#-------------------------------------------------------------------------------


def launch_webdriver():

    IS_MACOS_USER = False if os.name == 'nt' else True

    prefs = {
        'download.directory_upgrade': True,
        'download.prompt_for_download': 'false',
        'profile.default_content_settings.multiple-automatic-downloads': 1,
        'download.default_directory': PROFILE.DOWNLOAD_FOLDER
    }
    
    options = ChromeOptions()
    options.add_argument('–user-data-dir={}'.format(PROFILE.DOWNLOAD_FOLDER))
    options.add_argument('--window-size=1000,1000')      # 设置浏览器窗口大小
    options.add_argument('--disable-remote-fonts')       # 禁用远程字体，提升加载速度
    options.add_argument('--hide-scrollbars')            # 隐藏滚动条，提升处理速度
    options.add_experimental_option('excludeSwitches', ['enable-logging'])  # 禁用日志输出
    options.add_experimental_option('prefs', prefs)

    # 浏览器本地缓存文件夹
    # WIN 和 MAC 的区别只是多个 = 符号的区别 (x
    options.add_argument([f'--user-data-dir={PROFILE.USERDATA_FOLDER}', 
                          f'--user-data-dir {PROFILE.USERDATA_FOLDER}'][bool(IS_MACOS_USER)])

    # 禁止网页显示图片
    if bool(PROFILE.can_disabled_images): 
        say(f"* 已禁用显示网页图片", 'SILVER')
        options.add_argument('--blink-settings=imagesEnabled=false')

    # 调整网页加载方式，不等待页面完全加载完成
    caps = DesiredCapabilities.CHROME
    caps['pageLoadStrategy'] = 'none'

    # 启动 Webdriver
    try:
        driver = Chrome(options=options, desired_capabilities=caps, executable_path=chromedriver)
    except SessionNotCreatedException:
        error('ChromeDriver 版本已经更新，请前往 https://sites.google.com/chromium.org/driver/ 下载最新 Stable 版本，解压后将 chromedriver.exe 并放在此文件的相同目录。')
        return
    except WebDriverException:
        error('引用 WebDriver 遇到了错误。请前往 https://sites.google.com/chromium.org/driver/ 下载最新 Stable 版本，解压后将 chromedriver.exe 放在此文件的相同目录。')
        return
    except UnboundLocalError:
        error('当前已经开启了一个实例，无法同时运行多个任务，请关闭脚本后重新尝试。')
        return
    except Exception as e:
        error('启动浏览器时，遇到了未知的错误，请删除本地文件夹内的 selenium 文件夹重试。')
        print(traceback.format_exception_only(e))
    finally:
        set_driver(driver)
    
    # 跳转至邮箱主页
    go_to(MAIL_SELECTOR['login_url'][MAILDOMIN])
    time.sleep(2)
    launch_mail()

#-------------------------------------------------------------------------------
# login
#-------------------------------------------------------------------------------

def launch_mail():
    say(f"* 进入邮箱主页。", 'SILVER')
    #...........................................................................
    # 出错啦
    #...........................................................................
    if S(MAIL_SELECTOR['login_error_503'][MAILDOMIN]).exists():
        say(f"⚠ 登录出现异常，等待自动重试。", 'SILVER')
        time.sleep(3)
        launch_mail()
        return False
    #...........................................................................
    # 已经登录
    #...........................................................................
    if S(MAIL_SELECTOR['login_verify'][MAILDOMIN]).exists():
        if S(MAIL_SELECTOR['mainFrame_verify'][MAILDOMIN]).exists():
            say(f"* 已经登录。", 'SILVER')
            update_token_sid()
            open_folder()
            return True
        say(f"⏳ 检测不到登录框，等待自动重试", 'SILVER')
        time.sleep(2)
        launch_mail()
        return False
    #...........................................................................
    # 等待登录
    #...........................................................................
    while not S(MAIL_SELECTOR['login_verify'][MAILDOMIN]).exists():

        # 如果当前面板为微信登录，切换到QQ登录
        if S('#wxLoginTab').exists() and 'xm_login_card_tab_item_Active' in S('#wxLoginTab').web_element.get_attribute('class'):
            S('#qqLoginTab').web_element.click()

        # 点击账号密码登录
        if  S('#switcher_plogin').exists() and 'switch_btn_focus' not in S('#switcher_plogin').web_element.get_attribute('class'):
            S('#switcher_plogin').web_element.click()

        # 勾选下次自动登录
        if S(MAIL_SELECTOR['login_autologin'][MAILDOMIN]).exists():
            S(MAIL_SELECTOR['login_autologin'][MAILDOMIN]).web_element.click()
        
        # 输入账号密码
        if S(MAIL_SELECTOR['login_frame'][MAILDOMIN]).exists():
            write(PROFILE.QQNUMBER, S(MAIL_SELECTOR['login_username'][MAILDOMIN]))
            write(PROFILE.PASSWORD, S(MAIL_SELECTOR['login_password'][MAILDOMIN]))
            # 点击登录
            S(MAIL_SELECTOR['login_button'][MAILDOMIN]).web_element.click()

        # 等待安全验证
        notify_verify, notify_tcaptcha, notify_sms = True,True,True

        while S(MAIL_SELECTOR['login_tcaptcha'][MAILDOMIN]).exists():
            if notify_verify: say('等待用户手动完成认证...', 'FLASHANI'); notify_verify = False;
            if notify_tcaptcha and S('#newVcodeArea').exists(): say('等待完成安全验证', 'FLASHANI'); notify_tcaptcha = False;
            if notify_sms and S('#verify').exists(): say('等待完成短信认证', 'FLASHANI'); notify_sms = False;
            time.sleep(1)
        
        time.sleep(1)
    #...........................................................................
    # 登录成功
    #...........................................................................
    update_token_sid()
    say(f"登录成功！token_sid: {LOCALDATA['token_sid']}")
    open_folder()

#-------------------------------------------------------------------------------
# token_sid
#-------------------------------------------------------------------------------

# 更新 token_sid
def update_token_sid():
    LOCALDATA['token_sid'] = get_querystring(get_driver().current_url)['sid']

#-------------------------------------------------------------------------------
# folder
#-------------------------------------------------------------------------------

def open_folder():

    # 网页跳转到文件夹
    go_to(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={LOCALDATA['token_page']}&sid={LOCALDATA['token_sid']}&nocheckframe=true")
    
    # 确保页面完全加载完毕
    time.sleep(2)
    wait_until(S(MAIL_SELECTOR['mainFrame_scroll'][MAILDOMIN]).exists)
    
    # 处理异常：文件夹没有邮件
    if S('div.nomail').exists():
        say('这个文件夹没有邮件，请检查文件夹ID是否填写正确。', 'RED')
        return

    #...........................................................................
    # 通过翻页进入，直接读取标题信息，不再初始化
    #...........................................................................
    if LOCALDATA['token_page'] > 0:
        read_folder_title()
        return
    
    #...........................................................................
    # 首次进入文件夹，先获取文件夹基本信息
    #...........................................................................
    LOCALDATA['folder_name'] = get_driver().title.split(' - ')[1]                                             # 文件夹名称
    LOCALDATA['title_count'] = int(S('#_ut_c').web_element.text)                                              # 文件夹总邮件数量
    LOCALDATA['page_count']  = int(S('#frm > div > .right').web_element.text.split('/')[1].split(' 页')[0])   # 文件夹总页数
    say(f"* 进入文件夹: {LOCALDATA['folder_name']}")
    read_folder_title()

#-------------------------------------------------------------------------------
# next_page
#-------------------------------------------------------------------------------

def next_page():
    # 没有翻页按钮，表示已到最后一页
    if not S('#nextpage').exists():
        say(f"* 文件夹邮件整理完成，正在合并数据")
        init_read()

    # 获取下一页的按钮
    while S('#nextpage').exists():
        next_btn = S('#nextpage').web_element
        LOCALDATA['token_page'] = int(get_querystring(next_btn.get_attribute('href'))['page'])
        open_folder()

#-------------------------------------------------------------------------------
# title
#-------------------------------------------------------------------------------

def read_folder_title():

    # 滚动到底部，避免下方元素没有加载完成
    scroll_down(S('#list').y)

    # 更新当前页的邮件数量
    folder_title_frame = len(find_all(S(MAIL_SELECTOR['folder_title_frame'][MAILDOMIN])))

    say(f"* 正在收集第{LOCALDATA['token_page']+1}/{LOCALDATA['page_count']}页邮件信息，本页有 {folder_title_frame} 封邮件。({len(LOCALDATA['title_list'])}/{LOCALDATA['title_count']})")

    #...........................................................................
    # 利用表达式的方法直接分类打包邮件数据
    # 虽然处理速度比起传统 for...in 方式不见得有快多少，主要是看着整齐，舒服。
    #...........................................................................
    
    folder_title = {}
    folder_title['index']     =  [FOLDER_DATA['tiele_count'] + i for i in range(folder_title_frame)]                                                     # 邮件序号 
    folder_title['timestamp'] =  [datetime.fromtimestamp(int(item.web_element.get_attribute('totime'))/1000).strftime("%Y-%m-%d %H:%M:%S") for item in find_all(S('.cx input'))] # 发件时间
    folder_title['address']   =  [item.web_element.get_attribute('e') for item in find_all(S('nobr span'))]                                              # 发件人邮箱
    folder_title['title']     =  [item.web_element.text for item in find_all(S('u.tt'))]                                                                 # 主题
    folder_title['name']      =  [item.web_element.get_attribute('n') for item in find_all(S('nobr span'))]                                              # 发件人
    folder_title['attach']    =  [bool('Ju' in item.web_element.get_attribute('class')) for item in find_all(S('.cij'))]                                 # 是否有附件
    folder_title['mailid']    =  [item.web_element.get_attribute('mailid') for item in find_all(S('nobr'))]                                              # 邮件ID
    folder_title['star']      =  [bool(item.web_element.get_attribute('star')) for item in find_all(S('.cx input'))]                                     # 是否星标
    folder_title['unread']    =  [bool(item.web_element.get_attribute('unread')) for item in find_all(S('.cx input'))]                                   # 是否已读
    folder_title['page']      =  [int(S('#frm > div > .right').web_element.text.split('/')[0]) for i in range(folder_title_frame)]                       # 当前页数
    
    # 合并数据
    folder_data = [{key: folder_title[key][i] for key in folder_title} for i in range(folder_title_frame)]

    # 在 'title_list' 以文件夹页进行分组。
    LOCALDATA['title_list'].append(folder_data)
    
    # 附件数量计数器
    FOLDER_DATA['tiele_count'] += folder_title_frame

    # 打印到控制台 
    for item in folder_data:
        if item['attach']:
            RICHTABLE['tittle_table'].add_row(f"{item['index']}", f"{item['page']}", item['address'], f"{item['name']}", f"{item['title']}") 
        else:
            RICHTABLE['tittle_table'].add_row(f"{item['index']}", f"{item['page']}", item['address'], f"{item['name']}", f"{item['title']}", "没有附件", style='red')

    #...........................................................................
    # 翻页
    #...........................................................................
    next_page()  
    

#-------------------------------------------------------------------------------
# mail
#-------------------------------------------------------------------------------

def init_read():
    # 临时数据初始化
    FOLDER_DATA['page'] = 0
    FOLDER_DATA['title_index'] = 0
    FOLDER_DATA['attach'] = 1
    LOCALDATA['attach_list'].append([])
    say('* 开始读取邮件')
    open_mail()


def open_mail():

    # 带入临时数据
    item = LOCALDATA['title_list'][FOLDER_DATA['page']][FOLDER_DATA['title_index']]

    # 跳转至邮件
    go_to(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/frame_html?t=newwin_frame&sid={LOCALDATA['token_sid']}&url=/cgi-bin/readmail?t=readmail%26mailid={item['mailid']}%26mode=pre")
    time.sleep(2)
    wait_until(S('#mainFrameContainer').exists)

    # 检测是否出现提示过于频繁
    FBI_WAITTING('#pageEnd')
    scroll_down(S("#pageEnd").y)

    # 没有附件
    if not S("#attachment").exists():
        RICHTABLE['tittle_table'].add_row(f"{item['page']}", f"{item['index']}", item['address'], item['name'], item['title'], '[red]没有附件')
        next_mail()
        return
    
    # 读取当前邮件的附件信息
    read_attach()


def next_mail():

    # 当前页邮件总数
    title_count = len(LOCALDATA['title_list'][FOLDER_DATA['page']])

    LOCALDATA['attach_list'].append([])

    # 下一封邮件
    FOLDER_DATA['title_index'] = max(0, min(FOLDER_DATA['title_index']+1, title_count))
    
    # 本页处理完成
    if FOLDER_DATA['title_index'] >= title_count:
        
        # 翻页
        FOLDER_DATA['page'] = max(0, min(FOLDER_DATA['page']+1, LOCALDATA['page_count']))
        
        # 翻页到底
        if FOLDER_DATA['page'] == LOCALDATA['page_count']:
            say_end()
            return
        
        # 更新数据
        FOLDER_DATA['title_index'] = 0

    open_mail()

#-------------------------------------------------------------------------------
# attach
#-------------------------------------------------------------------------------

def read_attach():

    FBI_WAITTING('#pageEnd')

    scroll_down(S("#pageEnd").y)

    #...........................................................................
    # 读取页面附件信息
    #...........................................................................  

    # 带入临时数据
    title_data = LOCALDATA['title_list'][FOLDER_DATA['page']][FOLDER_DATA['title_index']]

    # 踩坑：这里用 S() 选择不到元素，只能通过 selenium 常规的办法 
    attach_element = get_driver().find_elements(By.CSS_SELECTOR, MAIL_SELECTOR['attach_info_class'][MAILDOMIN])

    # 踩坑：超大附件的首个 idx 属性值为空。
    attach_info = [{ 
        'title_index'    : title_data['index'],
        'attach_index'   : FOLDER_DATA['attach'] + int(item.get_attribute('idx') or 0),
        'timestamp'      : title_data['timestamp'],
        'address'        : title_data['address'],
        'title'          : title_data['title'],
        'name'           : title_data['name'],
        'mailid'         : title_data['mailid'],
        'fileindex'      : int(item.get_attribute('idx') or 0),
        'filename'       : item.get_attribute('filename'),
        'filebyte'       : int(item.get_attribute('filebyte')),
        'fileview'       : item.get_attribute('viewmode'),
        'filedown'       : f"https://mail.qq.com" + item.get_attribute('down')} for item in attach_element]
    
    # 合并数组并转换成字典
    attach_data = [{key: value for key, value in data.items()} for data in attach_info]
    
    # 让 'attach_list' 以文件夹页进行分组。
    LOCALDATA['attach_list'][FOLDER_DATA['title_index']].append(attach_data)

    # 附件数量计数器
    FOLDER_DATA['attach'] += len(attach_data)
    
    #...........................................................................
    # 下载附件
    #...........................................................................   

    # 附件目标文件夹路径
    target_folder = os.path.join(PROFILE.DOWNLOAD_FOLDER, title_data['title'])
    tasks = [download_file(item['filedown']) for item in attach_data]

    next_mail()


# 跳转至下载地址
def download_file(url):
    go_to(url)
    time.sleep(1)


# (TODO): 移动文件
def move_file(filename, target_path, stop, data):

    # 如果目标文件夹不存在，则创建
    if not os.path.exists(target_path):
        os.mkdir(target_path)

    # 文件路径
    filepath = os.path.join(PROFILE.DOWNLOAD_FOLDER, filename)
    folderpath = os.path.join(target_path, filename)

    # 单个文件下载超时
    deadline = time.time() + PROFILE.downloading_timeout

    while not stop:
        if time.time() > deadline:
            RICHTABLE['attach_table'].add_row(f"{data['title_index']}", f"{data['page']}", data['address'], data['name'], data['title'], data['filename'], '超时',style='yellow')
            return
        if os.path.exists(filepath):
            shutil.move(filepath, folderpath)
            RICHTABLE['attach_table'].add_row(f"{data['title_index']}", f"{data['page']}", data['address'], data['name'], data['title'], data['filename'], '完成',style='green')
            break


# 频繁提示，自动刷新至页面出现
def FBI_WAITTING(id):
    if S(id).exists(): 
        return
    wait = 0
    while not S(id).exists():
        if wait == 0: time.sleep(10); refresh()
        elif wait == 2: time.sleep(6); refresh()
        elif wait%3 == 0: time.sleep(3); refresh()
        else:time.sleep(1)
        wait+=1
    
#-------------------------------------------------------------------------------
# utility
#-------------------------------------------------------------------------------

# 从URL链接中提取参数
def get_querystring(url):
    return dict(parse.parse_qsl(parse.urlsplit(url).query))

#-------------------------------------------------------------------------------
# END
#-------------------------------------------------------------------------------

def say_end():
    say('----------------------------------------------------------------')
    say('结束')
    go_to(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page=0&sid={LOCALDATA['token_sid']}")
    print('----------------------------------------------------------------\n脚本运行结束。', end='')
    os.system('PAUSE')
    kill_browser()
    exit()
    
def raise_error():
    os.system('PAUSE')
    kill_browser()

#-------------------------------------------------------------------------------
# MAIN
#-------------------------------------------------------------------------------

def main():
    launch_webdriver()
    print('-')
   
#-------------------------------------------------------------------------------
# START
#-------------------------------------------------------------------------------

if __name__ == '__main__':
    os.system('cls')
    main()
