---
title: 泛型算法
tags:
  - c++
  - STL
  - 笔记
abbrlink: 18279
date: 2023-04-13 18:06:11
---



### 初识泛型算法：好怪，再看一眼

泛型算法意思是：什么都可以用的算法。它不依赖于容器类型，是个容器都可以用（除了几个极其特殊的）。大多数算法定义在头文件algorithm和numeric中，如果找不到……那就都包含一遍吧。

算法不直接操作容器，而是操作容器的迭代器，所以编辑器不保证容器类型匹配，这是程序员的责任。虽然算法不依赖于容器的操作，但依赖于元素的操作，如果容器元素是自定义类，那么算法中出现的运算符也要求提供重载函数。

以下是一个find()函数，它接受两个迭代器组成的迭代器范围和一个值，若找到了这个值，则返回指向这个值的迭代器，否则返回迭代器范围的末尾。

```c++
vector<int> vec;
auto iter = find(vec.cbegin(), vec.cend(), 30);
if (iter == vec.cend())
    cout << "find it";
//若没有找到，则返回vec.cend();若传递的迭代器末尾为vec.cend() - 2，则返回vec.cend() - 2。
```

在书后习题中还有一个函数count()，接受两个迭代器组成的范围和一个值，返回迭代器范围中该值的数量。

```c++
vector<int> vec;
int number = count(vec.begin(), vec.end(), 4);
```

**算法不会执行迭代器的操作，它建立在迭代器之上**

<!--more-->

#### 只读算法

一些算法只会读取容器中的内容，比如find和count，还有一个是accumulate，它接受一对迭代器和一个初值，将容器内容遍历求和。要求容器元素支持+运算符。其中第三个参数决定了+运算符的类型以及返回值的类型。

```c++
vector<int> vec;
int result = accumulate(vec.cbegin(), vec.cend(), 3);
//结果为vec中值的总和+3。
```

accumulate假定了容器元素能够转化为第三个参数类型，比如当第三个参数为int时，容器元素可以为int, long, double等任何可以转换为int的类型。另一个例子是由于string定义了+运算符，可以使用accumulate进行字符串拼接。



##### 操作两个序列的算法

另一个只读算法为equal，它确定两个范围是否保存有相同的内容。此算法接受三个迭代器参数，且**假定第二个序列至少与第一个一样长**，即第二个序列大于等于第一个序列。

*所有接受单迭代器来表示第二个迭代器序列的算法都假定第二个至少与第一个一样长。*



#### 写容器的算法

写入算法同样对迭代器操作，它**不会改变容器大小**。它只会向给定范围内写入元素，最多写入与给定序列一样多的元素。

fill算法要求提供三个参量，第一个和第二个是迭代器，第三个是写入（若本来有元素，则为替换）的值。它将迭代器范围内所有元素替代为该值，注意容器元素必须存在，不能仅仅预留内存空间。

```c++
vector<int> vec;
vec.resize(5);
fill(vec.begin(), vec.end(), 1);   //将vec中所有元素重置为1
```

fill算法还有一个变体：fill_n。它接受一个迭代器参数，一个范围值，一个写入值。它将迭代器参数后范围值的内容替换为写入值。它并不检查迭代过程中是否越界，保证不越界还是他妈的程序员的责任。

```c++
vector<int> vec;
vec.resize(5);
fill_n(vec.begin(), 5, 1);    //将vec中所有元素重置为1
fill_n(vec.begin(), 6, 1);    //越界，将在运行阶段报错
```



##### back_inserter插入迭代器

保证容器有足够的空间保存元素的添加元素的方法是使用插入迭代器。使用普通迭代器赋值时，迭代器指向的值被赋值；使用插入迭代器赋值时，一个新的元素被置入容器中。使用定义于头文件iterator的函数back_iterater来获取插入迭代器。back_iterater函数接受一个容器的引用，返回与该容器绑定的插入迭代器。

```c++
vector<int> vec{ 1, 2, 3 };
auto iter = back_inserter(vec);
fill_n(back_inserter(vec), 5, 10);
//或直接fill_n(iter, 5, 10);
```



##### copy算法

copy算法接受一对迭代器范围（表示输入范围）和一个迭代器（目的序列起始位置），算法将输入序列复制到目的序列中，应保证目的序列至少与输入序列一样长。

```C++
vector<int> vec{ 1, 2, 3 };
list<int> lis;
lis.resize(5);  //别忘了必须有元素
copy(vec.cbegin(), vec.cend(), lis.begin());
```

可以使用copy算法将内置数组拷贝至容器（反之亦然）。

```c++
int a[3]{ 1, 2, 3 };
vector<int> vec{ 1, 2, 3 };

copy(a, a + 3, vec.begin());       //将数组元素拷贝至容器
copy(vec.cbegin(), vec.cend(), a); //将容器元素拷贝至数组
```



##### 函数的copy变体

例如replace函数，其搜索给定值，将其替换为参数：

```c++
vector<int> vec{1, 2, 3};
replace(vec.begin(), vec.end(), 3, 0);   //(迭代器范围，搜索值，替换值)
```

其有一个copy变体，额外接受一个迭代器参数，将所得结果拷贝至该迭代器。

```c++
replace(vec.begin(), vec.end(), back_inserter(ivec), 3, 0)
```



#### 排序算法

排序算法将容器元素按某种方式排序。



##### sort算法

一个典型例子为 sort算法，该函数要求提供一组迭代器范围，以 <运算符排序其中的元素，对于自定义类型，需要提供operator<()。

```c++
vector<int> vec1{ 3, 2, 4, 5, 2, 4, 45 };
sort(vec1.begin(), vec1.end());
```



##### 一个例子：消除重复单词

假设给定一个句子：**the quick red fox jumps over the slow red turtle**

分配到容器中：**"the","quick", "red", "fox", "jumps", "over", "the", "slow", "red", "turtle"**

首先使用sort将这些单词排序：

```c++
vector<string> vec{ "the", "quick", "red", "fox", "jumps", "over", "the", "slow", "red", "turtle" };
sort(vec.begin(), vec.end());
```

得到：**fox jumps over quick red red slow the the turtle**



##### 使用unique

unique将消除范围中重复的元素，返回指向不重复值超尾的迭代器。超尾之后的元素并未被删除，但已不可知（也没必要知道）。

```c++
auto iter = unique(vec.begin(), vec.end());
```

在获得不重复元素超尾迭代器之后，进行删除操作，必须使用erase，因为只有容器内方法才能操作容器本身。

```c++
vec.erase(iter, vec.end());
```



#### 定制操作

##### 向算法传递函数

sort有一个重载版本，它接受一个谓词，使得sort按照该谓词指定的规则排序。

**谓词**：

谓词是一个可以调用的表达式，返回一个可转换为bool的值。根据表达式接受的值数目，谓词分为一元谓词和二元谓词。和函数一样，谓词接受的参数类型必须可转化成指定的类型。

定义isShorter函数，使得sort按照字符串长度排序：

```c++
bool isShorter(const string& a, const string& b)
{
    return a.size() < b.size();
}
int main()
{
    sort(vec.begin(), vec.end(), isShorter);
}
```

sort还有一个stable_sort变体，使得排序后可维持原有的长度顺序，它同样可以接受第三个谓词参数。



###### *一个书后习题*

*pratition()函数，判断容器元素是否符合谓词描述，将true的元素置于容器前端，返回指向true最后一个元素超尾的迭代器。*要求将vector<string>按照大于4字符的为true排序，打印所有为true的元素。

```c++
bool longerThen5(const string& str)
{
	return str.size() >= 4;
}
int main()
{
	vector<string> str{ "the", "quick", "red", "fox", "jumps", "over", "the", "slow", "red", "turtle" };

	auto iter = partition(str.begin(), str.end(), longerThen5);
	for (auto it = str.begin(); it != iter; it++)
		cout << *it << endl;
}
```



传送门已搭建！：[lambda表达式 | JS_KringKoter | Personal blog (jskringkoter.github.io)](https://jskringkoter.github.io/2023/04/18/C++学习笔记/泛型算法/lambda表达式/)

#### 泛型算法结构

##### 迭代器类型

* 输入迭代器：可以读取序列中的元素。

  其必须支持：相等和不等运算符（==，!=）

  ​                       前置和后置++运算符。

  ​                       解引用*运算符，只能作为右值。

  ​                       成员运算符->和(*it).用于读取对象成员。

* 输出迭代器：输入迭代器的补集，只写不读元素。

* 前向迭代器：可以读写元素，只能单向访问元素。

* 双向迭代器：可以读写元素，可以双向访问元素。

* 随机访问迭代器：可以读写元素，可以随机访问元素，此外还支持：

  用于比较两个迭代器相对位置的<, <=, >, >=

  迭代器和一个整数的加减运算（+，+=，-，-=）。

  用于两个迭代器之间的-运算，得到两个迭代器的相对距离。

  下标运算符。



##### 算法形参模式

大多数算法具有以下参数模式：

```c++
alg(beg, end, other args);
alg(beg, end, dest, other args);
alg(beg, end, beg2, other args);
alg(beg, end, beg2, end2, other args);
```

alg：算法名称；beg：迭代器范围开始；end：迭代器范围结束；dest：指向特定位置的迭代器；

other args：可调用对象

如果dest直接指向一个容器，调用算法时会将元素修改，一般dest是一个插入迭代器，用于将元素写入容器。dest还可以是一个ostream_iterator，用于插入到输出流中，这两者无需考虑空间是否足够。



##### 算法命名规范

* 一些算法提供谓词作为参量的重载形式，使用谓词来代替<或==。

* 一些算法提供_if的变体，将第三个参数（值）变为谓词，通过返回true来判断：

  ```c++
  auto iter = find(vec.begin(), vec.end(), 3);            //传递值
  auto iter = find_if(vec.begin(), vec.end(), isShort()); //传递谓词
  ```

* 一些算法提供_copy版本，要求额外提供一个迭代器储存拷贝，操作的容器本身不会发生变化。

  ```c++
  reverse(beg, end);        //翻转元素顺序
  reverse(beg, end, dest);  //将翻转后的值拷贝到dest中
  ```

* 一些算法提供_copy_if版本，提供额外的迭代器和一个谓词，将符合谓词的元素拷贝至指定的迭代器。

  ~~真就排列组合。~~



#### 特定容器算法

~~诶list和forward_list，对对对，就你俩。~~

由于list和forward_list只分别只提供双向迭代器和前向迭代器，它定义了独有的sort, merge, remove, reverse, unique函数。链表定义的其他通用算法可以使用其通用形式，但代价太高。**能用list版本就用list版本。**

以下是链表成员函数版的算法：

```c++
lst.merge(lst2);        //将lst2的元素并入lst1。lst1和lst2必须是有序的
lst.merge(lst2, comp);  //合并之后lst2置空

lst.remove(val);
lst.remove(pred);       //调用erase删除值为val或令谓词为真的元素

lst.reverse();          //翻转lst

lst.sort();
lst.sort(comp);         //使用<或给定比较操作排序

lst.unique();
lst.unique(pred);
```

