#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#===============================================================================
# * 声明
#===============================================================================
# 作者：XHXIAIEIN
# 更新：2024/05/20
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
#  Windows 安装补充：
#  安装时，需勾选安装页面底部选项 ⌈Add Python 3.xx to PATH⌋
#...............................................................................


#-------------------------------------------------------------------------------
# 🎈 必要的软件 2: Chromedriver 
#-------------------------------------------------------------------------------
#  - chromedriver: 
#  https://googlechromelabs.github.io/chrome-for-testing/#stable
# 
#  打开这个页面，会看到一个绿色的表格。
#  找到其中的 chromedriver，
#  1. 先看第 1 列的 chromedriver，会发现有很多不同的平台。
#  2. 再看第 2 列的 Platform，找到你对应的操作系统：
#           Windows 系统，下载 win64 或 win32 版本；
#           MacOS 系统，Intel处理器下载 mac-x64 版本，M1/M2 处理器下载 mac-arm64 版本。
#  3. 再看第 3 列的 URL，将地址复制到浏览器地址栏，按下回车，即可下载。
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
from selenium.webdriver import Chrome
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.keys import Keys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from urllib import parse
import os, re, sys, time, shutil, csv

'''
#===============================================================================
# * 自定义参数
#===============================================================================
'''

class PROFILE:

    # 要下载的邮箱文件夹ID
    FOLDER_ID = 123

    # 附件下载到本地哪个位置
    ROOTPATH = r'D:\QQMailDownload\2024'

    # 临时文件路径
    DOWNLOAD_FOLDER = os.path.join(ROOTPATH, 'download2')
    USERDATA_FOLDER = os.path.join(ROOTPATH, 'selenium')

    #---------------------------------------------------------------------------
    # （可选）下载计划
    #---------------------------------------------------------------------------
    #  start:     从邮件列表第n个开始。（包含n，即列表第一个就是n。）默认值：1
    #  end:       到邮件列表第n个结束。（包含n，即列表最后一个是n。）默认值：0
    #  step:      从start开始计算，累计下载n个后结束。（即需下载n个）默认值：0
    #---------------------------------------------------------------------------

    # 邮件列表
    TITLE_TASK = { 'start':1, 'step':0, 'end':0 }

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
    SKIP_NO_ATTACH = 1

    # 下载前，检测本地是否存在相同文件（检测方法：对比文件名及文件大小是否一致）。
    SKIP_EXISTS_FILE = 1

    # 每个邮件将创建一个文件夹，将附件下载到其中。
    CREATE_FOLDER_EACH_TITLE = 1
    CREATE_FOLDER_NAME = "{titleindex}_{fromname}"

    # 是否需要下载附件
    CAN_DOWNLOAD_ATTACH = 1
    
    # 同时下载文件数量
    MAX_CONCURRENT_DOWNLOADS = 5

    # 单个文件下载超时(秒)
    DOWNLOAD_TIME_OUT = 60
    
    # 没有附件添加星标
    CAN_STAR_NO_ATTACH = 1

    # TODO
    # # 没有附件添加标签
    # CAN_TAG_NO_ATTACH = 1
    # STR_TAG_NO_ATTACH = '没有附件'

    # # 过期附件添加标签
    # CAN_TAG_TIMEOUT_ATTACH = 1
    # STR_TAG_TIMEOUT_ATTACH = '过期附件'

    # # 不规范命名的附件添加标签
    # CAN_TAG_FILENAME_ATTACH = 1
    # STR_TAG_FILENAME_ATTACH = '重命名'


'''
#===============================================================================
#                 " 请 勿 跨 过 这 块 区 域 修 改 内 容 "
#===============================================================================
'''

#-------------------------------------------------------------------------------
# 本地变量
#-------------------------------------------------------------------------------

# 启动时间
start_time = datetime.now().strftime("%Y-%m-%d")

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

# 加载已有的临时数据文件（如果存在）
def load_temporary_data():
    global LOCALDATA

    LOCALDATA['temp_title_path'] = os.path.join(PROFILE.ROOTPATH, f"{PROFILE.FOLDER_ID}_title_data.csv")
    LOCALDATA['temp_attach_path'] = os.path.join(PROFILE.ROOTPATH, f"{PROFILE.FOLDER_ID}_attach_data.csv")

    # 检查文件是否存在
    title_file_exists = os.path.isfile(LOCALDATA['temp_title_path'])
    attach_file_exists = os.path.isfile(LOCALDATA['temp_attach_path'])

    # 文件不存在
    if not title_file_exists and not attach_file_exists:
        return False

    # 如果任一文件存在，提示用户处理方式
    if title_file_exists or attach_file_exists:
        print('----------------------------------------')
        print("检测到存在临时数据文件:")
        if title_file_exists: print(f"标题数据: {LOCALDATA['temp_title_path']}")
        if attach_file_exists: print(f"附件数据: {LOCALDATA['temp_attach_path']}")
        print('----------------------------------------')
        print("请输入 1 或 0 指令选择处理方式:")
        print("1. 进度继续，直接下载附件")
        print("0. 重新开始，删除缓存数据")

        # 获取用户输入
        user_input = input("请输入指令，留空则默认使用现有数据: ").strip() or '1'
        print('----------------------------------------')
        if user_input == '1':
            # 使用文件数据替换当前数据
            if title_file_exists:
                with open(LOCALDATA['temp_title_path'], 'r', newline='', encoding='utf-8') as title_file:
                    reader = csv.DictReader(title_file)
                    title_list = list(reader)
                    filtered_titles = apply_download_schedule(title_list, PROFILE.TITLE_TASK)
                    LOCALDATA['title_list'] = filtered_titles
                    print(f"读取 {len(filtered_titles)} 条邮件数据。")
            if attach_file_exists:
                with open(LOCALDATA['temp_attach_path'], 'r', newline='', encoding='utf-8') as attach_file:
                    reader = csv.DictReader(attach_file)
                    attach_list = list(reader)
                    filtered_attachments = apply_download_schedule(attach_list, PROFILE.TITLE_TASK)
                    LOCALDATA['attach_list'] = filtered_attachments
                    print(f"读取 {len(filtered_attachments)} 份附件数据。")
        elif user_input == '0':
            # 删除临时数据文件
            if title_file_exists:
                os.remove(LOCALDATA['temp_title_path'])
            if attach_file_exists:
                os.remove(LOCALDATA['temp_attach_path'])
            print("已删除缓存数据。")
        else:
            print("指令无效。")
        
        print('----------------------------------------')


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

    # 检查 chromedriver 是否存在
    chromedriver_path = os.path.join(os.getcwd(), 'chromedriver.exe')
    service = None
    if os.path.isfile(chromedriver_path):
        service = ChromeService(executable_path=chromedriver_path)
    driver = Chrome(options=options, service=service)
    driver.get(f"https://mail.qq.com/cgi-bin/loginpage")

    driver.find_element(By.CSS_SELECTOR, 'body').send_keys(Keys.END)
    login_panel = wait_until(driver, '#login')

    print(f"等待登录")
    start_wait_time = time.time()
    while wait_until(driver, '#login'):
        if time.time() - start_wait_time > 15:
            print("等待时间似乎有一段时间，如果页面已经登录，请尝试刷新页面。")
            break
        time.sleep(1)

    # 等待主页面加载
    wait_until(driver, '#mainFrameContainer')
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
    global LOCALDATA

    driver.get(f"https://mail.qq.com/cgi-bin/mail_list?folderid={LOCALDATA['folder_id']}&page={LOCALDATA['token_page']}&sid={LOCALDATA['token_sid']}&nocheckframe=true")
    wait_until(driver, '#qqmail_mailcontainer')

    # 当前文件夹有多少封邮件
    LOCALDATA['page_title'] = len(find_all(driver, 'u.black'))

    # 解析当前页的邮件数据
    title_elements = find_all(driver, 'input[fa]')
    title_data = load_folder_title(title_elements)
    LOCALDATA['title_list'].extend(title_data)

    # 保存数据到临时文件
    save_to_csv(LOCALDATA['title_list'], LOCALDATA['temp_title_path'])
    LOCALDATA['token_page'] += 1


# 处理单封邮件的数据
def load_title_data(element, index):
    parent = element.find_element(By.XPATH, 'ancestor::tbody')
    page = LOCALDATA['token_page']
    index = TEMP_DATA['title']
    fromname = element.get_attribute('fn')
    address = element.get_attribute('fa')
    timestamp = element.get_attribute('totime')
    mailid = element.get_attribute('value')
    title = find(parent, 'u.black.tt').text
    star = 1 if element.get_attribute('star') == 1 else 0
    unread = 1 if element.get_attribute('unread') == 'true' else 0
    attach = 1 if find_all(parent, '.cij.Ju') else 0
    tags = get_title_tag(parent) if find_all(parent, '.TagDiv') else ''

    data = [{
        'page': page,
        'index': index,
        'fromname': fromname,
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
        print(f"- {data['index']} {data['title']} 没有附件，已跳过。")
        return False
    if contains_keywords(data['title'], PROFILE.TITLE_BACKLIST_KEYS):
        print(f"- {data['index']} {data['title']} 标题名称包含黑名单")
        return False
    return True


def open_mail():
    print('开始读取邮件，收集附件信息')
    global driver, LOCALDATA
    with ThreadPoolExecutor() as executor:
        with open(LOCALDATA['temp_title_path'], 'r', newline='', encoding='utf-8') as csvfile:
            folder = csv.DictReader(csvfile)
            for title in folder:
                # 检验邮件名是否包含黑名单关键词，以及附件情况。
                if can_open_email(title):
                    driver.get(f"https://mail.qq.com/cgi-bin/frame_html?t=newwin_frame&sid={LOCALDATA['token_sid']}&url=/cgi-bin/readmail?t=readmail%26mailid={title['mailid']}%26mode=pre")
                    wait_until(driver, '#pageEnd')
                    driver.switch_to.frame("mainFrame")
                    driver.find_element(By.CSS_SELECTOR, 'body').send_keys(Keys.END)
                    # 处理没有附件，是否需要加星标和标签
                    if not title['attach']:
                        print(f"- 没有附件: 第{title['index']}封邮件位于第{title['page']}页. | {title['name']} {title['title']} {title['address']}")
                        # 设为星标
                        if bool(PROFILE.CAN_STAR_NO_ATTACH):
                            add_mail_star()
                        # 添加标签
                        if bool(PROFILE.CAN_TAG_NO_ATTACH):
                            add_mail_tag(PROFILE.STR_TAG_NO_ATTACH)
                    else:
                        # 获取附件元素
                        attach_elements = find_all(driver, '.ico_big a')
                        attach_tasks = []
                        # 获取每个附件信息
                        for item in attach_elements:
                            attach_info = load_attach_data(item, title)
                            LOCALDATA['attach_list'].append(attach_info)
                            attach_tasks.append(attach_info)
                        TEMP_DATA['attach'] += len(attach_elements)
                        save_to_csv(LOCALDATA['attach_list'], LOCALDATA['temp_attach_path'])

# 读取单个附件的信息
def load_attach_data(element, title_data):
    title_index = title_data['index']
    attach_index = TEMP_DATA['attach'] + int(element.get_attribute('idx') or 0)
    fileindex = int(element.get_attribute('idx') or 0)
    fromname = title_data['fromname']
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
        'fromname': fromname,
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

# 检测什么时候结束翻页
def page_task_exit():
    page_out = LOCALDATA['token_page'] >= LOCALDATA['page_count']
    page_step_out = PROFILE.PAGES_TASK['step'] > 0 and PROFILE.PAGES_TASK['start'] + LOCALDATA['token_page'] > PROFILE.PAGES_TASK['step']
    page_end_out = PROFILE.PAGES_TASK['end'] > 0 and LOCALDATA['token_page'] > PROFILE.PAGES_TASK['end']
    title_task_out = not TEMP_DATA['nextpage']
    return page_out or page_step_out or page_end_out or title_task_out

# 检测什么时候停止收集邮件标题
def title_task_exit():
    title_step_out = PROFILE.TITLE_TASK['step'] > 0 and PROFILE.TITLE_TASK['start'] + TEMP_DATA['title'] >= PROFILE.TITLE_TASK['step']
    title_end_out = PROFILE.TITLE_TASK['end'] > 0 and PROFILE.TITLE_TASK['start'] + TEMP_DATA['title'] >= PROFILE.TITLE_TASK['end']
    return title_step_out or title_end_out

# 检测字符串是否包含关键词
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
def verify_file_matching(filename, expected_byte):
    path = os.path.join(PROFILE.DOWNLOAD_FOLDER, filename)
    if os.path.isfile(path):
        actual_byte = os.path.getsize(path)
        return True, actual_byte == expected_byte
    return False, False

# 从列表下载所有附件
def download_attach_list(attach_list):
    if not bool(attach_list):
        return
    with ThreadPoolExecutor(max_workers=PROFILE.MAX_CONCURRENT_DOWNLOADS) as executor:
        futures = [executor.submit(download_thread, item) for item in attach_list]
        for future in as_completed(futures):
            result = future.result()


def download_thread(attach_data):
    print(f"即将下载: 第{attach_data['attach_index']}个附件，来自第{attach_data['title_index']}封邮件。 {attach_data['filename']}。{attach_data['fromname']}-{attach_data['title']}")
    # 根据是否跳过文件，决定是否下载文件和输出提示信息
    if PROFILE.SKIP_EXISTS_FILE:
        download_and_wait(attach_data['filedown'], attach_data)
    else:
        download_file(attach_data['filedown'])
    return attach_data


# 实际下载一个文件
def download_file(url):
    global driver
    driver.get(url)
    time.sleep(0.5)

# 下载并等待
def download_and_wait(file_url, attach_data):
    download_file(file_url)
    target_file = os.path.join(PROFILE.DOWNLOAD_FOLDER, attach_data['filename'])
    timeout = PROFILE.DOWNLOAD_TIME_OUT
    while timeout > 0:
        if skip_file_matching(target_file, attach_data['filebyte']):
            print(f"下载完成: {target_file}")
            # 是否需要移动到文件夹
            if PROFILE.CREATE_FOLDER_EACH_TITLE:
                move_file_to_folder(attach_data['filename'], attach_data)
                return True
        time.sleep(1)
        timeout -= 1
    print(f"下载超时: {attach_data['filename']} ({read_bytes(attach_data['filebyte'])})")
    return False

# 移动到文件夹
def move_file_to_folder(filename, attach_data):

    folder_root = PROFILE.DOWNLOAD_FOLDER
    folder_name = StringSub(PROFILE.CREATE_FOLDER_NAME, attach_data)

    folder_path = os.path.join(folder_root, folder_name)
    
    if not os.path.exists(folder_path):
        try:
            os.makedirs(folder_path)
        except FileExistsError:
            pass

    old_path = os.path.join(folder_root, filename)
    new_path = os.path.join(folder_path, filename)

    # 避免目标路径重名冲突
    if os.path.exists(new_path):
        base, extension = os.path.splitext(filename)
        i = 1
        while os.path.exists(new_path):
            new_path = os.path.join(folder_path, f"{base}_{i}{extension}")
            i += 1
    
    try:
        shutil.move(old_path, new_path)
    except Exception as e:
        print(f"无法移动文件 {filename}: {e}")

#-------------------------------------------------------------------------------
# Utility
#-------------------------------------------------------------------------------

def find(elements, selector):
    try:
        return elements.find_element(By.CSS_SELECTOR, selector)
    except:
        return None

def find_all(elements, selector):
    try:
        return elements.find_elements(By.CSS_SELECTOR, selector)
    except:
        return None

def wait_until(elements, selector, timeout=8):
    try:
        return WebDriverWait(elements, timeout).until(EC.visibility_of_element_located((By.CSS_SELECTOR, selector)))
    except:
        return None

def check_file_download(path, expected_name, expected_byte):
    file_path = os.path.join(path, expected_name)
    return os.path.exists(expected_name) and os.path.getsize(expected_name) == expected_byte

# 频繁提示，自动刷新至元素消失
def FBI_WAITTING(id):
    global driver
    if not find(driver, id):
        return
    wait = 0
    while find(driver, id):
        if wait == 0: time.sleep(10); driver.navigate().refresh()
        elif wait == 2: time.sleep(6); driver.navigate().refresh()
        elif wait%3 == 0: time.sleep(3); driver.navigate().refresh()
        else:time.sleep(1)
        wait+=1


# 添加标签，若标签已经存在则跳过，若标签不存在，则新建标签。
def add_mail_tag(tagname):
    global driver
    if find(driver,'#tagContainer') and tagname in find(driver, '#tagContainer').text:
        return
    driver.find_element(By.LINK_TEXT, '标记为...').click()
    if tagname not in find(driver,'#select_QMMenu__menuall_').text:
        print(f"标签 {tagname} 不存在，正在创建标签。")
        new_mail_tag(tagname)
        return
    driver.find_element(By.LINK_TEXT, '标记为...').click()
    cancel_tag_element = driver.find_element(By.XPATH, "//span[contains(text(), '取消标签')]")
    driver.execute_script("arguments[0].nextElementSibling.click();", cancel_tag_element)


# 添加星标，若已星标则忽略
def add_mail_star():
    global driver
    if find(driver, '#img_star').get_attribute('class') == 'qm_ico_flagoff':
        driver.find_element(By.CSS_SELECTOR, '#img_star').click()


# 新建新的标签
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
def save_to_csv(data_list, filepath):
    if not data_list:
        return
    keys = data_list[0].keys()
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, keys)
        writer.writeheader()
        for data in data_list:
            data = {key: data[key] for key in keys}
            writer.writerow(data)
    

# 根据下载计划的配置, 筛选符合的下载范围
def apply_download_schedule(data_list, task):
    start = task.get('start', 1) - 1 or 0
    end = task.get('end') or len(data_list)
    step = task.get('step') or len(data_list)
    selected_data = data_list[start:min(start + step, end)]
    return selected_data

# 读取文件夹的作品数量，通过比较文件名前面10个字符
def get_unique_filenames(folder_path):
    filenames = os.listdir(folder_path)
    unique_names = set()
    for filename in filenames:
        unique_names.add(filename[:10])
    return len(unique_names)


# 根据邮件提供的文件属性，判断文件是否存在，且文件大小相同
def skip_file_matching(filename, filesize):
    folder_root = PROFILE.DOWNLOAD_FOLDER
    filepath = os.path.join(folder_root, filename)
    # 检查文件名和文件大小是否匹配
    if os.path.isfile(filepath) and os.path.getsize(filepath) == filesize:
        return True
    # 替换特殊字符，移除不可打印字符
    legal_filename = validateName(filename)
    # 尝试是否和原始文件匹配
    if os.path.isfile(legal_filename) and os.path.getsize(legal_filename) == filesize:
        return True
    return False

#提取文件名
def get_filename(string):
    return string.split(".")[0] if len(string.split('.')) <= 1 else '.'.join(string.split('.')[0:-1])

# 去除不可见字符
def validateName(filename):
    legal_filename = re.sub(r'[\/|\\|\:|\*|\?|\"|\<|\>|\||\.|]', '', filename)
    legal_filename = re.sub(r'[\\/:"*?<>|]+', '', filename)
    legal_filename = ''.join(filter(lambda x: x.isprintable(), legal_filename))
    return legal_filename

# 补零
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


# 输出文件大小
def read_bytes(bytes):
    if bytes == 0:
        return "0KB"
    size = ("B", "KB", "MB", "GB", "TB")
    i = 0
    while bytes >= 1024 and i < len(size)-1:
        bytes /= 1024.0
        i += 1
    return "{:.2f} {}".format(bytes, size[i])

def StringSub(string, data):
    timestamp = time.localtime(float(int(data['timestamp']) / 1000))

    # 重命名规则模板
    rule = { 
        '{folderid}': str(PROFILE.FOLDER_ID),                                # 文件夹ID
        '{filename}': get_filename(validateName(data['filename'])),          # 文件名 file
        '{filenameEx}': validateName(data['filename']),                      # 文件名 file.jpg
        '{filetype}': data['filename'].split('.')[-1].lower(),               # 文件类型 jpg
        '{titleindex}': str(data['title_index']),                            # 标题顺序
        '{attchindex}': str(data['attach_index']),                           # 附件顺序
        '{page}': str(data['page']),                                         # 邮件位于第几页
        '{pageat}': str(data['pageat']),                                     # 邮件位于第几页的第几封
        '{titlecount}': str(len(LOCALDATA['title_list'])),                   # 总邮件数量
        '{attchcount}': str(len(LOCALDATA['attach_list'])),                  # 总标题数量
        '{tokenpage}': str(LOCALDATA['token_page']),                         # 当前位于第几页
        '{foldername}': validateName(LOCALDATA['folder_name']),              # 文件夹名称
        '{foldertitle}': str(LOCALDATA['title_list']),                       # 文件夹邮件数量：500
        '{pagecount}': str(LOCALDATA['page_count']),                         # 文件夹页数：002
        '{titlename}': validateName(data['title']),                          # 邮件标题
        '{fromname}': validateName(data['fromname']),                        # 发信人昵称
        '{mailid}': data['address'].split("@")[0],                           # 邮箱ID：123456
        '{mailaddress}': data['address'],                                    # 邮箱地址：123456@qq.com
        '{year}': time.strftime("%Y", timestamp),                            # 年：2020
        '{month}': time.strftime("%m", timestamp),                           # 月：11
        '{day}': time.strftime("%d", timestamp),                             # 日：04
        '{week}': time.strftime("%a", timestamp),                            # 周：Wed
        '{ampm}': time.strftime("%p", timestamp),                            # 午：PM
        '{hours}': time.strftime("%H", timestamp),                           # 时：14
        '{minutes}': time.strftime("%M", timestamp),                         # 分：30
        '{seconds}': time.strftime("%S", timestamp),                         # 秒：59
        '{time1}': time.strftime("%H%M", timestamp),                         # 1430
        '{time2}': time.strftime("%H-%M-%S", timestamp),                     # 14-30-59
        '{time3}': time.strftime("%H'%M'%S", timestamp),                     # 14'30'59
        '{date1}': time.strftime("%m%d", timestamp),                         # 1207
        '{date2}': time.strftime("%Y%m%d", timestamp),                       # 20201207
        '{date3}': time.strftime("%Y-%m-%d", timestamp),                     # 2020-12-07
        '{fulldate1}': time.strftime("%Y-%m-%d_%H-%M-%S", timestamp),        # 2020-12-07_14-30-59
        '{fulldate2}': time.strftime("%Y%m%d_%H'%M'%S", timestamp),          # 20201207_14'30'59
    }

    for i, j in rule.items(): 
        string = string.replace(i, j)
    
    return string

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
        else:
            print(f"从缓存数据开始，获取{len(LOCALDATA['title_list'])}封邮件的附件列表。")
        open_mail()
    else:
        print('从缓存数据开始，直接下载附件列表的文件')
    
    # 下载附件列表的附件
    if PROFILE.CAN_DOWNLOAD_ATTACH:
        download_attach_list(LOCALDATA['attach_list'])


if __name__ == '__main__':
    os.system('cls')
    main()
    print('完成。')
    print("邮件总数: ", LOCALDATA['title_count'])
    print("预估文件夹存在的作品数: ", get_unique_filenames(PROFILE.DOWNLOAD_FOLDER))
    input('')
