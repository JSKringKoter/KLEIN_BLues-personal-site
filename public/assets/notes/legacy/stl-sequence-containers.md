---
title: 顺序容器
tags:
  - c++
  - STL
  - 笔记
abbrlink: 54300
date: 2023-04-06 14:13:41
---

### 顺序容器的分类

容器特定对象（包括内置数据类型，结构，类等）的集合。顺序容器则提供了按顺序储存或访问它们的能力。

理解为一个很牛逼的数组就行了。

下面是顺序容器的类型和特点：

| 容器类型     | 特点                                                         |
| ------------ | ------------------------------------------------------------ |
| vector       | 大小可变，可以增添或删除，可以随机访问。在尾部之外的地方插入数据可能很慢。 |
| deque        | 双端队列，在头部插入数据很快。                               |
| list         | 双向链表，在任何位置插入数据很快，但访问很慢。               |
| forward_list | 单向链表，只支持单向数据访问，在任何位置插入数据很快。       |
| array        | 固定数组，无法变化大小，可随机访问。                         |
| string       | 类似于vector<string>                                         |

应在不同情况下选择不同的容器，一般除非有特殊理由，则使用vector。避免使用数组，容器的数据处理效率要大于数组。如果不确定应选择何种容器，则在只使用vector和list的情况下使用迭代器（而不是下标访问）。



### 顺序容器的迭代器

所有的容器迭代器都有++操作，--仅forward_list不支持（无法双向访问）。支持随机访问的迭代器才能使用+, -运算符。

可以对迭代器使用<, <=, >, =>运算符，但list和forward_list不支持。

<!--more-->

### 顺序容器定义和初始化

初始化方法：

```c++
list<int> a;                       //名称为a的空容器
list<int> c{ 1, 2, 3 };            //列表初始化
//或list<int> c = { 1, 2, 3 };
list<int> d(c);                    //将d初始化为c的拷贝
//或list<int> d = c;
list<int> e(c.begin(), c.end());   //将e初始化为两个迭代器中的元素

//仅顺序容器可用
list<int> (5);                     //五个元素的空容器
list<int> f(5);                    //含有五个元素的容器
list<int> h(5, 1145);              //含有五个元素，值都为1145的容器
```



将一个容器初始化为另一个容器的拷贝，容器类型必须相同，但使用迭代器则不要求。**程序员要保证类型匹配。**

```c++
vector<double> vecDou{ 1, 2 ,3 };
vector<int> vecInt2(vecDou);  //非法！
vector<int> ve2Int(vecDou.begin(), vecDou.end());  //合法
	
vector<string> vecString{ "addd", "add" };
vector<const char*> vecChar(vecString);  //非法！
vector<const char*> vecChar2(vecString.begin(), vecString.end());  //合法
vector<int> vecInt(vecString.begin(), vecString.end());  //合法，但绝对不能这样做。
```



#### array容器的特殊初始化

array容器可以看作定长数组，在初始化时必须传递长度数据。

```c++
array<int, 3> arr;   //长度为3，储存int的array
array<int>  arr;     //非法！array<int>不是类型
```



无法对内置数组类型进行拷贝，但array可以。

```c++
int a[3] = { 1, 2 };
int b[3] = a;  //非法！

array<int, 3> a = { 1, 2 ,3 };   
array<int, 3> b = a;  //合法，只要类型匹配
```

在拷贝时，必须保证数据类型和大小完全一致。迭代器方法在此无效。



### 顺序容器的赋值

使用=运算符的前提是容器类型一致，赋值后左边容器和右边容器完全相同。赋值操作会使得指向左边容器的指针，迭代器和引用失效。

swap()和assign()函数可用于更改容器的值。且指针，迭代器和引用不会失效。

```c++
swap(a, b);   //交换两个容器的值，要求类型相同
a.swap(b);    //使用成员函数法，两种方法都比直接拷贝快

a.assign(b.begin(), b.end());  //将指定迭代器范围内的数据赋给a
a.assign({ 1, 2, 3 });         //将a替代为初始化列表
a.assign(4, 2);                //将a替代为四个为2的元素
```

这两个函数都不能直接传递类型不匹配的容器。



*书后习题：将一个list<char指针>赋给vector<string>*

```c++
list<const char*> liChar(3);  //为了可以赋值，这里用了const char*
liChar.assign({ "addd", "adddd", "add" });

vector<string> vecString(liChar.begin(), liChar.end());
vecString.assign(liChar.begin(), liChar.end());
```



#### 关系运算符

所有容器都支持等于和不等，除了无序关联容器以外都支持大于小于，大于等于小于等于。

只有当两个容器类型完全相同时才能使用关系运算符。



*书后习题：比较list<int>和vector<int>中的元素*

```c++
bool operator<(list<int> listInt, vector<int> vecInt) {
	list<int>::iterator iterList = listInt.begin();
	vector<int>::iterator iterVec = vecInt.begin();

	for (iterList, iterVec; iterList != listInt.end() || iterVec != vecInt.end(); iterList++, iterVec++) {
		if (*iterList < *iterVec)
			return true;
	}
	return false;
}
//其实就是给一个运算符函数
```



### 顺序容器操作

#### 向容器中增加元素



##### push_front和push_back

向容器前和后增加元素，其中vector和string不支持push_front。

```c++
list<int> lis;
lis.push_front(1);
lis.push_back(1);
```



##### insert

前者为在首位增添元素提供了便捷的方法，而insert则更加泛用。不支持push_front的vector和string也可以通过insert来向首添加元素。

```c++
vector<int> vec;
vec.insert(vec.begin(), 1);
vec.insert(vec.begin(), vec2.begin(), vec2.end());

vec.insert(vec.begin(), 2, 2);   //增加两个为2的元素
vec.insert(vec.begin(), { 1, 2, 3 });  //列表初始化
```



insert()函数返回一个指向插入元素头的迭代器，可以用这个特性编写循环，使得向一个地方持续插入数据。

```c++
int a;
auto iterList = lisInt.begin();
while (cin >> a) {
	iterList = lisInt.insert(iterList, a);
}
```



##### emplace

emplace有emplace，emplace_front，emplace_back三种，对应于insert，push_back，push_front。使用emplace时，参数将传递给构造函数，将构造一个临时对象压入容器，而push则是直接对内存操作。

```c++
vector<int> vec;
vec.emplace(vec.begin(), 1);  //等于vec.insert(vec.begin(), 1)
```

当容器元素是用户自定义对类时，可能要求传递多个参数，push没有多个参数的版本，只能传递构造好的对象。而emplace整合了构造函数的用法。也可以这样用：

```c++
//构造一个传递三个变量的addd对象
//使用emplace
vec.emplace("ni", "shuo", "de");
//或者
vec.push_back(addd("ni", "shuo", "de"));

//不能：
vec.push_back("ni", "shuo", "de");
```





#### 访问元素

容器类提供了直接访问元素的方法和使用迭代器访问的方法。

```c++
vector<int> vec;

if (!vec.empty()) {
    int a = vec.front();
    int b = vec.back();
    
    int c = *vec.begin();
    int d = *vec.end();
    
    int e = vec[n];
    int d = vec.at(n);
}
```

其中，front()返回首元素的引用，back()返回尾元素的引用，与end()不同的是，后者返回超尾元素（的迭代器）。forward_list容器没有back()。

支持随机访问的容器可以使用下标访问法和一个返回引用的函数at()。

**应在使用这些函数之前检查容器是否为空，且下标不能越界。**



#### 删除元素

容器类提供了删除元素的方法：

```c++
vector<int> vec;

vec.pop_back();    //删除第一个元素，返回void
vec.pop_front();   //删除最后一个元素，返回void

vec.erase(p);      //删除迭代器p指向的元素，返回指向p后的迭代器
vec.erase(a, b);   //删除迭代器a，b区间内的元素，返回指向b后的迭代器。若b为end()，返回尾后迭代器
vec.clear();       //删除vec中的所有元素。返回void
```

这些操作不适用于array和forward_list。前者是由于删除操作改变了容器大小，后者是因为链表的特殊性。

可以通过erase()返回尾后迭代器的特性编写代码，遍历容器，并对指定数据操作：

```c++
vector<int> vec;
auto iter = vec.begin();

while (iter != vec.end()) {
    if (*iter % 2)
        iter = vec.erase(iter);
    else
        iter++;
}
```

如果*iter为奇数，删除该元素，返回的迭代器指向下一个元素；如果不是，则将迭代器递增。代码等同于：

```c++
if (*iter % 2) {
    vec.erase(iter);
    iter++;
}
```



##### 特殊的forward_list操作

对于一个链表来说，更改元素需要改变前一元素的属性，而forward_list不能递减访问。它给出的删除函数都只能删除某元素后的内容。

```c++
forward_list<int> vec;

vec.before_begin();         //特殊的before_begin()，返回首前迭代器
vec.begin();

vec.insert_after(p, t);     //p为位置，t为插入的对象
vec.insert_after(p, a, b);  //p为位置，a，b为迭代器
vec.insert_after(p, n, t);  //p为位置，n为数量，t为对象
vec.insert_after(p, li);    //p为位置，li为初始化列表

vec.emplace_after(p, args); //p为位置，args为构造函数参量

vec.erase_after(p);         //删除指向p后的元素，若p为尾元素，则函数行为未定义
vec.erase_after(a, b);      //删除b到e中的元素
```

若想要向上一点一样遍历+删除容器内容，则需要这样做：

```c++
auto iterBefore = vec.before_begin();
auto iterCurrent = vec.begin();

while (iterCurrent != vec.end()) {
    if (*iterCurrent % 2)
        iterCurrent = vec.erase_after(iterBefore);
    else {
        iterBefore = iterCurrent;
        iterCurrent++;
    }
}
```



#### 改变容器类大小

```c++
//array不支持
vec.resize(n);   //大小调整为n个元素，若为对象，调用默认构造函数
vec.resize(n, t);  //大小调整为n个元素，初始化为t
```



#### 容器操作会使迭代器失效

由于如删除，添加元素等操作会使得迭代器指向的内存空间改变或失效，当改变一个容器的内容时，必须重新定位迭代器。使用失效的指针和迭代器是一种严重的程序设计错误。

##### 例：改变容器的循环程序

添加删除vector，string，deque容器时必须考虑更新迭代器。

```c++
vector<int> vi{ 1, 2, 3, 4, 5, 6 };
auto iter = vi.begin();

while (iter != vi.end()) {
	if (*iter % 2) {
		iter = vi.insert(iter, *iter);
		iter += 2;                       //在元素之前插入
	}
	else
		iter = vi.erase(iter);
}
```

insert()函数返回的是插入元素的迭代器，这个插入元素位于iter之前，也就意味着需要iter+=2才能使iter指向下一个元素（iter++指向的是原来的iter，原iter在插入操作后失效。）

注意到其中```iter = vi.insert(iter, *iter);```，如果不接受insert()返回的迭代器，仅将iter++，将会出现严重错误，因为插入操作后iter迭代器失效，必须重新指定。



##### 不要保存end返回的迭代器

end返回的迭代器会随着插入，删除等操作不断变化，将end迭代器保存是完全错误的。

```c++
vector<int> vi{ 1, 2, 3, 4, 5, 6 };
auto iter = vi.begin();

while (iter != vi.end()) {
	iter++;
	iter = vi.insert(iter, 4);    //在元素之后插入
	iter++;
}
```

绝对不能写成：

```c++
auto end = vi.end();
while (iter != end) {
}
```



#### 管理容器容量的函数

可以随机访问的容器在管理内存空间时通常分为两部分：储存元素的部分，预留给元素的部分。通常预留给元素的部分不为空，能通过函数来操作。

```c++
vector<int> vi;
vi.size();           //返回元素数量
vi.capacity();       //返回总内存空间的数量

vi.resize(n);        //重新分配元素数量为n
vi.reserve(n);       //重新分配内存空间数量为n（可能会更大），如果小于size，则不会处理请求
vi.shrink_to_fit();  //将内存空间调整为正好合适。只是一个请求，不保证退还内存
```

在必须要扩大内存时，容器会一次请求很多内存。请求内存较慢，但向内存中压入元素很快，所以vector和string容器采用这样的方法。list并不需要连续的内存空间，array长度为定值，都不需要这样的内存管理。