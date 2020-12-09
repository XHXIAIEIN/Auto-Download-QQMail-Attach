支持Mac和Windows系统。
https://zhuanlan.zhihu.com/p/51543237

## 批量下载QQ邮箱附件，下载完后修改文件重命名

因为工作原因，需要处理QQ邮箱上来自各地网友的投稿附件。数量比较多（上千份），如果手动一个一个下载非常麻烦。。。

而且有些发来的附件命名也不规范，下载下来之后还需要手动去重命名，否则放一起就分不清谁是谁了，还会出现大量重复的命名文件。 这种非常机械化的重复操作，我想写个脚本批量下载QQ邮箱附件。

网上搜了下资料，基本都是通过POP3来下载，但是这个邮箱并不是自己的，只是临时注册用来接收邮箱的小号，而对方也不希望开通手机认证。

于是临时研究了一下 Python + selenium + Chrome 来模拟手动爬虫~
  
补充：后面发现了 helium，真的太方便啦~！！ 

## 如何安装

### MAC

如果你是MAC用户。操作相对简单一些：
 - 1. **安装Homebrew**
      https://brew.sh/index_zh-cn
      
      简单的说，就是把下面这段指令复制粘贴到终端(Terminal)   
      ```/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install.sh)"```
   
<br>   
     
- 2. **安装 python3 + selenium + helium + chromedriver**
     简单的说，就是把下面这段指令复制粘贴到终端(Terminal) 
     ```
     brew install chromedriver
     brew install selenium
     brew install helium
     brew install prettytable
     ```
   
<br>   
     
### Windows
Windows用户安装稍微复杂一点点，不过大家都习惯了这些蛋疼的操作了吧：

  - **Python 3**   
    https://www.python.org/

  > 下载最新版即可，跟着引导安装，点页面中那两个带着小盾牌图标的大按钮。
  > - [x] 1. Install Now
  > - [x] 2. Disable path length limit
   
<br>   
   
  - **WebDriver for Chrome**  
    https://sites.google.com/a/chromium.org/chromedriver/downloads

<br>   
     
> 注1：根据自己Chrome当前的版本号，下载对应版本号的chromedriver。
> 比如你浏览器版本号是是80.0，就下载80.0版本。
> 以后有更新，也是需要重新下载对应版本的chromedriver。否则会报错。
>   
> 注2：**如何查看Chrome当前版本号**：  
> 右上角 - 设置 - 关于Google Chrome 
>   
> 注3：**如何安装**：  
> 下载好之后，把`chromedriver.exe`放到随意一个文件夹，然后复制当前这个文件夹的路径。
> 通常我喜欢把这类工具专门放到一个叫bin的文件夹里。比如` D:\Program\bin`
>   
> 按下Win键，输入 path ，会看到一个「编辑系统环境变量」，按下回车就能打开它。
> 打开右下角「环境变量」，在下面「系统变量」列表里，找到「Path」的一行，双击编辑。
> 右上角有「新建」，它会在列表后面新建空的一行，接着把刚才的文件夹路径粘贴进去就可以了。
   
<br>   
   
- **Nodejs**   <br>
  https://nodejs.org/zh-cn/

> 下载最新版即可，跟着引导安装，一直点下一步。
   
   <br>   
  
- **PIP**  
> NodeJs安装完成后，按下Win + R，输入 cmd。然后按Ctrl + Shift + 回车键。 <br>
> 以管理员权限进入命令行。接着输入下方的两条指令：

- **selenium**  
```
python -m pip install --upgrade pip
pip install selenium
pip install helium
pip install prettytable
```
   
<br>   
   
繁琐的前置工作完成了。接着可以正式开始咯。  
   
<br>   
   
## 如何使用

已经安装了Python，会发现开始菜单新增了一个IDLE编辑器。打开Shell窗口后在菜单新建文件。【File - New File】 <br>
 <br>
然后把[QQMail.py](https://github.com/XHXIAIEIN/Auto-Download-QQEmail-File/blob/master/QQMail)里的代码复制粘贴到IDLE中，将文件保存在任意位置，随便取个名比如QQmail.py。 <br>
另外建议不要放在桌面，因为脚本会生成一个文件夹用来储存浏览器缓存，可能有些占位置。 <br>
 <br>
当你想运行脚本时，只需要在IDLE中按下键盘F5，就可以运行了。
   


<br>   
   
> 注：通过运行脚本启动的浏览器窗口，只能同时启动一个。若重复启动脚本将会打开空页面，需要关闭上一个窗口重新运行脚本。
   
<br>   
   
登陆进邮箱主页后，需要做几件事   
   
### 1 邮箱文件夹
把你想要下载的邮件**移动到**文件夹里，方便整理区分。
   
<br>   
   
### 2 新窗口打开文件夹（重要）
从邮箱左侧的面板‘我的文件夹’中找到你刚刚创建的文件夹，**右键-新窗口打开**。在浏览器的地址栏找到链接的文件夹ID参数:  `folderid`
```
https://mail.qq.com/cgi-bin/frame_html?t=frame_html&sid={ x }&url=/cgi-bin/mail_list?folderid={ A }%26page={ x }
```
脚本中也提供了将文件夹列表输出到控制台的选项，可以在DEBUG分栏里手动开启can_print_folder_table  

<br>   
   
### 3 修改脚本里面的自定义参数，然后启动脚本

主要有几个参数需要修改：

1. 邮箱登录账号(QQ) （必填）. ``QQNUMBER`` 和 ``PASSWORD``  <br>
请放心填，没人能偷看你屏幕。。  <br>

   
   <br>   
   
2. 附件下载路径（必填）. ``DOWNLOAD_FOLDER``  <br>
浏览器下载的文件会自动保存在这里。   <br>
注：路径需要以 \\ 作为分隔。如： ``` DOWNLOAD_FOLDER='D:\\Downloads\\' ``` <br>
如果你是MAC，则需要 \\ 作为分隔符。
 
 <br>   
   
3. 文件夹ID（必填）.  ``FOLDER_ID`` <br>
其实脚本在打开邮件时，会把你所有的文件夹打印在控制台。你可以从记录看到对应的文件夹ID。 <br>
或者在左边面板我的文件夹，右键新窗口打开，也可以在浏览器地址栏找到folderid
   
<br>   
   
4. 计划任务 <br>
  Title_Task，从第几封邮件开始，只读取多少封邮件，或者在第几封邮件结束。 <br>
  Pages_Task，从第几页开始，翻多少页后结束，或者在第几页结束。 <br>
   <br>
  start，表示从第几个开始。默认是1 <br>
  steps，表示执行多少次。比如从第1个开始，往后数第10个后结束，也就是10次。 <br>
  end, 表示到第几个结束。比如从第1个开始，到第50个结束。 <br>
  end和steps不同的地方是，end代表着结束的终点，而steps则是开始后累计的过程。 <br>
  ``` Title_Task = {'start':1,'step':0,'end':0} ``` <br>
  ``` Page_Task = {'start': 1,'step':0,'end':0, 'autoNext': True} ```
   
<br>   
   
5. 邮件主题关键词过滤 <br>
  title_whitelist_keys，白名单关键词。 <br>
  title_blacklist_keys，黑名单关键词。 <br>
   <br>
  ``` title_whitelist_keys = ['反馈','2020'] ，这样就只处理邮件主题中包含这两个关键词的邮件``` <br>
  ``` title_blacklist_keys = [''] ```
   
<br>   
   
6. 附件类型词过滤 <br>
  attach_blacklist_filetype，白名单关键词。 <br>
  attach_whitelist_filetype，黑名单关键词。 <br>
   <br>
  ``` title_whitelist_keys = ['反馈','2020'] ，这样就只处理邮件主题中包含这两个关键词的邮件``` <br>
  ``` title_blacklist_keys = [''] ```
   
<br> 
   
7. Config 高级参数<br>
  脚本中还提供了一些高级选项，可以根据实际需要来开启或关闭。通常修改参数为 1 或 0

```python

# 浏览器禁用显示图片（浏览器首次运行前生效）
can_disabled_images = 0


#······························
# 读取邮件

# 是否倒序读取（从最后一页开始往前）
can_reverse_list = 0

#······························
# 下载附件

# 是否需要重命名附件
can_rename_file = 0

# 是否需要每封邮件创建文件夹
can_move_folder = 1

# 在下载前，检查本地文件是否已存在附件（根据文件名+文件大小）
# 如果存在则跳过本次下载。
ready_download_but_file_exists = 'skip' or 'continue'

#······························
# 星标 / 标签

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

#······························
# 功能

# 是否需要下载附件
can_download_file = 1

# 是否需要进入邮件正文
can_load_email = 1

# 是否需要获取邮件标题列表
can_load_title = 1

# 下载等待时长(单位：秒)。超过时长后则放弃后续操作，如移动文件夹或重命名。
downloading_timeout = 300

#······························
# 控制台
 
# 是否在控制台打印邮件信息
can_print_title = 1
can_print_attch = 1
 
# 是否在控制台打印统计表格
can_print_folder_table = 1
can_print_title_table = 1


#······························
# 统计

# 是否将数据导出为CSV文件
can_export_titledata_to_csv = 1
can_export_attchdata_to_csv = 1

#······························
# 高级选项

# 是否需要设置 desired_capabilities 参数
can_set_capabilities = 1
config_timeout_pageLoad = 10000
config_timeout_script = 1500

```

<br>   
    
   
### 6 附加脚本：将含有关键词的文件移动到指定文件夹。

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
    # 提前新建好需要分类的文件夹
    os.mkdir('psd')
    os.mkdir('图片')
    os.mkdir('反馈')
    os.mkdir('VIP')
    
    # 过滤扩展名：比如将.jpg文件移动到‘图片’文件夹。
    find_key('*.psd','psd')
    find_key('*.PSD','psd')
    find_key('*.jpg','图片')
    find_key('*.png','图片')
    
    # 过滤关键词：比如将含有‘issues’的文件名移动到'反馈'目录
    find_key('*issues*.*','反馈')
    find_key('*会员*.*','VIP')
```
   
   <br>   
   
## 特性
- 自定义附件的下载路径
- 自动翻页
- 填写账号密码，自动登录。
- 若自动登录失败，可手动登录，再根据SID密钥记住登录。
- 自定义邮件标题的白名单或黑名单关键词，过滤某些邮件名。
- 自定义附件扩展名黑名单关键词，不下载某类文件。
- 自定义从第几封邮件开始，第几封邮件结束，处理多少封邮件后结束。
- 自定义从文件夹第几页开始，到第几页结束，只处理多少页的任务计划。
- 可以自动修改每页显示数量为100封，需手动开启。
- 如果邮件没有包含附件，可以导出eml文件，需手动开启。
- 如果邮件没有包含附件，会自动打星标。
- 打开邮箱时，可以输出所有文件夹列表，方便到文件夹ID。
- 脚本结束后会生成csv文件，包含所有附件列表信息。
- 脚本结束后会生成csv文件，包含所有附件列表信息。
- 如果浏览器请求速度过快，脚本会自动刷新页面，等待恢复正常

  
<br>   
   

## 可能出现的问题

1. 如果网络不稳定。附件的预览图如果没有加载出来，脚本可能会卡住。 <br> 
（已修复。解决方案：以不加载图片的模式启动浏览器）

2. 如果窗口太小，可能获取不到页面元素，然后报错。 <br> 
（已修复。解决方案：在启动浏览器时调整窗口大小至合适的值，主要是高度）

3. 如果开车的速度过快，会被系统拦下车。提示：【您请求的频率太快，请稍后再试】 <br> 
（已修复。当出现提示窗口时，脚本自动会等待10秒，并自动反复刷新，直到恢复暂停的地方继续下载）

4. 如果电脑打开了QQ，登陆页面会出现手机扫码登陆的提示，导致自动填写账号失败。 <br> 
（已修复。自动检测是否出现扫码提示，并切换到账号密码登陆。）

5. 因不明原因，有几率在登录阶段需要安全验证，滑动拼图滑块。导致无法自动登录 <br> 
（已修复。解决方案有些麻烦。需手动登录，并在脚本处手动关闭[拦截浏览器显示图片]配置，登陆后需手动记录SID密钥。关闭脚本再次运行脚本，即可自动登录。）

6 收件人含有特殊符号，导致脚本奔溃。 <br> 
（事实上，我并没有对字符串做处理，只是将他们输出在控制台而已。报错是因为编码问题，你可以将打印到控制台中的方法全部禁用掉，直接下载附件就行）

7. 本地重命名的批处理脚本，如果附件有重复的文件，后面的相同的文件不会被重命名。 <br> 
（没想好。临时解决方案：根据输出的记录，搜索文件名，找到发件人昵称或者邮箱，手动重命名）
  

<br>   
   

## 踩坑历史
1. 附件收藏中的"全部附件"，并不是想象中真的把全部附件整合在一起，还是会漏掉一些，关键是还不知道漏了哪些。
  （解决方案：换成进入邮件主题下载附件）
   
2. 在下载过程中，中途收到了新的邮件，列表顺序会出现错误。
 （不要下载收件箱的邮件，建议将他们移动到文件夹里下载，并关闭该文件夹的收件规则。）  
  
<br>   
   
