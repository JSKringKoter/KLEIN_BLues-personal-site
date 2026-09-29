---
title: 从入门到入门的python
tags:
  - python
abbrlink: 5445
date: 2023-04-23 15:42:13
---

某个闲来无事旷了c++课的下着小雨的下午，克林沃特坐在电脑前，寻找着一点可以做的事情。经过了大半个月的苦战，他终于学完了c++的STL。现在，没活整的他决定学一学python，以度过他的Effective C++发货前无聊的时光。由于python实在没什么东西，这篇笔记将只记录有用的语法。



### 输入输出和数据成员

python不需要显示指明变量类型，变量之间的转换也极其方便

```python
print()              #输出
name = input()       #输入，默认为string类型
name = int(input())  #使用int()函数将输入转换为int类型

#类型转换函数：
int()
string()
float()
```



#### 字符串格式化

string类型变量可以拼接：

```python
title = "玩原神玩的"
str = "你说的对"

final = title + str                    #使用+号拼接
final = "你说的对%s" % title            #使用占位符拼接单个字符串
final = "你说%s的对%s" % (title, str)   #使用占位符拼接多个字符串
final = f"你说的对{title}"              #以f打头的字符串可以使用{value}拼接
```

<!--more-->

### 条件和循环

python条件和循环使用4个空格来分级，if等只会执行当前等级的代码

#### 条件

单个if：

```python
if a < b:
    print(a)
    print(b)
#从这里开始向上都会执行
print(c)
```

if-else：

```python
if a < b:
    print(a)
else:
    print(b)
```

if-elif-else：

```python
if a < b:
    print(a)
elif a == b:
    print(b)
else:
    print(a + b)
```



#### 循环

##### for

range()是一个范围，string和list等都属于此范围。理论上py的for不能做到无限循环。

```python
for x in range():
    print(x)
#可以使用range(begin, end, step)函数创建循环范围:[begin, end) per step 
range(10)       #0~9
range(5, 10)    #5~9
range(5, 10, 2) #5, 7, 9
```

##### while

```python
while x < 10:
    print(x)
    x += 1
```

python的循环可以使用break和continue。



### 函数

基本语法：

```python
def function(data1, data2……):
    '''
    说明文档
    '''
    print(data1)
    print(data2)
    return value
```

若不返回值，可不写return，或return None。

函数可以返回多个值：

```python
#函数返回多个返回值
def function():
    return 1, 2
#可以用多个变量接受
x, y = function()
```

可以显示指定参数名称，可以混合指定：

```python
def function(name, age, score):
    function_body
    return None

function(name = "kring", age = 1, score = 100)
function("kring", score = 100, age = 1)         #可以打乱顺序
```

接受另一个函数的函数：

```python
def test(function):
    result = function(1, 2)
    return result

def function(x, y):
    return x + y
```

lambda函数：

```python
def test(function):
    result = function(1, 2)
    return result

test(lambda x, y: x + y)
```



### 容器

#### list链表

```python
#定义和初始化
li = [1, 2, 1.1, "string"] #list的数据类型可以不一样
li_em = list()             #空链表
li_em2 = []                #空链表

#下标访问
li[n]                      #正向索引
li[-n]                     #反向索引

#查找元素
locate = li.index(value)   #查找value，返回locate（int）；若未找到，valueError错误

#插入元素
li.insert(locate, value)   #在locate（之前）插入值为value的元素

#追加元素
li.append(value)           #将value添加到末尾
li.extand(other range)     #将其他数据容器追加到末尾

#删除元素 
del li[n]                  #删除下标为n的元素
element li.pop(n)          #取出下表为n的元素，并存储在element中

li.remove(value)           #删除第一个值为value的元素
li.clear()                 #清空列表

#统计元素
number = li.count(value)   #统计value的数量
lenth = len(li)            #返回li的长度
```



#### tuple元组

元组相当于一个const数组，长度和数据成员均不能修改。

```python
#定义和初始化
tp = (1, 2, 1.1, "string")
tp = ()
tp = tuple()

#查找
locate = tp.index(value)

#统计
number = tp.count(value)
lenth = len(tp)
```



#### set集合

set不是序列，由于元素储存顺序随机，不支持下标索引。set不支持重复。

```python
#定义集合
mySet = { 1, 2, 3 }
mySet = set()

#不支持下标索引

#添加元素
mySet.add(value)

#移除元素
mySet.remove(value)        #移除value的元素
mySet.clear()              #清空元素

#随机取出一个元素
element = mySet.pop()      #随机取出值，存放于element

#取集合1和集合2的差集（集合1有但集合2没有），集合本身不变
mySet1.diffence(mySet2)
#删除集合1中，集合1和集合2的差集
mySet1.diffence_update(mySet2)

#取并集，得到新集合，原集合不变
mySet1.union(mySet2)

#统计集合元素数量
mySet1.count()


```



#### dict字典

```python
#定义和初始化
dic = { key:value, key:value }
dic = {}
dic = dict()

#不支持下标索引
#可以使用key索引获取value
value = dic[key]

#删除元素，返回删除key的value
value = dic.pop(key)
#清空元素
dic.clear()

#获得dict中所有元素
all = dic.keys()  #可以基于此使用for遍历

#获得元素数量
number = len(dic)
```





#### 容器切片

```python
li2 = li[begin, end, step]   #将li在begin和end中每step步切片
#如果步长为负，则反向取
```



### 导入和自定义包

#### 导入包

包类似于c++的头文件，python使用.py文件保存包，使用如下语法导入包：

```python
import time    //导入整个包
time.sleep(1)  //方法调用方式

from time import sleep    //导入一个方法
sleep(1)

from time import *        //导入整个包，但调用方式于前者不同
sleep(1)
```

#### 自定义包

自定义包只需创建一个.py文件即可，在包中有两种特殊语法：

##### ``` if __main__```语法

```python
def test(a, b):
    print(a + b)
    
if __name__ == '__main__':
    test(1, 2)               #test只在该文件中执行
```

该语法用于包内测试，当写了一个test函数后，期望在包内测试，如果不使用此语法在主函数中测试语句也会被调用。该语法保证只在包文件内执行if同级的语句。

##### ``` __all__```语法

在自定义包前加上```__all__ = ["function_a", "function_b"]```可指定from test import *的包含范围。

```python
__all__ = ["function_a", "function_b"]

def function_a():
    ……
def function_b():
    ……
def function_c():
    ……
    
from function import *
function_a()   #可用
function_b()   #可用
function_c()   #不可用
```



### json数据格式

#### 将字典或列表转换为json

```python
import json

data = [{"克林沃特": 10, "猫猫": 1}, {"kringkoter": 100, "goxst": 120}]
json_str = json.dumps(data)                       #使用ASCⅡ码转换unicode字符
#输出：[{"\u514b\u6797\u6c83\u7279": 10, "\u732b\u732b": 1}, {"kringkoter": 100, "goxst": 120}]
json_str = json.dumps(data, ensure_ascii=False)   #不使用ASCⅡ转换
#输出：[{'克林沃特': 10, '猫猫': 1}, {'kringkoter': 100, 'goxst': 120}]
```

#### 将json转化为字典或列表

```python
import json
data = "[{"\u514b\u6797\u6c83\u7279": 10, "\u732b\u732b": 1}, {"kringkoter": 100, "goxst": 120}]"
str = json.loads(data)
#自动转换unicode
#输出：[{'克林沃特': 10, '猫猫': 1}, {'kringkoter': 100, 'goxst': 120}]
```



### 数据可视化

#### 折线图

```python
from pyecharts.charts import Line         #引用包
from pyecharts.options import TitleOpts   #引用设置包

#创建Line对象
line = Line()
line.add_xaxis(list_x)            #向x轴添加数据
line.add_yaxis("type", list_y)    #向y轴添加数据，type为数据类型

line.set_global_opts(             #全局设置
)
line.render()                     #打印图表
```

