---
title: 智能指针模板类
tags:
  - c++
  - STL
  - 笔记
abbrlink: 49931
date: 2023-04-04 17:42:46
---


### 1.智能指针的作用

智能指针可以自动释放内存，避免了忘记使用delete的情况。同时可以避免引发异常退出导致的内存泄漏。

如：

```c++
std::string * ps = new string(str);
int i = 0;
if (i = 0)
    throw();  //若引发异常，delete将不被执行。
delete ps;  
```



### 2.使用智能指针

智能指针共有四种：auto_ptr, unique_ptr, share_ptr, weak_ptr。其中auto_ptr已被抛弃，weak_ptr不作讨论。

#### 2.1 创建智能指针对象

智能指针作为模板类，应使用模板类语法：

```auto_ptr<Type> name(new Type);```

```c++
auto_ptr<double> ps(new double);
atuo_ptr<string> ps(new string);
```



所有智能指针类都有一个explicit构造函数，避免将普通指针直接转换为智能指针（但可以使用普通指针为参量的构造函数）。

```c++
shared_ptr<double> pd;
double* ps = new double;
pd = ps;                      //非法
pd = shared_ptr<double> (ps); //合法
shared_ptr<double> ptr = ps;  //非法
shared_ptr<double> ptr(ps);   //合法
```



**注意：智能指针必须使用new，否则将对非堆内存使用 delete**

```c++
string str("你说的对");
auto_ptr<string> ps(&str); //非法！
```

<!--more-->

#### 2.2 auto_ptr的缺点

先看以下语句：

```c++
auto_ptr<string> ps(new string("JS_KringKoter"));
auto_ptr<string> pd;
pd = ps;
cout << pd << endl;
cout << ps << endl;
```

会出现什么情况？pd = ps;将字符串“JS_KringKoter”的控制权转移给了pd，此时ps指向的是空指针，将不会输出任何内容。

为解决此问题，引入了unique_ptr和shared_ptr两种指针。

* unique_ptr和auto_ptr都使用了所有权概念，对于同一个对象，只有一个指针可以拥有它。auto_ptr在转让所有权之后置空原有指针，unique_ptr则更加严格，它不会允许这样的赋值。

* shared_ptr使用引用计数，它计数指向目标的指针，仅在计数为零时调用析构函数。



#### 2.3 为何unique_ptr优于auto_ptr

将上一点的语句使用unique_ptr改写。

```c++
unique_ptr<string> ps(new string("JS_KringKoter"));
unique_ptr<string> pd;
ps = pd;   //非法！
```

编辑器将不允许这样的赋值。但可以这样做：

```c++
unique_ptr<string> pd;
pd = unique_ptr<string> (new string("JS_KringKoter"));  //合法
```

如果右值临时存在，在赋值结束后即销毁，则可以这样做。如果右值将存在一段时间，编辑器将会静止这样的行为。



另一个优点是，auto_ptr只能使用new和delete，unique_ptr可以使用new[]和delete[]。



###### std::move()函数：安全地重用unique_ptr

要安全的重用unique_ptr，可以考虑给其赋新值。标准库函数move()可以做到这一点。该函数返回一个unique_ptr<Type>对象。

```c++
unique_ptr<string> ps(new string("JS_KringKoter"));
unique_ptr<string> pd;
pd = move(ps);  //转移所有权，置空ps
ps = unique_ptr<string> (new string("JS"));  //重新赋值
```

**注意：调用move()函数后，ps指针仍被置空，此时需要对其进行赋值才能重新使用。**