#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#===============================================================================
# * 声明
#===============================================================================
# 作者：XHXIAIEIN
# 主页：https://github.com/XHXIAIEIN/Auto-Download-QQEmail-Attach
#===============================================================================

#===============================================================================
# 更新：2023/12/18
# 版本说明：
# 这个版本是简单重置版，仅保证基本下载功能。
# 填写账号、下载路径、需要下载的文件夹ID后，可开箱即用。
# 下载文件夹内所有邮件的附件。
# 若邮件没有附件，会自动添加星标。
#===============================================================================

'''
#===============================================================================
# * 如何安装
#===============================================================================
'''

#-------------------------------------------------------------------------------
# 🎈 必要的软件 1
#-------------------------------------------------------------------------------
#  - python3:   
#  https://www.python.org/downloads/
#  
#  打开页面，点击网页最醒目的黄色按钮。"Download Python 3.xxx"
#  
#  Windows 安装补充：
#  安装 python3 时，需要勾选安装页面底部选项 ⌈Add Python 3.xx to PATH⌋
#...............................................................................


#-------------------------------------------------------------------------------
# 🎈 必要的软件 2 （重要！！！）
#-------------------------------------------------------------------------------
#  - chromedriver: 
#  https://googlechromelabs.github.io/chrome-for-testing/#stable
# 
#  打开页面，看绿色表格最后的几行，找到中间 chromedriver，win64 那行。
#  将 URL 地址复制到浏览器地址栏，按下回车，即可下载。可能有点慢，因为需要科学上网。
#  下载后，解压出来，放这个脚本文件相同的目录。
#  
#  举例：下载的地址是这样的，只有链接中间的版本号数字不同
#  https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/120.0.6099.71/win64/chromedriver-win64.zip
#...............................................................................


#-------------------------------------------------------------------------------
# 🎈 必要的依赖库
#-------------------------------------------------------------------------------
#  - helium:        
#  https://github.com/mherrmann/selenium-python-helium/
#  
#  Windows用户：
#  按下 Win + R 打开 cmd，在命令提示符输入以下指令：
# 
#  python -m pip install --upgrade pip
#  pip install selenium
#  pip install helium
# 
#  注：若网络问题无法下载或下载过慢，可尝试使用国内镜像源，在后面加入 -i 参数：
#  pip install helium -i https://pypi.tuna.tsinghua.edu.cn/simple
#...............................................................................
#  MacOS用户：
#  运行终端(Terminal)输入以下指令：
#  python pip install helium
#  python pip install helium
#
#  注：需先安装 Homebrew
#  https://brew.sh/index_zh-cn
#...............................................................................

import os
import re
import shutil
import time
import traceback
from datetime import datetime
from urllib import parse
from urllib.parse import unquote

from helium import *
from selenium.webdriver import Chrome, ChromeOptions
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.common.exceptions import (SessionNotCreatedException,WebDriverException,ElementNotInteractableException)
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

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

    # 附件下载到本地哪个位置
    ROOTPATH = r'D:\QQMail\'

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
    can_check_file_exists = 1

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
    can_tag_no_attach = 0
    str_tag_no_attach = '没有附件'

    # 过期附件添加标签
    can_tag_timeout_attach = 0
    str_tag_timeout_attach = '过期附件'

    # 不规范命名的附件添加标签
    can_tag_filename_attach = 0
    str_tag_filename_attach = '重命名'

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
    'title_count'   :  0,                               # 收集阶段，已处理的邮件序号
    'attach_count'  :  0,                               # 下载阶段，已进行下载操作的附件数量
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
# 用于控制台的颜色配置
#-------------------------------------------------------------------------------

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
    print(C[color] + text + C['END'])

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
    options.add_argument('--lang=zh-CN')                 # 设置默认字符集编码
    options.add_argument('--window-size=960,1200')       # 设置浏览器窗口大小
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
    except Exception:
        error('启动浏览器时，遇到了未知的错误，请删除本地文件夹内的 selenium 文件夹重试。')
        traceback.print_exc()
    finally:
        set_driver(driver)
    
    # 跳转至邮箱主页
    go_to(MAIL_SELECTOR['login_url'][MAILDOMIN])
    time.sleep(1)

    try: 
        launch_mail()
    except ElementNotInteractableException:
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
        try:
            read_folder_title()
        except:
            time.sleep(1)
            open_folder()
        return
    
    #...........................................................................
    # 首次进入文件夹，先获取文件夹基本信息
    #...........................................................................
    LOCALDATA['folder_name'] = get_driver().title.split(' - ')[1]                                             # 文件夹名称
    LOCALDATA['title_count'] = int(S('#_ut_c').web_element.text)                                              # 文件夹总邮件数量
    LOCALDATA['page_count']  = int(S('#frm > div > .right').web_element.text.split('/')[1].split(' 页')[0])   # 文件夹总页数
    say(f"* 进入文件夹: {LOCALDATA['folder_name']}(共 {LOCALDATA['title_count']} 封)")
    read_folder_title()

#-------------------------------------------------------------------------------
# next_page
#-------------------------------------------------------------------------------

def next_page():
    
    # 没有翻页按钮，表示已到最后一页
    if not S('#nextpage').exists():
        say(f"* 文件夹邮件整理完成，正在合并数据")
        process_emails()

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

    say(f"* 正在收集第{LOCALDATA['token_page']+1}/{LOCALDATA['page_count']}页邮件信息，本页有 {folder_title_frame} 封邮件。({FOLDER_DATA['title_count']}/{LOCALDATA['title_count']})")

    #...........................................................................
    # 利用表达式的方法直接分类打包邮件数据
    # 虽然处理速度比起传统 for...in 方式不见得有快多少，主要是看着整齐，舒服。
    #...........................................................................
    
    folder_title = {
        'index'     :  [FOLDER_DATA['title_count'] + i for i in range(folder_title_frame)],                                                                               # 邮件序号
        'timestamp' :  [datetime.fromtimestamp(int(item.web_element.get_attribute('totime'))/1000).strftime("%Y-%m-%d %H:%M:%S") for item in find_all(S('.cx input'))],   # 发件时间
        'address'   :  [item.web_element.get_attribute('e') for item in find_all(S('nobr span'))],                                                                        # 发件人邮箱
        'title'     :  [item.web_element.text for item in find_all(S('u.tt'))],                                                                                           # 主题
        'name'      :  [item.web_element.get_attribute('n') for item in find_all(S('nobr span'))],                                                                        # 发件人
        'attach'    :  ['Ju' in item.web_element.get_attribute('class') for item in find_all(S('.cij'))],                                                                 # 是否有附件
        'mailid'    :  [item.web_element.get_attribute('mailid') for item in find_all(S('nobr'))],                                                                        # 邮件ID
        'star'      :  [bool(item.web_element.get_attribute('star')) for item in find_all(S('.cx input'))],                                                               # 是否星标
        'unread'    :  [bool(item.web_element.get_attribute('unread')) for item in find_all(S('.cx input'))],                                                             # 是否已读
        'page'      :  [int(S('#frm > div > .right').web_element.text.split('/')[0]) for _ in range(folder_title_frame)]                                                  # 当前页数
    }
    
    # 合并数据
    folder_data = [dict(zip(folder_title.keys(), values)) for values in zip(*folder_title.values())]

    # 邮件数量计数器
    FOLDER_DATA['title_count'] += folder_title_frame

    # 在 'title_list' 以文件夹页进行分组。
    LOCALDATA['title_list'].append(folder_data)

    # 打印到控制台 
    for item in folder_data:
        if item['attach']:
           say(f"{item['index']}\t{item['page']}\t{item['title']}") 
        else:
           say(f"{item['index']}\t{item['page']}\t{item['title']}\t\t没有附件", 'RED')

    #...........................................................................
    # 翻页
    #...........................................................................
    next_page()

#-------------------------------------------------------------------------------
# mail
#-------------------------------------------------------------------------------

def process_emails():
    # 临时数据初始化
    FOLDER_DATA['page'] = 0
    FOLDER_DATA['attach'] = 1
    LOCALDATA['attach_list'].append([])
    say('* 开始读取邮件')

    while FOLDER_DATA['page'] < LOCALDATA['page_count']:
        folder_title_count = len(LOCALDATA['title_list'][FOLDER_DATA['page']])
        say(f"* 正在收集第{FOLDER_DATA['page']}/{LOCALDATA['page_count']}页邮件。({FOLDER_DATA['title_index']}/{folder_title_count})")
        process_single_page()
        time.sleep(0.01)

    say_end()


def process_single_page():

    FOLDER_DATA['title_index'] = 0
    folder_title_count = len(LOCALDATA['title_list'][FOLDER_DATA['page']])

    while FOLDER_DATA['title_index'] < folder_title_count:
        open_mail()
        FOLDER_DATA['title_index'] = max(0, min(FOLDER_DATA['title_index']+1, folder_title_count))
        time.sleep(0.01)
    
    FOLDER_DATA['page'] = max(0, min(FOLDER_DATA['page']+1, LOCALDATA['page_count']))


def open_mail():
    
    # 带入临时数据
    item = LOCALDATA['title_list'][FOLDER_DATA['page']][FOLDER_DATA['title_index']]
    LOCALDATA['attach_list'].append([])

    # 跳转至邮件
    go_to(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/frame_html?t=newwin_frame&sid={LOCALDATA['token_sid']}&url=/cgi-bin/readmail?t=readmail%26mailid={item['mailid']}%26mode=pre")
    time.sleep(2)

    # 检测是否出现提示过于频繁
    FBI_WAITTING('#pageEnd')
    scroll_down(S("#pageEnd").y)

    #...........................................................................
    # 读取当前邮件的附件信息
    #...........................................................................  

    if S("#attachment").exists():
        try:
            read_attach()
        except:
            time.sleep(1)
            open_mail()
        return

    #...........................................................................
    # 若没有附件，进行标记
    #...........................................................................  

    # 设为星标
    if bool(PROFILE.can_star_no_attach):
        add_mail_star()

    # 添加标签
    if bool(PROFILE.can_tag_no_attach):
        add_mail_tag(PROFILE.str_tag_no_attach)

#-------------------------------------------------------------------------------
# attach
#-------------------------------------------------------------------------------

def read_attach():

    #...........................................................................
    # 读取页面附件信息
    #...........................................................................  

    # 带入临时数据
    title_data = LOCALDATA['title_list'][FOLDER_DATA['page']][FOLDER_DATA['title_index']]

    # 踩坑：这里用 S() 选择不到元素，只能通过 selenium 常规的办法 
    WebDriverWait(get_driver(), 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, MAIL_SELECTOR['attach_info_class'][MAILDOMIN])))
    attach_element = get_driver().find_elements(By.CSS_SELECTOR, MAIL_SELECTOR['attach_info_class'][MAILDOMIN])

    time.sleep(0.08)
    
    # 踩坑：超大附件的首个 idx 属性值为空。
    attach_info = []

    for item in attach_element:
        attach_info.append({
            'title_index': title_data['index'],
            'attach_index': FOLDER_DATA['attach'] + int(item.get_attribute('idx') or 0),
            'timestamp': title_data['timestamp'],
            'address': title_data['address'],
            'title': title_data['title'],
            'name': title_data['name'],
            'mailid': title_data['mailid'],
            'fileindex': int(item.get_attribute('idx') or 0),
            'filename': item.get_attribute('filename'),
            'filebyte': int(item.get_attribute('filebyte')),
            'fileview': item.get_attribute('viewmode'),
            'filedown': f"https://mail.qq.com{item.get_attribute('down')}"
        })

    time.sleep(0.02)

    # 合并数据
    attach_data = [data.copy() for data in attach_info]
    
    # 附件数量计数器
    FOLDER_DATA['attach'] += len(attach_data)
    
    # 让 'attach_list' 以文件夹页进行分组。
    LOCALDATA['attach_list'][FOLDER_DATA['title_index']].append(attach_data)

    #...........................................................................
    # 下载附件
    #...........................................................................   
    
    download_links = WebDriverWait(get_driver(), 5).until(EC.presence_of_all_elements_located((By.LINK_TEXT, '下载')))

    for item in attach_data:

        # 下载前，获取当前文件夹数量。
        # 踩坑：若文件包含乱码，则不会计入文件数量，导致数量对不上，但实际数量是正确的
        file_count = count_files_in_folder(PROFILE.DOWNLOAD_FOLDER)

        # 下载前，检测文件名是否规范
        if bool(PROFILE.can_tag_filename_attach) and not verify_filename_matching(item['filename']):
            add_mail_tag(PROFILE.str_tag_filename_attach)
            say(f"* {item['attach_index']}\t{FOLDER_DATA['attach_count']}\t{item['title_index']}\t{item['fileindex']}\t{item['filename']} 不规范的附件名。")
        
        # 下载前，检测文件是否已存在，若已存在则跳过。
        if bool(PROFILE.can_check_file_exists) and PROFILE.ready_download_but_exists == 'skip' and verify_file_matching(item['filename'], item['filebyte']):
            say(f"- {item['attach_index']}\t{FOLDER_DATA['attach_count']}\t{item['title_index']}\t{item['fileindex']}\t{item['filename']} 文件已存在，将跳过下载。")
            return
        
        # 下载
        get_driver().get(item['filedown'])
        time.sleep(0.5)

        say(f"+ {item['attach_index']}\t{FOLDER_DATA['attach_count']}/{file_count}\t{item['title_index']}\t{item['fileindex']}\t{item['filename']}")

        # 软计数，已执行下载的附件数量
        FOLDER_DATA['attach_count'] += 1

    time.sleep(0.5)
    

#-------------------------------------------------------------------------------
# file
#-------------------------------------------------------------------------------

# 根据邮件提供的文件属性，判断文件名是否规范
def verify_filename_matching(filename):
    pattern = r'\d{5,}'
    return bool(re.search(pattern, filename))

# 根据邮件提供的文件属性，判断文件是否存在，且文件大小相同
def verify_file_matching(filename, byte):
    try:
        path = os.path.join(PROFILE.DOWNLOAD_FOLDER, filename)
        verify = os.path.isfile(path) and os.path.getsize(path) == byte
        return verify
    except:
        return False

# 获取文件夹当前文件数量
def count_files_in_folder(folder_path):
    try:
        files = os.listdir(folder_path)
        invalid_patterns = ('.tmp', '.crdownload', '.DS_Store', '._')
        return sum(1 for f in files if os.path.isfile(os.path.join(folder_path, f)) and not any(p in f for p in invalid_patterns))
    except Exception as e:
        return -1

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

#-------------------------------------------------------------------------------
# utility
#-------------------------------------------------------------------------------

# 从URL链接中提取参数
def get_querystring(url):
    return dict(parse.parse_qsl(parse.urlsplit(url).query))


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

# 添加标签，若标签已经存在则跳过
def add_mail_tag(tagname):
    if S('#tagContainer').exists() and tagname in S('#tagContainer').web_element.text:
        return
    click(Text('标记为...'))
    click(Text(tagname, below=Text('取消标签')))

# 添加星标，若已星标则忽略
def add_mail_star():
    if S('#img_star').web_element.get_attribute('class') == 'qm_ico_flagoff': 
        click(S('#img_star'))

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
