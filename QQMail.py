#!/usr/bin/python
# -*- coding: utf-8 -*-

#===============================================================================
# * 声明
#===============================================================================
# 作者：XHXIAIEIN
# 更新：2022/11/02
# 主页：https://github.com/XHXIAIEIN/Auto-Download-QQEmail-Attach
#===============================================================================

#===============================================================================
# * 如何安装
#===============================================================================

#...............................................................................
#  0. 必要的运行环境
#...............................................................................
#  python3
#  https://www.python.org/
#...............................................................................
#  WebDriver for Chrome
#  https://sites.google.com/chromium.org/driver/
#...............................................................................
#  将下载好的 chromedriver 添加到环境变量中。
#...............................................................................


#...............................................................................
#  1.使用到的工具库
#...............................................................................
#  - helium         :    https://selenium-python-helium.readthedocs.io/
#  - prettytable    :    https://pypi.org/project/prettytable/
#...............................................................................

#...............................................................................
#  MAC用户，运行终端(Terminal) 输入以下指令：
#...............................................................................
#  brew install --cask helium
#  brew install --cask prettytable
#...............................................................................
# 注：需要先安装 Homebrew
# https://brew.sh/index_zh-cn
#...............................................................................

#...............................................................................
#  Windows用户，运行 cmd 在控制台输入以下指令：
#...............................................................................
#  python -m pip install --upgrade pip
#  pip install selenium
#  pip install helium
#  pip install prettytable
#...............................................................................
# 注：若因网络代理问题无法下载，可尝试使用国内的镜像源。
# pip install helium -i http://pypi.douban.com/simple --trusted-host pypi.douban.com
#...............................................................................

from helium import *
import selenium
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.action_chains import ActionChains
import math,time,os,re,codecs,sys,shutil,filecmp
import urllib.parse
import prettytable

#===============================================================================
# * 使用提示
#===============================================================================

#...............................................................................
#  运行脚本后，会开启一个浏览器窗口。
#
#  如果它一直停留在空白主页，或在QQ邮箱首页等很久(>5秒)都没开始登录账号：
#  你需要在浏览器窗口按一次Esc键，才会从浏览器主页跳转到QQ邮箱。原因不明。
#...............................................................................


'''
#===============================================================================
# * 自定义参数
#===============================================================================
'''

#...............................................................................
# MAC OS
#...............................................................................
# 实际上 MAC 的区别只是 WebDriver 在初始化的参数写法有点不同，其他都是一样的。
#...............................................................................

# 是否为Mac用户。如果是，请改为 1
is_mac_user = 0

#...............................................................................
# 禁止显示网页图片
#...............................................................................
# 下载附件时，建议禁止显示图片，可以显著提升网页处理的速度，至少可以快3倍。
# 
# 如果你是首次登录，必须先允许显示图片，否则无法进行滑块安全验证。
# 然后勾选"下次自动登录"，登录成功后关闭脚本和浏览器，再回到脚本开启禁用图片。
#...............................................................................
can_disabled_images = 0

#...............................................................................
# 腾讯企业邮箱
#...............................................................................
# 企业邮箱和QQ邮箱的账号密码是不同的。因此需要单独来设置一个。
#...............................................................................

# 是否为腾讯企业邮箱用户。如果是，请改为 1。并填入企业邮箱的账号密码
is_exmail_user = 0

# 企业邮箱账号密码
EX_QQNUMBER="name@company.onexmail.com"
EX_PASSWORD="helloworld"
 
#...............................................................................
#  QQ账号
#...............................................................................
# 如果你是企业邮箱用户，这里的QQ账号则不需要填，填上面那个。
#...............................................................................

QQNUMBER="134625798"
PASSWORD="134625798"
 
#...............................................................................
# 附件下载到哪个文件夹。
#...............................................................................
# 关于分割符：
#   Win 用户用 \\ 作为路径分隔符。如：'d:\\download\\email'
#   Mac 用户用  / 作为路径分隔符。如：'~/Downloads/email'
#...............................................................................

ROOTPATH = "D:\\XHXIAIEIN\\Downloads\\2022"
DOWNLOAD_FOLDER = os.path.join(ROOTPATH,'download')     # 附件实际下载目录
USERDATA_FOLDER = os.path.join(ROOTPATH,'selenium')     # 浏览器的缓存数据


#...............................................................................
#  邮箱文件夹ID
#...............................................................................
#
#  邮箱文件夹ID是个数字，如123, 198, 201。首页收件箱的文件夹序号是 1
#
#  普通邮箱用户：
#  展开左侧面板[我的文件夹]列表，找到你想下载的文件夹，右键-新窗口打开。
#  在新窗口的网址中找到参数 folderid 
#  mail.qq.com/cgi-bin/frame_html?t=frame_html&sid=x&url=/cgi-bin/mail_list?folderid={ 数字 }%26page=0
#  
#  企业邮箱用户：
#  按下键盘 Ctrl + Shift + C 审查元素，将移动鼠标到文件夹名称左边的{展开/收缩}的符号 (+ / -)
#  查看他上方弹出的网页元素ID属性，如：img#icon_129.fd_on，那么 129 就是文件夹ID
#...............................................................................

FOLDER_ID = 200

#-------------------------------------------------------------------------------
# 指定下载计划。
#-------------------------------------------------------------------------------
#  start:     从列表第n个开始。（包含n，即列表第一个就是n。）默认值：1
#  end:       到列表第n个结束。（包含n，即列表最后一个是n。）默认值：0
#  step:      从开始计算，累计n个结束。（包含start，即列表最终有n个）默认值：0
#  autoNext:  是否允许翻页。允许：1  /  禁用：0
#  relay:     邮件标题初始编号，若下载过程中断，可以通过它指定初始编号(title_index)，默认值：0
#  reverse:   翻页任务结束时，将邮件列表顺序反转，即根据{投稿时间}顺序下载附件。否则按默认{最新邮件}顺序下载。
#-------------------------------------------------------------------------------
 
# 邮件列表
TITLE_TASK = { 'start':1, 'step':0, 'end': 0,  'relay': 0}
 
# 翻页规则
PAGES_TASK = { 'start':1, 'step':0, 'end':0, 'autoNext': 1, 'reverse': 0}
 
#...............................................................................
# 邮件主题，关键词过滤
#...............................................................................
 
# 黑名单关键词。邮件主题如果包含了任意一个关键词，就忽略不下载。
# 示例：TITLE_BACKLIST_KEYS = ['发信方已撤回邮件','QQ会员业务通知邮件']
TITLE_BACKLIST_KEYS = ['发信方已撤回邮件']

# 白名单关键词。邮件主题必须包含白名单里的所有关键词。关键词越多，匹配规则越严格。
# 示例：TITLE_BACKLIST_KEYS = ['反馈','回复']
TITLE_WHITELIST_KEYS = ['']
 
#...............................................................................
# 附件过滤
#...............................................................................
 
# 文件类型黑名单。忽略指定类型的文件。不包含'.'
# 示例：ATTACH_BACKLIST_FILETYPE = ['psd','txt']
ATTACH_BACKLIST_FILETYPE = ['']

# 文件类型白名单。只下载指定类型的文件，不包含 '.'
# 只要满足任意一个关键词即可下载。
# ATTACH_WHITELIST_FILETYPE = ['jpg', 'jpeg', 'png', 'gif', 'webp']
ATTACH_WHITELIST_FILETYPE = ['']
 
 
#-------------------------------------------------------------------------------
# * Advanced Config 高级选项
#-------------------------------------------------------------------------------
# 禁用: 0       |     启用:  1
#-------------------------------------------------------------------------------

#···············································································
# 下载
#···············································································
 
# 是否需要下载附件
can_download_attach = 1
 
# 是否按邮件创建文件夹
can_move_folder = 0
 
# 是否重命名文件 
can_rename_file = 0


# 下载前，对比文件名以及文件大小，在本地是否存在相同文件。
# 'skip'    :  如果存在相同的文件名，并且文件大小相同。则跳过下载。
# 'continue':  继续下载，重复的文件名可能会自动被加上（1）这样的序号。
ready_download_but_file_exists = 'skip' or 'continue'
 
# 下载等待时长(单位：秒)。超过时长后则放弃后续操作，如移动文件夹或重命名。
downloading_timeout = 300
 

#···············································································
# 星标 / 标签
#···············································································
 
# 是否需要检查无附件/过期附件
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
 
 
#···············································································
# 控制台信息
#···············································································
 
# 是否需要 PrettyTable 来打印表格
can_print_prettytable = 1

# 是否在控制台显示邮件信息
can_print_title = 1
can_print_attch = 1
 
# 是否在控制台显示统计表格
can_print_title_table = 1
 
# 是否将 PrettyTable 数据导出为CSV文件
can_export_titledata_to_csv = 0
can_export_attchdata_to_csv = 0
 
#···············································································
# DEBUG
#···············································································
 
# 是否需要读取标题、邮件
can_load_title = 1
can_load_email = 1
can_load_attach = 1

#-------------------------------------------------------------------------------
# 重命名模板
#-------------------------------------------------------------------------------
# filename1       附件文件名(不包含扩展名）              例: 简历
# filename2       附件文件名(包含扩展名）                例: 简历.pdf
#···············································································
# extension1      附件扩展名(包含.)                      例: .jpg  .txt  .pdf
# extension2      附件扩展名(不包含.)                    例:  jpg   txt   pdf
#···············································································
# attchindex      计数：目前是第几个附件（不包含过期附件）          例:  0001
# titleindex      计数：目前是第几封邮件 (从1开始计数)              例:  0001
# pageindex       计数：目前是第几页 (从1开始计数)                  例:  001
# attchtitleindex 计数：在当前邮件中的多个附件的顺序 (从1开始计数)  例:  01
#···············································································
# titlecount      总数：本次下载计划的邮件数量                      例:  0
# attchcount      总数：本次下载计划的附件数量（包含过期附件）      例:  0
#···············································································
# folderid        文件夹：folder_id                      例:  129
# foldername      文件夹：名称                           例:  我的文件夹
# foldertitle     文件夹：邮件数量                       例:  500
# folderpage      文件夹：总页数                         例:  20
#···············································································
# titlename       邮件标题                               例:  小明_简历_2021
#···············································································
# nameid          发信方的邮箱昵称                       例:  小明
# address         发信方的邮箱地址                       例:  123456@qq.com, xiaomin233@vip.qq.com
# emailid         发信方的邮箱账号，通常是QQ号           例:  123456, xiaomin233
#···············································································
# year            发送时间：年  %Y                       例:  2020
# month           发送时间：月  %m                       例:  12
# day             发送时间：日  %d                       例:  07
#···············································································
# week            发送时间：周  %a                       例:  Mon 
# ampm            发送时间：上/下午 %p                   例:  AM
#···············································································
# hours           发送时间：时  %H                       例:  14 
# minutes         发送时间：分  %M                       例:  30 
# seconds         发送时间：秒  %S                       例:  59 
#···············································································
# time1           发送时间：格式化  %H%M                 例:  1430
# time2           发送时间：格式化  %H-%M-%S             例:  14-30-59
# time3           发送时间：格式化  %H'%M'%S             例:  14'30'59
#···············································································
# date1           发送时间：格式化  %m%d                 例:  1207
# date2           发送时间：格式化  %Y%m%d               例:  20201207
# date3           发送时间：格式化  %Y-%m-%d             例:  2020-12-07
#···············································································
# fulldate1       发送时间：格式化  %Y-%m-%d_%H-%M-%S    例:  2020-12-07_14-30-59
# fulldata2       发送时间：格式化  %Y%m%d_%H'%M'%S      例:  20201207_14'30'59
#···············································································

# 需要放到花括号里。例如 {attchindex}_{filename2} => 0001_作品.pdf

# 附件重命名规则。
# 示例1：{attchindex}_{filename2}      => 02_作品.pdf
# 示例2：{attchtitleindex}_{filename2} => 01_作品.pdf （推荐移动至文件夹时使用）
rule_rename = "{attchindex}_{filename2}"     
 
# 文件夹名称。
# 示例1：{titleindex}_{address}({date4}) => 01_123456@qq.com_2020-12-07_14-30-59
# 示例2：{titleindex}_{emailid}           => 02_123456
rule_folder = "{titleindex}_{emailid}"


'''
#===============================================================================
#                 " 请 勿 跨 过 这 块 区 域 修 改 内 容 "
#===============================================================================
'''

#-------------------------------------------------------------------------------
# variable
#-------------------------------------------------------------------------------

MAILDOMIN = is_exmail_user

LOCALDATA = {
  'token_domin'   : ['mail', 'exmail'][MAILDOMIN],
  'token_sid'     : '',
  'folder_id'     : FOLDER_ID,
  'token_page'    : 0,
  'folder_name'   : '',
  'folder_title'  : '',
  'show_count'    : 100,
  'max_page'      : 0,
  'title_index'   : 0,
  'attach_index'  : 0,
  'timeout_count' : 0,
  'title_count'   : 0,
  'attach_count'  : 0,
  'rule_rename'   : [],
  'rule_folder'   : [],
  'title_list'    : [],
  'folder_list'   : [],
  'attach_list'   : []
}

# 两种邮箱的元素选择器
MAIL_SELECTOR = {
  'title'                    : ['登录QQ邮箱'                       , '腾讯企业邮箱-登录入口'],
  'login_index'              : ['mail.qq.com'                     , 'exmail.qq.com/login'],
  'login_frame'              : ['#login_frame'                    , '#loginForm'],
  'login_container'          : ['.xm_login_card'                  , '.login_scan_panel'],
  'login_username'           : ['#u'                              , '#inputuin'],
  'login_password'           : ['#p'                              , '#pp'],
  'login_button'             : ['#login_button'                   , '#btlogin'],
  'login_autologin'          : ['#auto_login_qq'                  , '#auto_login_in_five_days_pwd'],
  'check_tag_scroll'         : ['#mainFrameContainer'             , '#contenttable'],
  'create_tag_scroll'        : ['#tag'                            , '#contenttable'],
  'create_tag_menu'          : ['#tag_QMMenu'                     , '#tag_i'],
  'create_tag_menuitem'      : ['#tag_QMMenu__menuitem_createtag' , '#tag_0_i__menuitem_createtag'],
  'create_tag_input'         : ['#QMconfirm_QMDialog_txt'         , '#QMconfirm_i_txt'],
  'create_tag_confirm'       : ['#QMconfirm_QMDialog_confirm'     , '#QMconfirm_i_confirm'],
  'create_tag_setting_xpath' : ["//a[starts-with(#id,'folder_tag_') and contains(#id, '_name')]", "//tr[starts-with(#id,'tag_')]/td[1]/div[2]/a"],
  'folder_mail_title'        : ['u.tt'                            , 'u.black'],
  'attach_info_class'        : ['ico_big'                         , 'down_big']
}

# 漂亮表格
PRETTY_TABLE = {}

# 开启DEBUG模式 [True, tickcount, flag]
DEBUG_MODE = [0, 0, 0]

# 用于结束任务的标记
END_FLAG = False

# 用于跳过邮件的标记
SKIP_FLAG = False

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
# debug function 
#-------------------------------------------------------------------------------

def test(name='', index=1, flag=0):
    DEBUG_MODE[1] += index
    if DEBUG_MODE[2] != 0 and flag == 0: return
    print(f"{DEBUG_MODE[1]} {name}")

def xprint(text):
    return False if DEBUG_MODE[0] == 1 else print(text)

def EXIT_MAIN():
    global END_FLAG
    END_FLAG = True

def SKIP_MAIL():
    global SKIP_FLAG
    SKIP_FLAG = True

def NEXT_MAIL():
    global SKIP_FLAG
    SKIP_FLAG = False

#-------------------------------------------------------------------------------
# prettytable 打印好看的表格
#-------------------------------------------------------------------------------

def init_prettytable():

    if not bool(can_print_prettytable): return

    if DEBUG_MODE[0]: test('init_prettytable')

    # 邮件标题
    PRETTY_TABLE['title_list'] = prettytable.PrettyTable()
    PRETTY_TABLE['title_list'].field_names = ['index', 'page', 'name', 'title', 'email', 'timestamp']
    PRETTY_TABLE['title_list'].align = 'l'
    
    # 邮件附件
    PRETTY_TABLE['attach_list'] = prettytable.PrettyTable()
    PRETTY_TABLE['attach_list'].field_names = ['count','filename','index','name','title','email','fileindex','filebyte','filetype','page','timeout','timestamp']
    PRETTY_TABLE['attach_list'].align = 'l'
    
    # 过期附件
    PRETTY_TABLE['attach_timeout'] = prettytable.PrettyTable()
    PRETTY_TABLE['attach_timeout'].field_names = ['count','filename','index','name','title','email','fileindex','filebyte','filetype','page','timeout','timestamp']
    PRETTY_TABLE['attach_timeout'].align = 'l'
  
    # 标题黑名单
    if TITLE_BACKLIST_KEYS != [''] or TITLE_BACKLIST_KEYS != ['']:
        PRETTY_TABLE['title_backlist'] = prettytable.PrettyTable()
        PRETTY_TABLE['title_backlist'].field_names = ['index', 'page', 'name', 'title', 'email', 'timestamp']
        PRETTY_TABLE['title_backlist'].align = 'l'
  
    # 附件黑名单
    if ATTACH_BACKLIST_FILETYPE != [''] or ATTACH_WHITELIST_FILETYPE != ['']:
        PRETTY_TABLE['attach_backlist'] = prettytable.PrettyTable()
        PRETTY_TABLE['attach_backlist'].field_names = ['count','filename','index','name','title','email','fileindex','filebyte','filetype','page','timeout','timestamp']
        PRETTY_TABLE['attach_backlist'].align = 'l'
  
    # 文件夹列表
    # if bool(can_print_folder): 
    #     PRETTY_TABLE['folder_list'] = prettytable.PrettyTable()
    #     PRETTY_TABLE['folder_list'].field_names = ['index', 'folderid', 'name']
    #     PRETTY_TABLE['folder_list'].align = 'l'

#-------------------------------------------------------------------------------
# webdriver
#-------------------------------------------------------------------------------

def init_webdriver():

    prefs = {
        'download.directory_upgrade': True,
        'download.prompt_for_download': 'false',
        'profile.default_content_settings.multiple-automatic-downloads': 1,
        'download.default_directory': DOWNLOAD_FOLDER
    }

    options = ChromeOptions()
    options.add_experimental_option('prefs', prefs)
    options.add_argument('--window-size=1000,1500')
    options.add_argument('--dns-prefetch-disable')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    # 禁止网页显示图片
    if bool(can_disabled_images): options.add_argument('--blink-settings=imagesEnabled=false')
    
    # 如果无法启动，请检查环境变量 PATH 是否正确填写了 chromedriver 的路径。
    # 没错，WIN 和 MAC 的区别只是多个 = 符号的区别（x
    # ['WIN', 'MAC'][0]
    options.add_argument([f'--user-data-dir={USERDATA_FOLDER}', f'--user-data-dir {USERDATA_FOLDER}'][bool(is_mac_user)])    
    
    # 启动浏览器
    try:
        chrome = start_chrome(options=options)
    except Exception as e: 
        if type(e) is selenium.common.exceptions.SessionNotCreatedException:
            print(f"{C.RED}ChromeDriver 版本已经更新，请前往 https://sites.google.com/chromium.org/driver/ 下载最新的版本，并添加到环境变量。{C.END}")
        elif type(e) is selenium.common.exceptions.WebDriverException:
            print(f"{C.RED}已经运行了一个实例，无法同时开启多个，请关闭脚本后重新尝试。{C.END}")
        else:
            print(sys.exc_info()[0:2])
        
        print(f"\n{C.RED}{e}{C.END}\n\n")
        os.system('PAUSE')
    
    set_driver(chrome)
    
    print(f"如果页面等待时间过长(大于5秒)，可尝试在浏览器页面按一次Esc键。")

#-------------------------------------------------------------------------------
# login functions
#-------------------------------------------------------------------------------

def login_qqmail():
    if DEBUG_MODE[0]: test('login_qqmail')

    while S(MAIL_SELECTOR['login_container'][MAILDOMIN]).exists():

        if S("#login_wx_iframe").exists(): 
            click(Text('QQ登录'));

        # 帐号密码登录
        if S('#switcher_plogin').exists(): 
            click(S('#switcher_plogin'));

        # 勾选下次自动登录
        if S(MAIL_SELECTOR['login_autologin'][MAILDOMIN]).web_element.get_attribute('class') != 'xm_login_card_checked': 
            click(S(MAIL_SELECTOR['login_autologin'][MAILDOMIN]))

        # 快速登录
        if S(f"#img_out_{QQNUMBER}").exists(): 
            click(S('a.face'))
            time.sleep(2)
            break

        # 开始输入账号密码
        write(QQNUMBER, S(MAIL_SELECTOR['login_username'][MAILDOMIN]))
        write(PASSWORD, S(MAIL_SELECTOR['login_password'][MAILDOMIN]))
        click(S(MAIL_SELECTOR['login_button'][MAILDOMIN]))

        # 等待安全验证
        once = True
        while S("#login_frame").exists():
            if once: xprint(f"{C.FLASHANI}等待用户手动完成认证...{C.END}"); once = False;
            time.sleep(1)
        wait_until(S('#mainFrameContainer').exists)


def login_exmail():
    if DEBUG_MODE[0]: test('login_exmail')
    while S(MAIL_SELECTOR['login_container'][MAILDOMIN]).exists():
        # 如果默认显示是微信扫码登录，则切换到帐号密码登录
        click('帐号密码登录')
        # 点击自动登录后 #auto_login_in_five_days_pwd 没有任何反馈，非常奇怪。
        click('5天内自动登录')
        # 开始输入账号密码
        write(EX_QQNUMBER, S(MAIL_SELECTOR['login_username'][MAILDOMIN]))
        write(EX_PASSWORD, S(MAIL_SELECTOR['login_password'][MAILDOMIN]))
        click(S(MAIL_SELECTOR['login_button'][MAILDOMIN]))

    # 等待选择账号
    once = True
    while S('#accountList').exists():
        if once: xprint(f"{C.FLASHANI}等待选择要登录的账号...{C.END}"); once = False;
        time.sleep(1)

def update_token_sid():
    if DEBUG_MODE[0]: test('update_token_sid')
    try:
        LOCALDATA['token_sid'] = get_driver().current_url.split('sid=')[1].split('&')[0]
    except Exception as e:
        xprint(f"{C.RED} ...{C.END}");
        return
        



#-------------------------------------------------------------------------------
# check folder function
#-------------------------------------------------------------------------------

# 展开文件夹列表
def check_folder_in_list():
    if DEBUG_MODE[0]: test('check_folder_in_list')

    # 展开文件夹列表
    get_driver().execute_script("showFolders('personal', true)")
    wait_until(lambda: S('#personalfoldersDiv > ul#personalfolders').exists())

    for i, e in enumerate([find_all(S('#personalfolders > li > a'))][0], start=1):
        aid = e.web_element.get_attribute('id').split('_')[1]
        atl = e.web_element.get_attribute('title')
        LOCALDATA['folder_list'].append({'index':f"{i:02}", 'id':int(aid), 'name':re.sub(r'未读邮件(.*?)封','',atl)})

    get_driver().execute_script("showFolders('personal', false)")
    wait_until(S('#tagfoldersDiv').exists)

    if bool(can_print_prettytable):
        for a in LOCALDATA['folder_list']: PRETTY_TABLE['folder_list'].add_row([a['index'], a['id'], a['name']])
        xprint(PRETTY_TABLE['folder_list'])
    else:
        for a in LOCALDATA['folder_list']: xprint([a['index'], a['id'], a['name']])

# 嘻嘻 纯属恶趣味 :)
def check_folder_in_setting():
    if DEBUG_MODE[0]: test('check_folder_in_setting')
    xprint(f"{C.RED}你没有创建过文件夹。{C.END}")
    xprint(f"{C.RED}你填写想下载的文件夹也不是首页收件箱。{C.END}")
    xprint(f"{C.RED}你到底想干嘛？？{C.END}")
    xprint(f"\n\n{C.GOLD}如果你打算继续执行，将会为你转去下载{C.GREEN}收件箱{C.GOLD}的附件。{C.END}")
    os.system("PAUSE")
    LOCALDATA['folder_id'] = 1


#-------------------------------------------------------------------------------
# check tags function
#-------------------------------------------------------------------------------

def goto_setting():
    if DEBUG_MODE[0]: test('goto_setting')
    scroll_down(S("#topDataTd").y)
    click(Text('设置', to_right_of='邮箱首页'))
    click(Text('文件夹和标签', to_right_of='反垃圾'))
    click(Text('标签', to_right_of='我的文件夹')) if not bool(is_exmail_user) else click(Text('我的标签', below='我的文件夹')) 

def create_tag_in_list(tag):
    if DEBUG_MODE[0]: test(f"create_tag_in_list\t{tag}")
    rightclick(S('#tagfoldersDiv'))
    click(Text('新建标签'))
    write(f'{tag}', S(MAIL_SELECTOR['create_tag_input'][MAILDOMIN]))
    click(S(MAIL_SELECTOR['create_tag_confirm'][MAILDOMIN]))

def create_tag_in_setting(tag):
    if DEBUG_MODE[0]: test(f"create_tag_in_setting\t{tag}")
    scroll_down(S(MAIL_SELECTOR['create_tag_scroll'][MAILDOMIN]).y)
    get_driver().execute_script("createTag()")
    write(f'{tag}', S(MAIL_SELECTOR['create_tag_input'][MAILDOMIN]))
    click(S(MAIL_SELECTOR['create_tag_confirm'][MAILDOMIN]))

def check_tag_exists(tag, tags, type, desc):
    check = bool(tag) and (tag not in tags)
    if DEBUG_MODE[0]: test(f"check_tag_exists\t{tag} {'' if bool(check) else 'pass'}")
    if bool(check):
        xprint(f"{C.BLUE}[新增标签]{C.END} '{C.GREEN}{tag}{C.END}' 此标签不存在，将自动新建。（用于标记{desc}的邮件）")
        create_tag_in_list(tag) if type == 'list' else create_tag_in_setting(tag) 

def check_tag_exists_in_list():
    if DEBUG_MODE[0]: test('check_tag_exists_in_list')
    scroll_down(S("#mainFrameContainer").y)
    # 展开列表
    get_driver().execute_script("showFolders('tag', true)")
    wait_until(lambda: S("#tagfoldersDiv > ul#tagfolders").exists())
    # 读取列表
    tags = [re.sub(r' 未读邮件(.*?)封','',tag.web_element.get_attribute('title')) for tag in find_all(S('#tagfolders > li > a'))]
    if bool(can_tag_no_attach): check_tag_exists(str_tag_no_attach, tags, 'list', '没有附件')
    if bool(can_tag_timeout_attach): check_tag_exists(str_tag_timeout_attach, tags, 'list', '包含过期附件')
    # 折叠列表
    get_driver().execute_script("showFolders('tag', false)")

def check_tag_exists_in_setting():
    if DEBUG_MODE[0]: test('check_tag_exists_in_setting')
    xprint(f"{C.SILVER}[跳转提示]{C.END} 你的邮箱从没有设置过标签，正在跳转到邮箱设置[文件夹和标签]。")
    # 进入设置页面
    goto_setting()
    scroll_down(S(MAIL_SELECTOR['check_tag_scroll'][MAILDOMIN]).y)

    # 如果从未创建过标签
    if S('#folder_tag_none').exists():
        if bool(can_tag_no_attach): create_tag_in_setting('没有附件')
        if bool(can_tag_timeout_attach): create_tag_in_setting('过期附件')
    else:
        # 读取列表
        tags = [e.text for e in get_driver().find_elements_by_xpath(MAIL_SELECTOR['create_tag_setting_xpath'][MAILDOMIN])]
        if bool(can_tag_no_attach): check_tag_exists(str_tag_no_attach, tags, 'setting', '没有附件')
        if bool(can_tag_timeout_attach): check_tag_exists(str_tag_timeout_attach, tags, 'setting', '过期附件')


#-------------------------------------------------------------------------------
# foreach folder mail tiele
#-------------------------------------------------------------------------------

def update_folder_info():

    goto(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={LOCALDATA['token_page']}&sid={LOCALDATA['token_sid']}&nocheckframe=true")

    scroll_down(S('#list').y)

    # 如果文件夹里没有邮件
    if S('div.nomail').exists():
        xprint(f"{C.RED}这个文件夹里没有邮件，请检查一下文件夹ID是否填写正确。{C.END}")
        EXIT_MAIN()
        return

    # 读取文件夹名称、总邮件数
    LOCALDATA['folder_name'] = get_driver().title.split(" - ")[1]
    LOCALDATA['folder_title'] = int(S('#_ut_c').web_element.text)
    xprint(f"{C.GOLD}[进入文件夹] {LOCALDATA['folder_name']} (共 {LOCALDATA['folder_title']} 封){C.END}")

    # 读取当前页数
    LOCALDATA['token_page'] = int(S('#frm > div > .right').web_element.text.split('/')[0])
    LOCALDATA['max_page'] = int(S('#frm > div > .right').web_element.text.split('/')[1].split(' 页')[0])

    # 分析每页显示多少封邮件
    scroll_down(S('#frm').height)
    LOCALDATA['show_count'] = len(find_all(S(MAIL_SELECTOR['folder_mail_title'][MAILDOMIN])))

    if DEBUG_MODE[0]: test(f"update_folder_info\t{LOCALDATA['token_page']}/{LOCALDATA['max_page']}")


# 明明是很简单的东西，因为注释太多看起来好可怕。。哈哈
# 其实就是检查 PAGES_TASK 和 TITLE_TASK 的数值是不是在正常范围/
# 以及在首次打开时自动翻页或跳过前面的。
def init_folder_task():
    if DEBUG_MODE[0]: test('init_folder_task')

    xprint(f'----------------------------------------------')
    xprint(f"PAGES_TASK:{PAGES_TASK}")
    xprint(f'TITLE_TASK:{TITLE_TASK}')
    xprint(f'----------------------------------------------\n')
    
    # PAGES_TASK
    if PAGES_TASK['start'] > PAGES_TASK['end'] and PAGES_TASK['end'] > 1 and PAGES_TASK['start'] > 1:
        xprint(f"{C.BGPURPLE}[参数异常]{C.END} PAGES_TASK start 不能大于 end ")
        if PAGES_TASK['step'] >= 1: 
            PAGES_TASK['end'] = -1
            xprint(f"{C.GREEN}[自动修正]{C.END} PAGES_TASK[end] = {C.GREEN}{PAGES_TASK['end']}{C.END}")
        else:
            PAGES_TASK['start'] = 1
            xprint(f"{C.GREEN}[自动修正]{C.END} PAGES_TASK[start] = {C.GREEN}{PAGES_TASK['end']}{C.END}")

    # TITLE_TASK
    if PAGES_TASK['start'] > 1 and TITLE_TASK['start'] < (PAGES_TASK['start'] * LOCALDATA['show_count']):
        xprint(f"{C.BGPURPLE}[参数异常]{C.END} TITLE_TASK[start] 不能小于 {C.GREEN}{PAGES_TASK['start'] * LOCALDATA['show_count']}{C.END} ({PAGES_TASK['start']} * {LOCALDATA['show_count']})")
        TITLE_TASK['start'] = (PAGES_TASK['start'] - 1) * LOCALDATA['show_count'] + 1 if TITLE_TASK['step'] > 1 else 1
        xprint(f"{C.GREEN}[自动修正]{C.END} TITLE_TASK[start] = {TITLE_TASK['start']}")

    # 从第几页开始
    if PAGES_TASK['start'] > 1 and TITLE_TASK['start'] < (PAGES_TASK['start'] * LOCALDATA['show_count']): 
        LOCALDATA['token_page'] = max(1, PAGES_TASK['start'])-1
        xprint(f"{C.GREEN}[自动修正]{C.END} PAGES_TASK[start] = {PAGES_TASK['start']}\t{C.GOLD}即将跳转至第{int(LOCALDATA['token_page'])+1}页。{C.END}")
    elif PAGES_TASK['start'] > 1 and TITLE_TASK['start'] >= LOCALDATA['show_count']:
        LOCALDATA['token_page'] = max(1, math.ceil(TITLE_TASK['start']/LOCALDATA['show_count']))-1
        xprint(f"{C.GREEN}[自动修正]{C.END} TITLE_TASK[start] = {PAGES_TASK['start']}\t第 {TITLE_TASK['start']} 封邮件位于第 {int(LOCALDATA['token_page'])+1} 页 (当前每页显示 {LOCALDATA['show_count']} 封)")
    else:
        LOCALDATA['token_page'] = 0

    # 跳转到目标页数
    if LOCALDATA['token_page'] >= 1:
        LOCALDATA['title_index'] = LOCALDATA['token_page'] * LOCALDATA['show_count']
        xprint(f"{C.GREEN}[自动修正]{C.END} 由于 LOCALDATA['token_page'] = {PAGES_TASK['token_page']}\t即将从第{C.GREEN}{LOCALDATA['title_index']}{C.END} 封邮件开始计数。")
        goto(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={LOCALDATA['token_page']}&sid={LOCALDATA['token_sid']}&nocheckframe=true")

def load_folder_title():

    if DEBUG_MODE[0]: test(f"load_folder_title")

    # 读取当前页面所有标题名称
    namelist = [item.web_element.text for item in find_all(S(MAIL_SELECTOR['folder_mail_title'][MAILDOMIN]))]
    maillist = find_all(S("input[name='mailid']"))

    if TITLE_TASK['relay'] >= 1: LOCALDATA['title_index'] = TITLE_TASK['relay'] - 1

    # 开始遍历
    for i, e in enumerate(maillist, start=0):
        title = {}
        title.update({'index'     : TITLE_TASK['relay'] + i if not bool(PAGES_TASK['reverse']) else TITLE_TASK['relay']+LOCALDATA['folder_title']-len(LOCALDATA['title_list'])  })
        title.update({'page'      : int(LOCALDATA['token_page'])+1})
        title.update({'name'      : e.web_element.get_attribute('fn')})
        title.update({'email'     : e.web_element.get_attribute('fa')})
        title.update({'mailid'    : e.web_element.get_attribute('value')})
        title.update({'timestamp' : time.localtime(float(int(e.web_element.get_attribute('totime'))/1000))})
        title.update({'title'     : namelist[i]})

        # 标题黑名单
        if TITLE_BACKLIST_KEYS != [''] and any([key in namelist[i] for key in TITLE_BACKLIST_KEYS]): 
            xprint(f"{C.GREY}[黑名单] 邮件标题包含黑名单关键词，已跳过：{namelist[i]}{C.END}")
            if bool(can_print_prettytable): PRETTY_TABLE['title_backlist'].add_row([title['index'], title['page'], title['name'], title['title'], title['email'], time.strftime('%Y-%m-%d %H:%M:%S',title['timestamp'])])
            continue
        
        # 标题白名单
        if TITLE_WHITELIST_KEYS != [''] and not all([key in namelist[i] for key in TITLE_WHITELIST_KEYS]): 
            xprint(f"{C.SILVER}[白名单] 邮件标题不包含白名单关键词，已跳过：{namelist[i]}{C.END}")
            if bool(can_print_prettytable): PRETTY_TABLE['title_backlist'].add_row([title['index'], title['page'], title['name'], title['title'], title['email'], time.strftime('%Y-%m-%d %H:%M:%S',title['timestamp'])])
            continue
        
        # TITLE_TASK['start']
        if TITLE_TASK['start'] > 1 and title['index'] < TITLE_TASK['start']:
            xprint(f"{C.GREY}[TITLE_TASK: start] 跳过。{title['index']} / {TITLE_TASK['start']}{C.END}")
            continue

        if bool(can_print_prettytable): 
            PRETTY_TABLE['title_list'].add_row([title['index'], title['page'], title['name'], title['title'], title['email'], time.strftime('%Y-%m-%d %H:%M:%S',title['timestamp'])])
        
        # 是否需要打印到控制台
        if bool(can_print_title):
            xprint(f"+ {title['index']:<4}: {title['page']}\t{title['email']:<24}\t{title['name']:<24}\t{title['title']}") 
        
        LOCALDATA['title_list'].append(title)

        # TITLE_TASK['end']
        if TITLE_TASK['end'] >= 1 and len(LOCALDATA['title_list']) >= TITLE_TASK['end']:
            xprint(f"{C.BGPURPLE}[TITLE_TASK: end]{C.END} 任务结束。{TITLE_TASK['start']} / {TITLE_TASK['end']}")
            PAGES_TASK['autoNext'] = 0
            break
        
        # TITLE_TASK['step']
        if TITLE_TASK['step'] >= 1 and len(LOCALDATA['title_list']) > TITLE_TASK['start'] + TITLE_TASK['step']:
            xprint(f"{C.BGPURPLE}[TITLE_TASK: step]{C.END} 任务结束。{TITLE_TASK['start']}(+{TITLE_TASK['step']}) -> {len(LOCALDATA['title_list'])}")
            PAGES_TASK['autoNext'] = 0
            break
    

def foreach_folder_title():

    if DEBUG_MODE[0]: test('foreach_folder_title')

    # 用于标记能否继续下一页
    can_next_page = 1

    # 读取标题列表
    while bool(can_next_page) and LOCALDATA['token_page'] < LOCALDATA['max_page']:

        # 读取当前页数
        LOCALDATA['token_page'] = int(S('#frm > div > .right').web_element.text.split('/')[0]) -1
        # xprint(f"\n{C.BGWHITE} ▶  {LOCALDATA['folder_name']} {int(LOCALDATA['token_page'])+1} / {LOCALDATA['max_page']}{C.END}  ")
        
        # 读取邮件标题
        if bool(can_load_title): load_folder_title() 

        # PAGES_TASK['autoNext']
        if not bool(PAGES_TASK['autoNext']):
            xprint(f"{C.BGPURPLE}[PAGES_TASK: autoNext]{C.END} 任务结束。{LOCALDATA['token_page']+1} / {LOCALDATA['max_page']}")
            break
        
        # PAGES_TASK['end']
        if PAGES_TASK['end'] >= 1 and int(LOCALDATA['token_page'])+1 > PAGES_TASK['end']:
            xprint(f"{C.BGPURPLE}[PAGES_TASK: end]{C.END} 任务结束。{int(LOCALDATA['token_page'])+1} / {LOCALDATA['max_page']}")
            break
        
        # 是否有翻页按钮
        if not bool(find_all(S('#nextpage'))): 
            # xprint(f"\n{C.BGBLUE}翻页到底了{C.END} {int(LOCALDATA['token_page'])+1} / {LOCALDATA['max_page']}")
            break

        # 下一页。 exmail 的下一页没有 page 参数
        next_btn = S('#nextpage').web_element
        nextpage = int(next_btn.get_attribute("page")) if not bool(is_exmail_user) else int(get_querystring(next_btn.get_attribute("href"))['page'])

        # PAGES_TASK['step']
        if PAGES_TASK['step'] >= 1 and nextpage < PAGES_TASK['start'] + PAGES_TASK['step']:
            xprint(f"{C.BGPURPLE}[PAGES_TASK: step]{C.END} 任务结束。{int(LOCALDATA['token_page'])+1}({int(LOCALDATA['token_page'])+1} + {PAGES_TASK['step']}) / {LOCALDATA['max_page']}")
            break
        
        # 进入下一页
        goto(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={nextpage}&sid={LOCALDATA['token_sid']}&nocheckframe=true")
        time.sleep(1)
        
        try: wait_until(S('#frm').exists)
        except: xprint(f"\n{C.RED}等待超时{C.END}")
            
        # 您请求的频率太快，请稍后再试
        FBI_WAITTING('#frm')

        scroll_down(S('#frm').height)
    
    # 根据投稿时间顺序下载附件
    if bool(PAGES_TASK['reverse']): 
        LOCALDATA['title_list'] = LOCALDATA['title_list'][::-1]
        PRETTY_TABLE['title_list'] = PRETTY_TABLE['title_list'][::-1]

    # 文件夹遍历完毕。打印好看的表格
    if bool(can_print_title_table):  
        if bool(can_print_prettytable): xprint(f"\n\n{PRETTY_TABLE['title_list']}\n")
        xprint(f"\n共有{len(LOCALDATA['title_list'])}封邮件。\n\n")


#-------------------------------------------------------------------------------
# WAITTING
#-------------------------------------------------------------------------------

# 频繁提示，自动刷新至页面出现
def FBI_WAITTING(id):
    if S(id).exists(): return
    if DEBUG_MODE[0]: test('FBI_WAITTING')
    wait = 0
    while not S(id).exists():
        if wait == 0: time.sleep(10); refresh()
        elif wait == 2: time.sleep(5); refresh()
        elif wait%3 == 0: time.sleep(3); refresh()
        else:time.sleep(1)
        wait+=1


#-------------------------------------------------------------------------------
# foreach mail attach
#-------------------------------------------------------------------------------

def foreach_read_mail():
    if DEBUG_MODE[0]: test('foreach_read_mail')

    # 先检查文件夹是否存在
    if bool(can_download_attach): check_folder_exists(DOWNLOAD_FOLDER, 1)

    # 开始遍历
    for title in LOCALDATA['title_list']:
        
        goto(f"https://{LOCALDATA['token_domin']}.qq.com/cgi-bin/frame_html?t=newwin_frame&sid={LOCALDATA['token_sid']}&url=/cgi-bin/readmail?t=readmail%26mailid={title['mailid']}%26mode=pre")
        time.sleep(1)

        # 统计数量
        LOCALDATA['title_index'] += 1
        
        NEXT_MAIL()

        # 您请求的频率太快，请稍后再试
        FBI_WAITTING('#mainmail')

        # 邮件是否包含附件
        if bool(can_check_no_attach): check_no_attach(title)

        # 如果此邮件没有邮件，跳过这封邮件
        if bool(SKIP_FLAG): continue

        # 如果不需要读取附件
        if not bool(can_load_attach): return

        # 是否包含过期文件
        if bool(can_check_timeout_attach): check_timeout_attach(title)

        # 开始读取附件
        foreach_mail_attach(title)
        

#---------------------------------------------------------------------------
# check attach exists
#---------------------------------------------------------------------------

def check_no_attach(title):
    if S("#attachment").exists(): return False
    if DEBUG_MODE[0]: test('check_no_attach')

    xprint(f"{C.RED}[没有附件] {title['index']:<4}: {title['email']:<24}\t{title['name']:<24}\t{title['title']}{C.END}")
    
    # 设为星标
    if bool(can_star_no_attach):
        if S('#img_star').web_element.get_attribute('class') == 'qm_ico_flagoff': click(S('#img_star'))
  
    # 添加标签
    if bool(can_tag_no_attach):
        click(Text('标记为...'))
        click(Text(str_tag_no_attach, below=Text('取消标签')))

    SKIP_MAIL()

def check_timeout_attach(title):
    if not Text("已过期").exists(): return False
    if DEBUG_MODE[0]: test('check_timeout_attach')

    xprint(f"{C.BGRED}![过期附件] {title['index']:<4}: {title['email']:<24}\t{title['title']:<24} 包含过期附件 {C.END}")
    
    # 设为星标
    if bool(can_star_timeout_attach):
        if S('#img_star').web_element.get_attribute('class') == 'qm_ico_flagoff': click(S('#img_star'))

    # 添加标签
    if bool(can_tag_timeout_attach):
        click(Text('标记为...', to_left_of=Text('移动到...')))
        wait_until(S('#select_QMMenu__menuall_').exists)
        click(Text(str_tag_timeout_attach, below=Text('取消标签')))

#---------------------------------------------------------------------------
# attach
#---------------------------------------------------------------------------

def load_attach_info(i, e, title, exmail):
    if DEBUG_MODE[0]: test('load_attach_info')
    scroll_down(S("#pageEnd").y)

    attach={}
    
    if bool(is_exmail_user):
        fn = exmail['filename'][i]
        attach.update({'filename' : fn if bool(fn.find('<div class="full_title">')) else fn.split('>')[1].split('<')[0]})
        attach.update({'filetype' : attach['filename'].split('.')[-1].lower()})
        attach.update({'filebyte' : exmail['filebyte'][i]})
        attach.update({'filedown' : exmail['filedown'][i]})
        attach.update({'index'    : str(i)})
        attach.update({'timeout'  : 0}) # TODO 注，由于目前我还没在企业邮箱测试超大附件，因此不知道它是以什么形式出现。
    else:
        attach.update({'filename' : e.get_attribute('filename')})
        attach.update({'filetype' : e.get_attribute('filename').split('.')[-1].lower()})
        attach.update({'filebyte' : int(e.get_attribute('filebyte'))})
        attach.update({'filedown' : "https://mail.qq.com" + e.get_attribute('down')})
        attach.update({'index'    : int(e.get_attribute('idx') or 0)+1})
        attach.update({'timeout'  : int(e.get_attribute('timeout') or 0)})  # 只有超大附件(bigattach="1") 有("timeout"= 0 or 1)参数。普通附件(attach="1")没有。 

    attach.update({'ti':title['index']})
    attach.update({'tn':title['name']})
    attach.update({'tt':title['title']})
    attach.update({'page':title['page']})
    attach.update({'email':title['email']})
    attach.update({'timestamp':title['timestamp']})
    
    return attach

def foreach_mail_attach(title):
    if DEBUG_MODE[0]: test('foreach_mail_attach')

    scroll_down(S("#pageEnd").y)
    elements = [e.find_elements_by_tag_name('a')[0] for e in get_driver().find_elements_by_class_name(MAIL_SELECTOR['attach_info_class'][MAILDOMIN])]
    
    exmail_attach_list = {}

    if bool(is_exmail_user):
        exmail_attach_list['filename'] = [e.get_attribute('innerHTML') for e in get_driver().find_elements_by_class_name('info_name')]
        exmail_attach_list['filebyte'] = [e.text for e in get_driver().find_elements_by_class_name('info_size')]
        exmail_attach_list['filedown'] = [e.get_attribute('href') for e in get_driver().find_elements_by_class_name('attach_download')]

    for i, e in enumerate(elements, start=0):

        attach = load_attach_info(i, e, title, exmail_attach_list)
        LOCALDATA['attach_list'].append(attach)

        # 漂亮表格
        if bool(can_print_prettytable): 
            PRETTY_TABLE['attach_list'].add_row([f"{LOCALDATA['attach_index']:04}", attach['filename'], title['index'], title['name'], title['title'], title['email'], attach['index'], attach['filebyte'], attach['filetype'], title['page'], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
        
        # 附件类型黑名单
        if ATTACH_BACKLIST_FILETYPE != [''] and any([key in attach['filetype'] for key in ATTACH_BACKLIST_FILETYPE]):
            xprint(f"{C.SILVER}* {title['index']:<4}\t{LOCALDATA['attach_index']:04}: {title['email']:<24}\t{title['name']:<24}\t{attach['filename']}{C.END}")
            if bool(can_print_prettytable): PRETTY_TABLE['attach_backlist'].add_row([f"{LOCALDATA['attach_index']+1:04}", attach['filename'], title['index'], title['name'], title['title'], title['email'], attach['index'], attach['filebyte'], attach['filetype'], title['page'], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            continue
        
        # 附件类型白名单
        if ATTACH_WHITELIST_FILETYPE != [''] and not all([key in attach['filetype'] for key in ATTACH_WHITELIST_FILETYPE]): 
            xprint(f"{C.SILVER}* {title['index']:<4}\t{LOCALDATA['attach_index']:04}: {title['email']:<24}\t{title['name']:<24}\t{attach['filename']}{C.END}")
            if bool(can_print_prettytable): PRETTY_TABLE['attach_backlist'].add_row([f"{LOCALDATA['attach_index']+1:04}", attach['filename'], title['index'], title['name'], title['title'], title['email'], attach['index'], attach['filebyte'], attach['filetype'], title['page'], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            continue

        # 该附件是否已过期
        if bool(attach['timeout']):
            xprint(f"{C.RED}* {title['index']:<4}\t{LOCALDATA['attach_index']:04}: {title['email']:<24}\t{title['name']:<24}\t{attach['filename']}{C.END}")
            LOCALDATA['timeout_count']+=1
            if bool(can_print_prettytable): PRETTY_TABLE['attach_timeout'].add_row([f"{LOCALDATA['attach_index']+1:04}", attach['filename'], title['index'], title['name'], title['title'], title['email'], attach['index'], attach['filebyte'], attach['filetype'], title['page'], attach['timeout'], time.strftime("%Y-%m-%d %H:%M:%S",title['timestamp'])])
            break
        
        # 统计附件数量
        LOCALDATA['attach_index'] += 1

        time.sleep(1)

        # 初始化重命名模板
        if bool(can_move_folder) or bool(can_rename_file): ready_replace_name(attach, title)

        # 下载前检查文件是否已存在，如果存在跳过下载。
        if ready_download_but_file_exists == 'skip': check_file_exists(attach, title)
        
        # 如果文件已存在，则跳过
        if bool(SKIP_FLAG): continue

        # 打印日志
        if bool(can_print_attch) and not bool(can_move_folder) and not bool(can_rename_file): 
            xprint(f"+ {LOCALDATA['attach_index']:04}\t{title['index']:<4}: {title['email']:<24}\t{title['name']:<24}\t{attach['filename']}")

        # 下载
        if bool(can_download_attach): download_attach(elements[i], i)

        switch_to(find_all(Window())[0])

        # 统计附件数量
        LOCALDATA['attach_count'] += 1

        # 等待下载完毕（如果需要等待）
        if bool(can_move_folder) or bool(can_rename_file): 

            waitting_download(attach, title)

            # 为了保险起见，还是等一等。免得车开太快了
            time.sleep(1.5)

            # 是否允许重命名文件
            if bool(can_rename_file): rename_file(LOCALDATA['rule_rename'][int(len(LOCALDATA['rule_rename']))-1])

            # 是否允许移动到文件夹
            if bool(can_move_folder): move_folder(LOCALDATA['rule_folder'][int(len(LOCALDATA['rule_folder']))-1])


#---------------------------------------------------------------------------
# download
#---------------------------------------------------------------------------

# 下载
def download_attach(e, i):
    if DEBUG_MODE[0]: test('download_attach')
    if bool(is_exmail_user):
        switch_to(find_all(Window())[0])
        scroll_down(S("#attachment").y)
        hover(e)
        click('下载')
    else: 
        ActionChains(get_driver()).click(get_driver().find_elements_by_link_text('下载')[i]).perform()

# 等待下载
def waitting_download(attach, title):
    if DEBUG_MODE[0]: test(f"waitting_download ▼ {time.strftime('%H:%M:%S',time.localtime(time.time()))}")
    wait_time = 0
    while wait_time <= downloading_timeout:
        if get_last_filepath() != '': break

        # 如果下载时长过久。默认300: 大于5分钟
        if wait_time %2 == 0 and wait_time >= downloading_timeout:
            xprint(f"{C.GOLD} ^ {title['index']}\t{attach['index']:02}: {attach['filename']} 下载时长过久，放弃等待，执行下一个。{C.END}")
            break
        
        # 每分钟提示
        if wait_time >= 60 and not bool(wait_time % 60):
            xprint(f"{C.SILVER}^ {title['index']}\t{attach['index']:02}: {attach['filename']} 正在下载... 您已等待了 {wait_time / 60} 分钟。{C.END}")

        time.sleep(2)
        wait_time += 2

    if DEBUG_MODE[0]: test(f"waitting_download ▲ {time.strftime('%H:%M:%S',time.localtime(time.time()))}")
    
    
#---------------------------------------------------------------------------
# rename rule
#---------------------------------------------------------------------------

def ready_replace_name(attach, title):

    if DEBUG_MODE[0]: test('ready_rename_file')
    LOCALDATA['rule_rename'].insert(max(0, len(LOCALDATA['rule_rename'])), rule_rename)
    LOCALDATA['rule_folder'].insert(max(0, len(LOCALDATA['rule_folder'])), rule_folder)

    # 重命名规则模板
    rule = { 
        '{filename1}':        attach['filename'].split(".")[0] if len(attach['filename'].split('.')) <= 1 else '.'.join(attach['filename'].split('.')[0:-1]), # file
        '{filename2}':        attach['filename'],                                             # file.jpg
        '{extension1}':       '.' + attach['filetype'],                                       # .jpg
        '{extension2}':       attach['filetype'],                                             # jpg
        '{attchtitleindex}':  zerofill(int(attach['index'])),                                 # 标附序
        '{titleindex}':       zerofill(LOCALDATA['title_index']),                             # 标序 [1 ~ 总标]
        '{attchindex}':       zerofill(LOCALDATA['attach_index']),                            # 附序 [1 ~ 总附]
        '{pageindex}':        zerofill(int(LOCALDATA['token_page'])+1),                       # 页序 [1 ~ 总附]
        '{titlecount}':       zerofill(len(LOCALDATA['title_list'])),                         # 总标 0 
        '{attchcount}':       zerofill(len(LOCALDATA['attach_list'])),                        # 总附 0 
        '{folderid}':         str(LOCALDATA['folder_id']),                                    # 129
        '{foldername}':       validateName(LOCALDATA['folder_name']),                         # 文件夹名称：我的文件夹  (注，如果昵称不符合命名规范，会替换成x)
        '{foldertitle}':      str(LOCALDATA['folder_title']),                                 # 文件夹邮件数量：500
        '{folderpages}':      zerofill(LOCALDATA['max_page']),                                # 文件夹页数：002
        '{titlename}':        validateName(title['title']),                                   # 邮件标题 (注，如果昵称不符合命名规范，会替换成x)
        '{nameid}':           validateName(title['name']),                                    # 发信人昵称 (注，如果昵称不符合命名规范，会替换成x)
        '{address}':          title['email'],                                                 # 邮箱地址：123456@qq.com
        '{mailid}':           title['email'].split("@")[0],                                   # 邮箱ID：123456
        '{year}':             time.strftime("%Y", title['timestamp']),                        # 年：2020
        '{month}':            time.strftime("%m", title['timestamp']),                        # 月：11
        '{day}':              time.strftime("%d", title['timestamp']),                        # 日：04
        '{week}':             time.strftime("%a", title['timestamp']),                        # 周：Wed
        '{ampm}':             time.strftime("%p", title['timestamp']),                        # 午：PM
        '{hours}':            time.strftime("%H", title['timestamp']),                        # 时：14
        '{minutes}':          time.strftime("%M", title['timestamp']),                        # 分：30
        '{seconds}':          time.strftime("%S", title['timestamp']),                        # 秒：59
        '{time1}':            time.strftime("%H%M", title['timestamp']),                      # 1430
        '{time2}':            time.strftime("%H-%M-%S", title['timestamp']),                  # 14-30-59
        '{time3}':            time.strftime("%H'%M'%S", title['timestamp']),                  # 14'30'59
        '{date1}':            time.strftime("%m%d", title['timestamp']),                      # 1207
        '{date2}':            time.strftime("%Y%m%d", title['timestamp']),                    # 20201207
        '{date3}':            time.strftime("%Y-%m-%d", title['timestamp']),                  # 2020-12-07
        '{fulldate1}':        time.strftime("%Y-%m-%d_%H-%M-%S", title['timestamp']),         # 2020-12-07_14-30-59
        '{fulldate2}':        time.strftime("%Y%m%d_%H'%M'%S", title['timestamp']),           # 20201207_14'30'59
    }

    rename_index = max(0, len(LOCALDATA['rule_rename'])-1)
    folder_index = max(0, len(LOCALDATA['rule_folder'])-1)

    for i, j in rule.items(): 
        LOCALDATA['rule_rename'][rename_index] = LOCALDATA['rule_rename'][rename_index].replace(i, j)
        LOCALDATA['rule_folder'][folder_index] = LOCALDATA['rule_folder'][folder_index].replace(i, j)


def check_file_matching(path, byte):
    return os.path.isfile(path) and os.path.getsize(path) == byte

  
def check_file_exists(attach, title):

    NEXT_MAIL()

    # TODO： 由于企业邮箱没有 filebyte 的参数，只有文本。暂时没空去手动计算。
    if bool(is_exmail_user): return

    # 原始预期下载路径
    rootpath = DOWNLOAD_FOLDER
    filename = attach['filename'] if not bool(can_rename_file) else LOCALDATA['rule_rename'][int(len(LOCALDATA['rule_rename']))-1]
    filebyte = attach['filebyte']
    expectpath = os.path.join(rootpath, filename)

    if DEBUG_MODE[0]: test(f"check_file_exists\t{filename}")

    # 检查文件名是否存在，并且文件大小和属性相同。
    if check_file_matching(expectpath, filebyte):
        xprint(f"{C.BLUE}~ {title['index']:<4}\t{LOCALDATA['attach_index']:04}: {filename} 文件已存在根目录，跳过本次下载。{C.END}")
        SKIP_MAIL()
        return
        
    # 检查文件名是否存在与目标文件夹
    if bool(can_move_folder):
        foldername = LOCALDATA['rule_folder'][int(len(LOCALDATA['rule_folder']))-1]
        folderpath = os.path.join(rootpath, foldername)
        if not os.path.exists(folderpath): return
        expectpath = os.path.join(folderpath, filename)
        if not os.path.exists(expectpath): return
        if check_file_matching(expectpath, filebyte):
            xprint(f"{C.BLUE}~ {title['index']:<4}\t{LOCALDATA['attach_index']:04}: 文件夹 {foldername} 已存在文件 {filename}，跳过本次下载。{C.END}")
            SKIP_MAIL()


def rename_file(newname):

    filepath  = get_last_filepath()
    filename  = os.path.basename(filepath)
    expectpath  = os.path.join(DOWNLOAD_FOLDER, newname)

    # 避免错误的传入.tmp / .crdownload 类型的临时文件
    if filepath == '' or not os.path.exists(filepath):
      xprint(f"{C.RED}[rename_file] {filename} 文件不存在。{C.END}")
      return

    if DEBUG_MODE[0]: test(f"rename_file to\t\t{newname}")

    # 先检查目标文件是否已存在
    if os.path.exists(expectpath):
        # 先检查两个文件是否相同。相同则删除a文件。
        if filecmp.cmp(filepath, expectpath):
            xprint(f"{C.BGBLUE}[rename_file] {newname} 已存在，且与文件 {filename} 内容相同。{C.END}")
            os.remove(filepath)
        else:
            randnumber = 1
            filename = os.path.splitext(expectpath)[0]
            filetype = filename.split(".")[-1]
            aliaspath = os.path.join(DOWNLOAD_FOLDER, f'{filename}-{randnumber}.{filetype}')
            while os.path.exists(aliaspath):
                randnumber+=1
                aliaspath = os.path.join(DOWNLOAD_FOLDER, f'{filename}-{randnumber}.{filetype}')
            os.rename(filepath, aliaspath)
            xprint(f"{C.BGBLUE}[rename_file] {newname} 已存在。但两个文件内容不相同。已在 {filename} 文件名后面添加编号 {randnumber} 。{C.END}")
    else:
        os.rename(filepath, expectpath)
        xprint(f"{C.GREEN}[rename_file] {filename}\t\t\t{newname} {C.END}")


def move_folder(foldername):

    filepath = get_last_filepath()
    filename = os.path.basename(filepath)
    folderpath = os.path.join(DOWNLOAD_FOLDER, foldername)
    expectpath = os.path.join(folderpath, filename)

    # 避免错误的传入.tmp / .crdownload 类型的临时文件
    if filepath == '' or not os.path.exists(filepath):
        print(f"{C.RED}[move_folder] {filename} 文件不存在。{C.END}")
        return

    # 检查文件夹是否存在
    check_folder_exists(folderpath, 1)

    if DEBUG_MODE[0]: test(f"move_folder to\t\t\t{foldername}")

    # 先检查目标文件夹是否已存在该文件
    if os.path.exists(expectpath): 
        # 先检查两个文件是否相同。
        if filecmp.cmp(filepath, expectpath): 
            os.remove(filepath)
            xprint(f"{C.BGBLUE}[move_folder] 文件夹 {foldername} 已存在文件 {filename} {C.END}")
        else:
            rename_file(filepath, expectpath)
            shutil.move(expectpath, folderpath)
            xprint(f"{C.GREEN}[move_folder] {foldername}\t\t\t{filename} {C.END}")
    else:
        shutil.move(filepath, expectpath)
        xprint(f"{C.GREEN}[move_folder] {foldername}\t\t\t{filename} {C.END}")

#-------------------------------------------------------------------------------
# file
#-------------------------------------------------------------------------------

def validateName(name):
    # '/ \ : * ? " < > |'
    regex = r"[\/|\\|\:|\*|\?|\"|\<|\>|\||\.|]"
    return re.sub(regex, "x", name)

# 检查文件夹是否存在，不存在则创建
def check_folder_exists(path = DOWNLOAD_FOLDER, can_mkdir=0):
    if DEBUG_MODE[0]: test(f"check_folder_exists\t\t{path}")
    if not os.path.exists(path): 
        if bool(can_mkdir): os.mkdir(path)
        return False
    else: return True

def get_last_filepath(path = DOWNLOAD_FOLDER):
    fn = lambda f: os.path.join(path, f)
    files = [f for f in os.listdir(path) if os.path.isfile(fn(f)) and os.path.splitext(f)[1] not in ['.tmp','.crdownload']]
    if len(files) == 0: return ''
    files.sort(key=lambda f: os.path.getctime(fn(f)))
    if DEBUG_MODE[0]: test(f"get_last_filepath\t\t{files[-1]}")
    return os.path.join(path, files[-1])

#-------------------------------------------------------------------------------
# utility functions
#-------------------------------------------------------------------------------

def goto(url):
    if DEBUG_MODE[0]: test(f"go_to")
    go_to(url)

def get_querystring(url):
    return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).query))

# 将Table导出为csv文件
def table_to_csv(table, filename):
    if DEBUG_MODE[0]: test('table_to_csv')
    raw = table.get_string()
    data = [tuple(filter(None, map(str.strip, splitline))) for line in raw.splitlines() for splitline in [line.split('|')] if len(splitline) > 1]
    with codecs.open(filename,'w','utf_8_sig') as f: 
        for d in data: f.write('{}\n'.format(','.join(d)))

def zerofill(n):
    n = n if type(n) == type(1) else int(n)
    z = 2
    if n >= 10000:
        z=5
    elif n>=1000 and n<10000:
        z=4
    elif n>=100 and n<1000: 
        z=3
    else:
        z=2
    return str(n).zfill(z)

#-------------------------------------------------------------------------------
# TODO: thread
#-------------------------------------------------------------------------------

def thread_webdriver():

    script_start_time = time.strftime("%Y-%m-%d_%H-%M-%S",time.localtime(time.time()))
    print(f"任务开始：{script_start_time}")

    # 初始化webdriver
    init_webdriver()

    # 初始化表格
    init_prettytable()

    # 跳转至邮箱主页
    goto(MAIL_SELECTOR['login_index'][MAILDOMIN])

    # 如果打开了多个窗口，则切换到邮箱主页
    if len(find_all(Window())) > 1: switch_to(MAIL_SELECTOR['title'][MAILDOMIN])

    # 首次进入邮箱时，检查是否已经登录。判断方式是，检测不到登录组件的元素
    while S(MAIL_SELECTOR['login_container'][MAILDOMIN]).exists():
        try:
            # 使用普通QQ邮箱登录方式，还是企业邮箱登录方式
            if S(MAIL_SELECTOR['login_frame'][MAILDOMIN]).exists(): login_qqmail() if not bool(is_exmail_user) else login_exmail()
        except Exception:
            time.sleep(1)
    
    # update token_sid
    update_token_sid()

    # 获取标签列表
    if bool(can_tag_no_attach) or bool(can_tag_timeout_attach): check_tag_exists_in_list() if S('#tagfoldersDiv').exists() else check_tag_exists_in_setting()

    # 进入目标文件夹
    update_folder_info()

    # 如果文件夹没有邮件，结束运行
    if bool(END_FLAG): return

    # 初始化下载任务计划
    init_folder_task()

    # 获取文件夹的邮件
    if bool(can_load_title): foreach_folder_title()

    # 开始遍历收集的邮件，进入正文页
    if bool(can_load_email): foreach_read_mail()

    # 下载结束
    print(f"{C.GREEN}任务完成{C.END}")

    goto(MAIL_SELECTOR['login_index'][MAILDOMIN])

    # 将数据导出为CSV
    if bool(can_print_prettytable): xprint(f"\n\n{PRETTY_TABLE['attach_list']}\n")
    
    tips_timeout = f"其中，有 {LOCALDATA['timeout_count']} 个附件过期无法下载。" if LOCALDATA['timeout_count'] > 0 else ''
    print(f"包含 {len(LOCALDATA['title_list'])} 封邮件，共 {len(LOCALDATA['attach_list'])} 个附件。{tips_timeout}\n预计实际下载完成 {LOCALDATA['attach_count']} 个附件。\n\n")

    if bool(can_export_titledata_to_csv) and bool(can_load_title): table_to_csv(PRETTY_TABLE['title_list'], os.path.join(ROOTPATH, f"_邮件统计{script_start_time}.csv"))
    if bool(can_export_attchdata_to_csv) and bool(can_load_email): table_to_csv(PRETTY_TABLE['attach_list'], os.path.join(ROOTPATH, f"_附件统计{script_start_time}.csv"))

    os.system('PAUSE')
    

#-------------------------------------------------------------------------------
# main
#-------------------------------------------------------------------------------

def main(): 
    # 万一哪天学会了怎么用多线程呢？
    thread_webdriver()

#-------------------------------------------------------------------------------
# END
#-------------------------------------------------------------------------------
if __name__ == '__main__': 
    os.system('cls')
    main()
