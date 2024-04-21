#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#===============================================================================
# * 声明
#===============================================================================
# 作者：XHXIAIEIN
# 更新：2024/04/20
# 主页：https://github.com/XHXIAIEIN/Auto-Download-QQMail-Attach
#===============================================================================

'''
#===============================================================================
# * 如何安装
#===============================================================================
'''

#-------------------------------------------------------------------------------
# 🎈 必要的软件 1: Python
#-------------------------------------------------------------------------------
#  - python3:   
#  https://www.python.org/downloads/
#  
#  打开页面，点击网页最醒目的黄色按钮。"Download Python 3.xxx" (xxx 为最新版本号)
#  
#  Windows 安装补充1：
#  安装 python3 时，需勾选安装页面底部选项 ⌈Add Python 3.xx to PATH⌋
#...............................................................................


#-------------------------------------------------------------------------------
# 🎈 必要的软件 2: Chromedriver 
#-------------------------------------------------------------------------------
#  - chromedriver: 
#  https://googlechromelabs.github.io/chrome-for-testing/#stable
# 
#  目前，脚本会自动下载，Chromedriver 并解压到这个脚本文件相同的目录。
#  但由于网络问题，可能会下载失败（因为需要开启网络代理）
#  当自动下载失败时，你需要手动下载 chromedriver 文件。
#  这个步骤可能稍微复杂一点，但请耐心阅读。
#  
#  打开这个页面，你会看到一个绿色的表格。
#  https://googlechromelabs.github.io/chrome-for-testing/#stable
#  表格中有很多内容，但你需要找到 chromedriver 即可。
#  如果你运行了脚本，会告诉你下载哪个版本。
#  
#  1. 先看第 1 列的 Binary，位于表格第 6 行之后。
#  2. 再看第 2 列的 Platform，找到你对应的操作系统。
#           Windows 系统，下载 win64 版本；
#           MacOS 系统，Intel处理器下载 mac-x64 版本，M1/M2 处理器下载 mac-arm64 版本。
#  3. 将 URL 地址复制到浏览器地址栏，按下回车，即可下载。
#
#  安装补充：
#  下载完成后，将压缩包进行解压，放到和这个脚本文件相同的目录。
#...............................................................................


#-------------------------------------------------------------------------------
# 🎈 必要的依赖库
#-------------------------------------------------------------------------------
#  Windows用户：
#  按下 Win + R 打开 cmd，在命令提示符输入以下指令：
#  python -m pip install --upgrade pip
#  pip install selenium
# 
#  注：若网络问题无法下载或下载过慢，可尝试使用国内镜像源，在后面加入 -i 参数：
#  pip install helium -i https://pypi.tuna.tsinghua.edu.cn/simple
#...............................................................................
#  MacOS用户：
#  运行终端(Terminal)输入以下指令：
#  python -m pip install helium
#...............................................................................

# 以下是本脚本使用到的官方库
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import concurrent.futures
from urllib import parse
from urllib.parse import unquote
import os, re, sys, time, csv, shutil, requests, zipfile, traceback

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
#    1. 展开左侧面板 [我的文件夹] 列表，找到你想下载的文件夹，右键-新窗口打开。（注，不是选择"我的文件夹"）
#    2. 在新窗口的网站地址找到参数 folderid
#    如：mail.qq.com/cgi-bin/frame_html?t=frame_html&sid=xxx&url=/cgi-bin/mail_list?folderid={ 数字 }%26page=0
#..........................


'''
#===============================================================================
# * 自定义参数
#===============================================================================
'''

class PROFILE:

    # 要下载的邮箱文件夹ID
    FOLDER_ID = 139

    # 附件下载到本地哪个位置
    ROOTPATH = r'D:\XHXIAIEIN\Desktop\2024'

    # 临时文件路径
    DOWNLOAD_FOLDER = os.path.join(ROOTPATH, 'download')
    USERDATA_FOLDER = os.path.join(ROOTPATH, 'selenium')

    #---------------------------------------------------------------------------
    # （可选）下载计划
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
    TITLE_BACKLIST_KEYS = ['发信方已撤回邮件', '自动回复']

    # 黑名单关键词。标签如果包含了任意一个关键词，就忽略不下载。
    # 示例：TITLE_BACKLIST_KEYS = ['已阅']
    TAG_BACKLIST_KEYS = ['已阅']

    # 白名单关键词。邮件主题必须包含白名单里的所有关键词。关键词越多，匹配规则越严格。
    # 示例：TITLE_BACKLIST_KEYS = ['反馈','回复']
    TITLE_WHITELIST_KEYS = ['']

    #---------------------------------------------------------------------------

    # 直接跳过没有附件的邮件。
    # 启用后，自动添加 "没有附件" 标签的功能将失效。
    SKIP_NO_ATTACH = 0

    # 下载前，检测本地是否存在相同文件（检测方法：对比文件名及文件大小是否一致）。
    SKIP_EXISTS_FILE = 1


'''
#===============================================================================
#                 " 请 勿 跨 过 这 块 区 域 修 改 内 容 "
#===============================================================================
'''

#-------------------------------------------------------------------------------
# 本地变量
#-------------------------------------------------------------------------------

# 本地缓存数据
LOCALDATA = {
  'folder_id'     : PROFILE.FOLDER_ID,       # 地址参数：文件夹的ID
  'token_page'    : 0,                       # 地址参数：文件夹页数
  'token_sid'     : '',                      # 地址参数：身份密钥
  'folder_name'   : '',                      # 文件夹名称（首次进文件夹读取)
  'page_count'    : 0,                       # 文件夹总页数(首次进文件夹读取)
  'title_count'   : 0,                       # 文件夹总邮件数量(首次进文件夹读取)
  'page_title'    : 0,                       # 每页有多少封邮件(每次进文件夹读取)
  'title_list'    : [],
  'attach_list'   : [],
}


# 当前循环缓存数据
TEMP_DATA = {
    'nextpage'      :  1,                    # 是否需要下一页,用于下载计划的跳过
    'title_index'   :  0,                    # 当前处理邮件序
    'page'          :  0,                    # 当前处理页
    'title'         :  0,                    # 当前邮件总序
    'title_at'      :  0,                    # 当前邮件页序
    'attach'        :  0,                    # 当前附件总序
    'attach_at'     :  0                     # 当前附件页序
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------

driver = None

# 启动浏览器
def launch_webdriver():
    global driver

    prefs = {
        'download.directory_upgrade': True,
        'download.prompt_for_download': 'false',
        'profile.default_content_settings.multiple-automatic-downloads': 1,
        'download.default_directory': PROFILE.DOWNLOAD_FOLDER
    }

    options = webdriver.ChromeOptions()
    options.add_experimental_option('prefs', prefs)
    options.add_experimental_option('excludeSwitches', ['enable-logging'])
    options.add_argument(f'--user-data-dir={PROFILE.USERDATA_FOLDER}')
    options.add_argument('--window-size=1000,1200')
    options.add_argument('--disable-remote-fonts')
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')

    driver = webdriver.Chrome(options=options)
    driver.get(f"https://mail.qq.com/cgi-bin/loginpage")

    driver.find_element(By.CSS_SELECTOR, 'body').send_keys(Keys.END)
    login_panel = wait_until(driver, '#login')

    print(f"等待登录")
    while login_panel:
        login_panel = wait_until(driver, '#login')
        time.sleep(1)

    mainframe = wait_until(driver, '#mainFrameContainer')
    LOCALDATA['token_sid'] = get_querystring(driver.current_url, 'sid')
    print(f"登录成功！token_sid: {LOCALDATA['token_sid']}")


#-------------------------------------------------------------------------------
# Folder Title
#-------------------------------------------------------------------------------

# 网页跳转到文件夹
# https://mail.qq.com/cgi-bin/mail_list?folderid=141&page=0&sid=xxxxx&nocheckframe=true

def open_folder():
    global driver
    LOCALDATA['token_page'] = PROFILE.PAGES_TASK['start']-1 if PROFILE.PAGES_TASK['start'] > 0 else 0
    driver.get(f"https://mail.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={LOCALDATA['token_page']}&sid={LOCALDATA['token_sid']}&nocheckframe=true")
    wait_until(driver, '#qqmail_mailcontainer')

    LOCALDATA['folder_name'] = driver.title.split(' - ')[1]
    LOCALDATA['title_count'] = int(find(driver, '#_ut_c').text)
    LOCALDATA['page_count'] = int(find(driver, '#frm > div > .right').text.split('/')[1].split(' 页')[0].strip())
    LOCALDATA['page_title'] = len(find_all(driver, 'u.black'))
    print(f"* 进入文件夹: {LOCALDATA['folder_name']}(共 {LOCALDATA['title_count']} 封)")


def get_title_list():
    driver.get(f"https://mail.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={LOCALDATA['token_page']}&sid={LOCALDATA['token_sid']}&nocheckframe=true")
    wait_until(driver, '#qqmail_mailcontainer')

    # 当前文件夹有多少封邮件
    LOCALDATA['page_title'] = len(find_all(driver, 'u.black'))

    # 解析当前页的邮件数据
    title_elements = find_all(driver, 'input[fa]')
    data = load_folder_title(title_elements)
    LOCALDATA['title_list'].extend(data)

    # 保存数据到临时文件
    save_to_csv(LOCALDATA['title_list'], 'temp_title_data.csv')
    LOCALDATA['token_page'] += 1


# 处理单封邮件的数据
def load_title_data(element, index):
    parent = element.find_element(By.XPATH, 'ancestor::tbody')
    page = LOCALDATA['token_page']
    index = TEMP_DATA['title']
    name = element.get_attribute('fn')
    address = element.get_attribute('fa')
    timestamp = element.get_attribute('totime')
    mailid = element.get_attribute('value')
    title = find(parent, 'u.black.tt').text
    star = 1 if element.get_attribute('star') == 1 else 0
    unread = 1 if element.get_attribute('unread') == 'true' else 0
    attach = 1 if find_all(parent, '.cij.Ju') else 0
    tags = get_title_tag(parent) if find_all(parent, '.TagDiv') else ''

    # 处理无附件情况 TODO
    if not attach: 
        print(f"- {page} {index} {title} 没有附件")

    data = [{
        'page': page,
        'index': index,
        'name': name,
        'title': title,
        'address': address,
        'pageat': index,
        'attach': attach,
        'star': star,
        'tags': tags,
        'unread': unread,
        'mailid': mailid,
        'timestamp': timestamp,
    }]

    return data


# 处理文件夹邮件的数据
def load_folder_title(elements):
    global driver
    data_list = []
    for i, e in enumerate(elements, start=0):
        data = load_title_data(e, i)
        if title_task_exit():
            TEMP_DATA['nextpage'] = 0
            break
        data_list.extend(data)
        TEMP_DATA['title'] += 1
    return data_list


#-------------------------------------------------------------------------------
# Mail
#-------------------------------------------------------------------------------

def can_open_email(data):
    if PROFILE.SKIP_NO_ATTACH and not bool(data['attach']):
        print(f"- {data['index']} {data['title']} 没有附件")
        return False
    if contains_keywords(data['title'], PROFILE.TITLE_BACKLIST_KEYS):
        print(f"- {data['index']} {data['title']} 标题名称包含黑名单")
        return False
    return True


def open_mail():
    print('开始读取邮件')
    global driver
    with ThreadPoolExecutor() as executor:
        with open('temp_title_data.csv', 'r', newline='', encoding='utf-8') as csvfile:
            folder = csv.DictReader(csvfile)
            for title in folder:
                if can_open_email(title):
                    driver.get(f"https://mail.qq.com/cgi-bin/frame_html?t=newwin_frame&sid={LOCALDATA['token_sid']}&url=/cgi-bin/readmail?t=readmail%26mailid={title['mailid']}%26mode=pre")
                    wait_until(driver, '#pageEnd')
                    driver.switch_to.frame("mainFrame")
                    # 获取附件元素
                    attach_elements = find_all(driver, '.ico_big a')
                    attach_tasks = []
                    for item in attach_elements:
                        attach_info = load_attach_data(item, title)
                        LOCALDATA['attach_list'].append(attach_info)
                        attach_tasks.append(attach_info)
                    TEMP_DATA['attach'] += len(attach_elements)
                    save_to_csv(LOCALDATA['attach_list'], 'temp_attach_data.csv')
    download_attach_list(attach_info)

# 读取单个附件的信息
def load_attach_data(element, title_data):
    title_index = title_data['index']
    attach_index = TEMP_DATA['attach'] + int(element.get_attribute('idx') or 0)
    fileindex = int(element.get_attribute('idx') or 0)
    name = title_data['name']
    filename = element.get_attribute('filename')
    filebyte = int(element.get_attribute('filebyte'))
    fileview = element.get_attribute('viewmode')
    filedown = f"https://mail.qq.com{element.get_attribute('down')}"
    title = title_data['title']
    address = title_data['address']
    mailid = title_data['mailid']
    timestamp = title_data['timestamp']
    page = title_data['page']
    pageat = title_data['pageat']
    data = {
        'title_index': title_index,
        'attach_index': attach_index,
        'name': name,
        'filename': filename,
        'filebyte': filebyte,
        'fileview': fileview,
        'filedown': filedown,
        'fileindex': fileindex,
        'title': title,
        'address': address,
        'mailid': mailid,
        'timestamp': timestamp,
        'page': page,
        'pageat': pageat,
    }
    return data


#-------------------------------------------------------------------------------
# Task
#-------------------------------------------------------------------------------

def page_task_exit():
    page_out = LOCALDATA['token_page'] > LOCALDATA['page_count']
    page_step_out = PROFILE.PAGES_TASK['step'] > 0 and PROFILE.PAGES_TASK['start'] + LOCALDATA['token_page'] > PROFILE.PAGES_TASK['step']
    page_end_out = PROFILE.PAGES_TASK['end'] > 0 and LOCALDATA['token_page'] > PROFILE.PAGES_TASK['end']
    title_task_out = not TEMP_DATA['nextpage']
    return page_out or page_step_out or page_end_out or title_task_out

def title_task_exit():
    title_step_out = PROFILE.TITLE_TASK['step'] > 0 and PROFILE.TITLE_TASK['start'] + TEMP_DATA['title'] >= PROFILE.TITLE_TASK['step']
    title_end_out = PROFILE.TITLE_TASK['end'] > 0 and PROFILE.TITLE_TASK['start'] + TEMP_DATA['title'] >= PROFILE.TITLE_TASK['end']
    return title_step_out or title_end_out

def contains_keywords(title, list):
    if not list:
        return
    for key in list:
        if key in title:
            return True
    return False


#-------------------------------------------------------------------------------
# file
#-------------------------------------------------------------------------------

# 根据邮件提供的文件属性，判断文件名是否规范。
# 这里为简单判断，文件名是否包含6以上的数字，来区分是否包含QQ号。
def verify_filename_matching(filename):
    pattern = r'\d{6,}'
    return bool(re.search(pattern, filename))


# 根据邮件提供的文件属性，判断文件是否存在，且文件大小相同
def verify_file_matching(filename, byte):
    try:
        path = os.path.join(PROFILE.DOWNLOAD_FOLDER, filename)
        if not os.path.isfile(path):
            return True
        verify = os.path.getsize(path) == byte
        return not verify
    except:
        return True


def download_attach_list(attach_list):
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(download_file, item) for item in attach_list]
        for future in as_completed(futures):
            data = future.result()
            if data:
                print(f"- {data['attach_index']} {data['title_index']} {data['filename']}")


def download_file(attach_data):
    # 检查文件是否已经存在
    if PROFILE.SKIP_EXISTS_FILE and skip_file_matching(attach_data['filename'], attach_data['filebyte']):
        return None
    global driver
    original_window = driver.current_window_handle
    driver.get(attach_data['filedown'])
    driver.switch_to.window(original_window)
    return attach_data

#-------------------------------------------------------------------------------
# Utility
#-------------------------------------------------------------------------------

def find(elements, selector):
    try:
        return elements.find_element(By.CSS_SELECTOR, selector)
    except:
        print(f"找不到 {selector} 元素")
        return None

def find_all(elements, selector):
    try:
        return elements.find_elements(By.CSS_SELECTOR, selector)
    except:
        print(f"找不到 {selector} 元素")
        return None

def wait_until(elements, selector, timeout=8):
    try:
        return WebDriverWait(elements, timeout).until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))
    except:
        return None

# 频繁提示，自动刷新至页面出现
def FBI_WAITTING(id):
    global driver
    if find(driver, id):
        return
    wait = 0
    while not find(driver, id):
        if wait == 0: time.sleep(10); driver.navigate().refresh();()
        elif wait == 2: time.sleep(6); driver.navigate().refresh();()
        elif wait%3 == 0: time.sleep(3); driver.navigate().refresh();()
        else:time.sleep(1)
        wait+=1


# 添加标签，若标签已经存在则跳过，若标签不存在，则新建标签。
def add_mail_tag(tagname):
    global driver
    if find(driver,'#tagContainer') and tagname in find(driver, '#tagContainer').web_element.text:
        return
    driver.find_element(By.LINK_TEXT, '标记为...').click()
    if tagname not in find(driver,'#select_QMMenu__menuall_').web_element.text:
        print(f"标签 {tagname} 不存在，正在创建标签。", 'SILVER')
        new_mail_tag(tagname)
        return
    driver.find_element(By.LINK_TEXT, '标记为...').click()
    cancel_tag_element = driver.find_element(By.XPATH, "//span[contains(text(), '取消标签')]")
    driver.execute_script("arguments[0].nextElementSibling.click();", cancel_tag_element)


# 添加星标，若已星标则忽略
def add_mail_star():
    global driver
    if find(driver, '#img_star').web_element.get_attribute('class') == 'qm_ico_flagoff':
        driver.find_element(By.CSS_SELECTOR, '#img_star').click()


# 新建标签
def new_mail_tag(tagname):
    global driver
    driver.find_element(By.LINK_TEXT, '新建标签').click()
    driver.find_element(By.CSS_SELECTOR, '#QMconfirm_QMDialog_txt').send_keys(tagname)
    driver.find_element(By.LINK_TEXT, '确定').click()


# 获取邮件的标签列表
def get_title_tag(elements):
    tag_tds = find_all(elements, '.tagbgSpan')
    tags = []
    for td in tag_tds:
        tags.append(td.text.strip())
    return ', '.join(filter(None, tags))


# 从URL链接中提取参数
def get_querystring(url, item):
    data = dict(parse.parse_qsl(parse.urlsplit(url).query))
    try:
        return data[item]
    except:
        print(f"找不到 {data} 中的 {item} 参数")
        return None


# 将数据储存到csv文件中
def save_to_csv(data_list, filename):
    if not data_list:
        print("Data is empty.")
        return
    keys = data_list[0].keys()
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, keys)
        writer.writeheader()
        for data in data_list:
            data = {key: data[key] for key in keys}
            writer.writerow(data)

# 加载已有的临时数据文件（如果存在）
def load_temporary_data():
    temp_title_data = 'temp_title_data.csv'
    temp_attach_data = 'temp_attach_data.csv'

    if not os.path.isfile(temp_title_data) and not os.path.isfile(temp_attach_data):
        return False

    # 读取标题缓存
    if os.path.isfile(temp_title_data):
        print(f"接力：从 {temp_title_data} 的进度继续")
        with open(temp_title_data, 'r', newline='', encoding='utf-8') as title_file:
            reader = csv.DictReader(title_file)
            for row in reader:
                LOCALDATA['title_list'].append(row)

    # 读取附件缓存
    if os.path.isfile(temp_attach_data):
        print(f"接力：从 {temp_attach_data} 的进度继续")
        with open(temp_attach_data, 'r', newline='', encoding='utf-8') as attach_file:
            reader = csv.DictReader(attach_file)
            for row in reader:
                LOCALDATA['attach_list'].append(row)
    

# 读取文件夹的作品数量，通过比较文件名前面10个字符
def get_unique_filenames(folder_path):
    filenames = os.listdir(folder_path)
    unique_names = set()
    for filename in filenames:
        unique_names.add(filename[:10])
    return len(unique_names)


# 根据邮件提供的文件属性，判断文件是否存在，且文件大小相同
def skip_file_matching(filename, filesize):
    filepath = os.path.join(PROFILE.DOWNLOAD_FOLDER, filename)
    return os.path.exists(filepath) and os.path.getsize(filepath) == filesize

# 补零
def zerofill(num):
    return str(num).zfill(4)


# 重命名文件或文件夹函数
def rename_path(old_name, new_name, is_folder=False):
    try:
        os.rename(old_name, new_name)
        if is_folder:
            print("重命名文件夹:", old_name, "to", new_name)
        else:
            print("重命名文件:", old_name, "to", new_name)
    except Exception as e:
        print("重命名时遇到了错误:", e)


#-------------------------------------------------------------------------------
# START
#-------------------------------------------------------------------------------
def main():
    launch_webdriver()
    open_folder()
    load_temporary_data()
    if not LOCALDATA['attach_list']:
        if not LOCALDATA['title_list']:
            while not page_task_exit():
                get_title_list()
        open_mail()
    else:
        download_attach_list(LOCALDATA['attach_list'])
    


if __name__ == '__main__':
    os.system('cls')
    main()
    print('完成。')
    print("预估文件夹存在的作品数: ", get_unique_filenames(PROFILE.DOWNLOAD_FOLDER))
    input('')
