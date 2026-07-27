---
title: vector模板库和迭代器
tags:
  - c++
  - STL
  - 笔记
abbrlink: 36942
date: 2023-04-04 19:31:27
---

STL（Standard Template Library）标准模板库提供了容器，迭代器，函数对象和算法的模板，这些组成了一种不同于OOP的编程思想：泛型编程。



### 模板类vector

vector可以译作“向量“（事实上在UE4中确实如此），但它实际对应数组。vector储存了一组可随机访问的值，可以对它使用[], *等运算符来访问数据。

要创建vector对象，需要使用<type>表示法来指出需要的类型。可以使用初始化参数指出需要储存多少数据。

```c++
#include <vector>
using namespace std;

vector<double> rating(5);
vector<int> score(n);   //n为变量
```

可以通过数组表示法访问各个成员。

```c++
rating[0] = 1.3;
for (int i = 0; i < n; i++) cout << rating[i];
```


<!--more-->
### 迭代器

迭代器是一个对象，但它具有指针的性质，可以认为它是一个广义指针。可以对其使用operator*(), operator++()等。将指针定义为迭代器，可以对STL中不同的容器执行统一的操作。每个容器类都定义了一个合适的迭代器，名为iterator。

为vector<double>容器声明迭代器：

``` vector<double>::iterator pd;```

可以使用迭代器对该容器内数据进行操作：

```c++
vector<double>::iterator pd;
vector<double> vec(5);
pd = vec.begin();  //指定迭代器为vec对象第一个数据
*pd = 22.3;        //将第一个数据赋值
pd++;              //令pd指向第二个数据
```

可用c++类型自动推断简化代码：

```c++
vector<double>::iterator pd = vec.begin();
auto ps = vec.begin();
```



#### 1.可以对矢量进行的操作

所有STL容器都提供了一些基本方法，包括了以下几种：

> size() 返回容器中元素数目。
>
> swap() 交换两个容器中的内容。
>
> begin() 返回指向容器第一个元素的迭代器。
>
> end() 返回指向容器超过末尾的迭代器。

vector容器也包括了一些只有某些STL容器才有的方法，如：

> push_back() 将元素添加到容器尾，自动进行内存管理。
>
> erase() 删除给定区间的元素。
>
> insert() 将给定区间元素插入指定位置。



push_back()函数接受一个容器元素，将其添加到容器尾。

```c++
vector<double> vec;
vec.push_back(3.1);
```

erase()函数接受两个迭代器参数，将其中的元素删除。

```c++
vector<int> vec(5);
vec.erase(vec.begin(), vec.begin() + 2);  //删除[1, 3)中的元素，即第0，1元素
```

insert()函数接受三个迭代器参数，第一个参数是插入的元素位置（的前面），后面两个参数是插入的元素范围。

```c++
vector<int> oldVec;
vector<int> newVec;
···
newVec.insert(newVec.begin(), oldVec.begin() + 1, oldVec.end());
//将oldVec中除第一个元素外复制到newVec第一个元素前面
newVec.insert(newVec.end(), oldVec.begin(), oldVec.end());
//将oldVec的所有元素复制到newVec的末尾
```

> vec.erase(it1, it2);
>
> 若it1和it2都为迭代器，则范围表示[it1, it2)。集合[begin(), end())表示包括集合的所有内容，[p1, p1)则为空。



#### 2.可以对矢量进行的其他操作

STL定义了非成员函数来省去重复的操作，这些方法适用于所有容器类。但在有些时候STL也定义了成员函数，原因是类特定算法比通用算法的效率高。由于是非成员函数，不能通过成员访问法调用。

以下是三个STL函数：

> for_each() 遍历指定范围的元素
>
> random_shuffle() 随机排序指定区间的元素，要求容器支持随机访问。
>
> sort() 排序指定区间的元素，要求支持随机访问。

在使用STL非成员函数时，先包含``` #include <algorithm>```，并使用标准名称空间。



* for_each()

该函数接受三个参数：起始位置迭代器，终止位置迭代器，函数对象。

```c++
vector<string> vec(3);
vec = {
    "JS", "Kring", "Koter"
};
for_each(vec.begin(), vec.end(), showString);  //对vec.begin()和vec.end()中的元素执行showString();
```

应注意函数对象的参数列表仅能含有与vector<type>相同（或能隐式类型转换）的变量。默认参数也不好使。

```c++
showString(const string& str);  //合法
showString(const string& str, int i = 0);  //编译器不会报错，但无法通过编译
```



使用for_each()可以避免使用迭代器变量，如：

```c++
auto ps = vec.begin();  //在遍历时需要使用变量ps
for (ps = vec.begin(), ps < vec.end(), ps++)
    showString(*ps);
```



* random_shuffle()

该函数接受两个参数：起始位置迭代器，终止位置迭代器。

以下代码将随机排列vec中的元素：

```c++
vector<int> vec(10);
random_shuffle(vec.begin(), vec.end());
```



* sort()

该函数有两个版本，先来看第一个。

第一个版本传递两个参数，使用默认的<运算符排序（升序），作用对象是储存在容器内的类型元素（即不能是用户自定义类型）。

```c++
vector<string> vec(5);
sort(vec.begin(), vec.end());
```

如果要对用户自定义类型进行排序，需要有相应的运算符重载函数：operator<()

```c++
struct book {
    string title;
    int rating;
}

bool operator<(const book& b1, const book& b2)
{
    if(b1.title < b2.title)
        return true;
    else if(b1.title == b2.title && b1.rating < b2.ratring)
        return true;
    else
        return false;
}

int main()
{
    vector<book> bo(5);
    sort(bo.begin(), bo.end());
    return 0;
}
```

此程序对book按title的首字母进行排序，若相同，则比较rating的大小。



另一种sort()函数接受三个参数，最后一个是函数对象。要求该函数返回值可转换为bool，当返回false时表示顺序不正确。

```c++
struct book {
    string title;
    int ratnig;
}

bool worseThan(const book& b1, const book& b2)
{
    if (b1.title > b2.title)
        return true;
    else 
        return false;
}

int main()
{
    vector<book> bo(5);
    sort(bo.begin(), bo.end(), worseThan);
    return 0;
}
```



#### 3. 为何使用迭代器

STL容器可以包含不同的数据类型，模板使得算法独立于数据类型，迭代器使得算法独立于容器。不同的容器都可以使用统一的算法和接口，这就是迭代器的作用。

STL为每个容器定义了一个迭代器，这使得非成员函数可以通用。



#### 4.迭代器类型

不同的算法依赖于不同的迭代器，迭代器的权限也不同。按照进化关系，依次分为：

1. 输入迭代器

输入迭代器用于读取容器中的元素，不能写入。它只能递增，不能递减。

2. 输出迭代器

输出迭代器类似于输入迭代器，它只能写入容器的元素，不能读取。它只能递增，不能递减。

3. 正向迭代器

正向迭代器类似于输入和输出迭代器的组合，它可以读写数据。但它也只能递增，不能递减。

正向迭代器可以读写数据，也能定义为只读：

```c++
int* ps;
const int* ps;
```

4. 双向迭代器

可以读写数据，同时也能递增与递减，但不能随机访问。

5. 随机访问迭代器

可以读写数据，递增与递减，也能访问指定的元素，例如：

```c++
ps++;
cout << *(ps + 2);
```

对于一个迭代器ps，仅有ps和ps + n都位于容器范围内（包括超尾）才合法。




### 基于范围的for循环(C++11)

考虑以下代码：

```c++
int array[4] = [1, 2, 3, 4];
for (int x : array)
    cout << x < endl;
```

括号内的代码声明了一个与容器类型相同的变量，并指出容器名称。将使用指定的变量遍历容器。

可以使用c++自动类型推断：

```c++
for (auto x : array) cout << x << endl;
for (auto x : book) showBook(x);
```



